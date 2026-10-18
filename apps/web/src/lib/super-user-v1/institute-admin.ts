import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { AccessError, revalidateActor, type Actor } from './actor';
import { lockAccounts } from './account-lock';
import { audit } from './audit';

const identitySelect = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } as const;
type Institute = { id: string; code: string };
type Identity = { id: string; name: string; email: string; isActive: boolean; createdAt: Date };
export function iaIdentity(user: Identity, instituteCode: string) {
  return { id: user.id, name: user.name, email: user.email, role: 'ADMIN' as const,
    isActive: user.isActive, instituteCode, createdAt: user.createdAt.toISOString() };
}

export async function listInstituteAdmins(actor: Actor, institute: Institute) {
  return db.$transaction(async tx => {
    await revalidateActor(tx, actor, ['SUPER_USER']);
    const users = await tx.user.findMany({ where: { instituteId: institute.id, role: 'ADMIN' }, select: identitySelect, orderBy: { id: 'asc' } });
    await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: actor.id, action: 'ADMIN_LIST', instituteId: institute.id });
    return { institute, instituteAdmins: users.map(user => iaIdentity(user, institute.code)) };
  });
}

export async function detailInstituteAdmin(actor: Actor, institute: Institute, userId: string) {
  return db.$transaction(async tx => {
    await revalidateActor(tx, actor, ['SUPER_USER']);
    const user = await tx.user.findFirst({ where: { id: userId, instituteId: institute.id, role: 'ADMIN' }, select: identitySelect });
    if (!user) throw new AccessError(404, 'Account not found.');
    await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: user.id, action: 'ADMIN_DETAIL', instituteId: institute.id });
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
        role: 'ADMIN', instituteId: institute.id, isActive: false,
        permissions: '[]', credentialProvisioningState: 'PENDING_HANDOFF',
      }, select: identitySelect });
      await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: user.id, action: 'ADMIN_CREATE', instituteId: institute.id, afterActive: false });
      return { institute, instituteAdmin: iaIdentity(user, institute.code), provisioningStatus: 'PENDING_HANDOFF' as const };
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new AccessError(409, 'Account already exists.');
    throw error;
  }
}

export async function changeInstituteAdminStatus(actor: Actor, institute: Institute, targetId: string, active: boolean) {
  return db.$transaction(async tx => {
    // Serializes count/warning with every dedicated Administrator create/status operation.
    await tx.$queryRaw`SELECT id FROM public."Institute" WHERE id = ${institute.id} FOR UPDATE`;
    await lockAccounts(tx, [actor.id, targetId]);
    await revalidateActor(tx, actor, ['SUPER_USER']);
    const target = await tx.user.findUnique({ where: { id: targetId } });
    if (!target) throw new AccessError(404, 'Account not found.');
    if (target.id === actor.id || target.role !== 'ADMIN' || target.instituteId !== institute.id) throw new AccessError(403, 'Forbidden target.');
    if (target.isActive === active) throw new AccessError(409, 'STATUS_CONFLICT');
    if (active && target.credentialProvisioningState != null && target.credentialProvisioningState !== 'COMPLETE') throw new AccessError(409, 'HANDOFF_INCOMPLETE');
    await tx.user.update({ where: { id: targetId }, data: { isActive: active } });
    if (!active) {
      await tx.session.deleteMany({ where: { userId: targetId } });
      await tx.passwordResetOtp.updateMany({ where: { userId: targetId, isUsed: false }, data: { isUsed: true } });
    }
    await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId, action: active ? 'ADMIN_REACTIVATE' : 'ADMIN_SUSPEND', instituteId: institute.id, beforeActive: target.isActive, afterActive: active });
    const remaining = await tx.user.count({ where: { role: 'ADMIN', instituteId: institute.id, isActive: true } });
    return { targetId, instituteCode: institute.code, isActive: active, warnings: remaining ? [] : ['NO_ACTIVE_ADMIN'] };
  });
}

