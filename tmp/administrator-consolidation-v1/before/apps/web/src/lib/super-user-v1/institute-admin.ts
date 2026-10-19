import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { AccessError, assertMutationOrigin, revalidateActor, type Actor } from './actor';
import { lockAccounts } from './account-lock';
import { audit } from './audit';
import { getSessionFromRequest } from '@/lib/api-auth';
import { canonicalRole, supportedInstitute } from './capabilities';
import { errorResponse } from './actor';
import { requireApprovedMetadata } from './metadata-policy';

const identitySelect = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } as const;
type Institute = { id: string; code: string };
type Identity = { id: string; name: string; email: string; isActive: boolean; createdAt: Date };
export function iaIdentity(user: Identity, instituteCode: string) {
  return { id: user.id, name: user.name, email: user.email, role: 'INSTITUTE_ADMIN' as const,
    isActive: user.isActive, instituteCode, createdAt: user.createdAt.toISOString() };
}

export async function listInstituteAdmins(actor: Actor, institute: Institute) {
  return db.$transaction(async tx => {
    await revalidateActor(tx, actor, ['SUPER_USER']);
    const users = await tx.user.findMany({ where: { instituteId: institute.id, role: 'INSTITUTE_ADMIN' }, select: identitySelect, orderBy: { id: 'asc' } });
    await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: actor.id, action: 'INSTITUTE_ADMIN_LIST', instituteId: institute.id });
    return { institute, instituteAdmins: users.map(user => iaIdentity(user, institute.code)) };
  });
}

export async function detailInstituteAdmin(actor: Actor, institute: Institute, userId: string) {
  return db.$transaction(async tx => {
    await revalidateActor(tx, actor, ['SUPER_USER']);
    const user = await tx.user.findFirst({ where: { id: userId, instituteId: institute.id, role: 'INSTITUTE_ADMIN' }, select: identitySelect });
    if (!user) throw new AccessError(404, 'Account not found.');
    await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: user.id, action: 'INSTITUTE_ADMIN_DETAIL', instituteId: institute.id });
    return { institute, instituteAdmin: iaIdentity(user, institute.code) };
  });
}

const createInput = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().max(254) }).strict();
export async function createInstituteAdmin(actor: Actor, institute: Institute, input: unknown) {
  const parsed = createInput.safeParse(input);
  if (!parsed.success) throw new AccessError(400, 'Only name and email are accepted.');
  const password = await hash(randomBytes(32).toString('base64url'), 12);
  try {
    return await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM public."Institute" WHERE id = ${institute.id} FOR UPDATE`;
      await revalidateActor(tx, actor, ['SUPER_USER']);
      const user = await tx.user.create({ data: {
        name: parsed.data.name, email: parsed.data.email.toLowerCase(), password,
        role: 'INSTITUTE_ADMIN', instituteId: institute.id, isActive: false,
        permissions: '[]', credentialProvisioningState: 'PENDING_HANDOFF',
      }, select: identitySelect });
      await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: user.id, action: 'INSTITUTE_ADMIN_CREATE', instituteId: institute.id, afterActive: false });
      return { institute, instituteAdmin: iaIdentity(user, institute.code), provisioningStatus: 'PENDING_HANDOFF' as const };
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new AccessError(409, 'Account already exists.');
    throw error;
  }
}

export async function changeInstituteAdminStatus(actor: Actor, institute: Institute, targetId: string, active: boolean) {
  return db.$transaction(async tx => {
    // Serializes count/warning with every dedicated IA create/status operation.
    await tx.$queryRaw`SELECT id FROM public."Institute" WHERE id = ${institute.id} FOR UPDATE`;
    await lockAccounts(tx, [actor.id, targetId]);
    await revalidateActor(tx, actor, ['SUPER_USER']);
    const target = await tx.user.findUnique({ where: { id: targetId } });
    if (!target) throw new AccessError(404, 'Account not found.');
    if (target.id === actor.id || target.role !== 'INSTITUTE_ADMIN' || target.instituteId !== institute.id) throw new AccessError(403, 'Forbidden target.');
    if (target.isActive === active) throw new AccessError(409, 'STATUS_CONFLICT');
    if (active && target.credentialProvisioningState !== 'COMPLETE') throw new AccessError(409, 'HANDOFF_INCOMPLETE');
    await tx.user.update({ where: { id: targetId }, data: { isActive: active } });
    if (!active) {
      await tx.session.deleteMany({ where: { userId: targetId } });
      await tx.passwordResetOtp.updateMany({ where: { userId: targetId, isUsed: false }, data: { isUsed: true } });
    }
    await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId, action: active ? 'INSTITUTE_ADMIN_REACTIVATE' : 'INSTITUTE_ADMIN_SUSPEND', instituteId: institute.id, beforeActive: target.isActive, afterActive: active });
    const remaining = await tx.user.count({ where: { role: 'INSTITUTE_ADMIN', instituteId: institute.id, isActive: true } });
    return { targetId, instituteCode: institute.code, isActive: active, warnings: remaining ? [] : ['NO_ACTIVE_INSTITUTE_ADMIN'] };
  });
}

const lowerRoles = ['STUDENT', 'INSTRUCTOR', 'PROFESSOR', 'TEACHER', 'student', 'instructor', 'professor', 'teacher'];
const lowerSelect = { ...identitySelect, instituteId: true, credentialProvisioningState: true } as const;
function lowerIdentity(user: Identity & { role: string }, instituteCode: string) {
  return { id: user.id, name: user.name, email: user.email, role: canonicalRole(user.role),
    isActive: user.isActive, instituteCode, createdAt: user.createdAt.toISOString() };
}
function positiveInteger(value: string | null, fallback: number, max: number) {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value) || Number(value) > max) throw new AccessError(400, 'Invalid pagination.');
  return Number(value);
}

/** Only these six existing operations have an IA branch. Every other sibling stays denied. */
export async function instituteAdminOperation(request: Request, operation: 'USER_LIST' | 'USER_DETAIL' | 'USER_UPDATE' | 'USER_STATUS' | 'COURSE_LIST' | 'COURSE_DETAIL', targetId?: string): Promise<Response | null> {
  const session = await getSessionFromRequest(request);
  if (!session || canonicalRole(session.user.role) !== 'INSTITUTE_ADMIN') return null;
  const actor: Actor = { id: session.userId, sessionId: session.id, tokenHash: session.tokenHash };
  try {
    assertMutationOrigin(request);
    const query = new URL(request.url).searchParams;
    const allowedQuery = operation === 'USER_LIST' ? ['page', 'pageSize', 'search', 'role', 'status', 'instituteCode', 'institute'] : operation === 'COURSE_LIST' ? ['page', 'limit', 'institute', 'instituteCode'] : ['institute', 'instituteCode'];
    for (const key of query.keys()) if (!allowedQuery.includes(key) || query.getAll(key).length !== 1) throw new AccessError(400, 'Invalid query input.');
    const input = ['USER_UPDATE', 'USER_STATUS'].includes(operation) ? await request.json() : null;
    const result = await db.$transaction(async tx => {
      await lockAccounts(tx, [actor.id, ...(targetId ? [targetId] : [])]);
      const user = await revalidateActor(tx, actor, ['INSTITUTE_ADMIN']);
      const institute = await tx.institute.findUnique({ where: { id: user.instituteId }, select: { id: true, code: true } });
      if (!institute || !supportedInstitute(institute.code)) throw new AccessError(403, 'Forbidden.');
      for (const key of ['institute', 'instituteCode']) {
        const selected = query.get(key);
        if (selected && selected.toLowerCase() !== institute.code) throw new AccessError(403, 'Forbidden institute.');
      }
      if (operation === 'COURSE_LIST' || operation === 'COURSE_DETAIL') {
        const page = positiveInteger(query.get('page'), 1, 1000000);
        const limit = positiveInteger(query.get('limit'), 15, 50);
        const where = { instituteId: institute.id, isArchived: false, ...(targetId ? { id: targetId } : {}) };
        const courses = await tx.course.findMany({ where, select: { id: true, title: true, isArchived: true,
          instructor: { select: { id: true, name: true, role: true, instituteId: true } } },
          orderBy: { id: 'asc' }, ...(operation === 'COURSE_LIST' ? { skip: (page - 1) * limit, take: limit } : {}) });
        if (operation === 'COURSE_DETAIL' && !courses.length) throw new AccessError(404, 'Course not found.');
        let approved = false;
        try { await requireApprovedMetadata(institute.id, { courses }); approved = true; } catch { /* Nullable display fields withhold unapproved values. */ }
        const projected = courses.map(course => ({ id: course.id, title: approved ? course.title : null, instituteCode: institute.code, isArchived: course.isArchived,
          instructor: course.instructor && canonicalRole(course.instructor.role) === 'INSTRUCTOR' && course.instructor.instituteId === institute.id ? { id: course.instructor.id, name: approved ? course.instructor.name : null } : null }));
        await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: actor.id, instituteId: institute.id, action: operation, ...(targetId ? { courseId: targetId } : {}) });
        if (operation === 'COURSE_DETAIL') return { course: projected[0] };
        const totalCount = await tx.course.count({ where });
        return { courses: projected, pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit), hasMore: page * limit < totalCount } };
      }
      if (operation === 'USER_LIST') {
        const page = positiveInteger(query.get('page'), 1, 1000000);
        const pageSize = positiveInteger(query.get('pageSize'), 20, 100);
        const role = query.get('role');
        if (role && !['STUDENT', 'INSTRUCTOR'].includes(canonicalRole(role))) throw new AccessError(400, 'Invalid role filter.');
        const status = query.get('status');
        if (status && !['active', 'suspended'].includes(status)) throw new AccessError(400, 'Invalid status filter.');
        const search = query.get('search') ?? '';
        if (search.length > 100) throw new AccessError(400, 'Invalid search.');
        const roles = role ? lowerRoles.filter(item => canonicalRole(item) === canonicalRole(role)) : lowerRoles;
        const where = { instituteId: institute.id, role: { in: roles },
          ...(status ? { isActive: status === 'active' } : {}),
          ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] } : {}) };
        const total = await tx.user.count({ where });
        const users = await tx.user.findMany({ where, select: lowerSelect, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize });
        await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: actor.id, instituteId: institute.id, action: operation });
        return { data: users.map(item => lowerIdentity(item, institute.code)), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
      }
      const target = await tx.user.findUnique({ where: { id: targetId }, select: lowerSelect });
      if (!target || target.instituteId !== institute.id) throw new AccessError(404, 'Account not found.');
      if (target.id === actor.id || !['INSTRUCTOR', 'STUDENT'].includes(canonicalRole(target.role))) throw new AccessError(403, 'Forbidden target.');
      if (operation === 'USER_UPDATE') {
        const parsed = z.object({ name: z.string().trim().min(2).max(100).optional(), email: z.string().email().max(254).optional() }).strict().refine(value => value.name !== undefined || value.email !== undefined).safeParse(input);
        if (!parsed.success) throw new AccessError(400, 'Only name and email are accepted.');
        const updated = await tx.user.update({ where: { id: target.id }, data: { ...parsed.data, ...(parsed.data.email ? { email: parsed.data.email.toLowerCase() } : {}) }, select: lowerSelect });
        if (parsed.data.email && updated.email !== target.email) {
          // Includes delivery-pending grants: an old mailbox must not retain
          // recovery authority after an identity change.
          await tx.passwordResetOtp.deleteMany({ where: { userId: target.id } });
          await tx.session.deleteMany({ where: { userId: target.id } });
        }
        await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: target.id, instituteId: institute.id, action: operation });
        return { user: lowerIdentity(updated, institute.code) };
      }
      if (operation === 'USER_STATUS') {
        const parsed = z.object({ isActive: z.boolean() }).strict().safeParse(input);
        if (!parsed.success) throw new AccessError(400, 'Invalid status request.');
        if (target.isActive === parsed.data.isActive) throw new AccessError(409, 'STATUS_CONFLICT');
        if (parsed.data.isActive && target.credentialProvisioningState != null && target.credentialProvisioningState !== 'COMPLETE') throw new AccessError(409, 'HANDOFF_INCOMPLETE');
        await tx.user.update({ where: { id: target.id }, data: { isActive: parsed.data.isActive } });
        if (!parsed.data.isActive) {
          await tx.session.deleteMany({ where: { userId: target.id } });
          await tx.passwordResetOtp.deleteMany({ where: { userId: target.id } });
        }
        await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: target.id, instituteId: institute.id, action: operation, beforeActive: target.isActive, afterActive: parsed.data.isActive });
        return { targetId: target.id, instituteCode: institute.code, isActive: parsed.data.isActive, warnings: [] };
      }
      await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: target.id, instituteId: institute.id, action: operation });
      return { user: lowerIdentity(target, institute.code) };
    });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return errorResponse(new AccessError(409, 'Account already exists.'));
    return errorResponse(error);
  }
}
