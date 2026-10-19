import { hash } from 'bcryptjs';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireActor, revalidateActor, AccessError, type Actor } from '@/lib/super-user-v1/actor';
import { canonicalRole, mayAdmitAccount } from '@/lib/super-user-v1/capabilities';
import { audit } from '@/lib/super-user-v1/audit';
import { lockAccounts } from '@/lib/super-user-v1/account-lock';

export const facultyAdministrator = (request: Request) => requireActor(request, ['ADMIN']);
async function administrator(tx: Prisma.TransactionClient, actor: Actor) {
    const user = await revalidateActor(tx, actor, ['ADMIN']);
    const institute = await tx.institute.findUnique({ where: { id: user.instituteId } });
    if (institute?.code !== 'ics') throw new AccessError(403, 'Faculty designation is available in ICS only.');
    return user;
}
export async function facultyDirectory(actor: Actor) {
    return db.$transaction(async tx => {
        const user = await administrator(tx, actor);
        const programs = await tx.academicProgram.findMany({ where: { instituteId: user.instituteId, isActive: true }, orderBy: [{ code: 'asc' }, { id: 'asc' }], select: { id: true, code: true, name: true, chartVersion: true, memberships: { where: { isActive: true, kind: 'INSTRUCTOR' }, select: { userId: true, headAssignment: { select: { isActive: true, revokedAt: true } } } } } });
        const instructors = await tx.user.findMany({ where: { instituteId: user.instituteId, isActive: true, role: { in: ['PROFESSOR', 'professor', 'INSTRUCTOR', 'instructor', 'TEACHER', 'teacher'] } }, select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
        await audit(tx, { actorId: actor.id, actorSessionId: actor.sessionId, targetId: actor.id, instituteId: user.instituteId, action: 'ICS_FACULTY_DIRECTORY' });
        return { programs: programs.map(p => ({ id: p.id, name: p.name, code: p.code, version: p.chartVersion, members: p.memberships.filter(m => instructors.some(i => i.id === m.userId)).map(m => ({ id: m.userId, designation: m.headAssignment?.isActive && !m.headAssignment.revokedAt ? 'PROGRAM_HEAD' as const : 'FACULTY' as const })) })), instructors };
    });
}
const designation = z.enum(['FACULTY', 'PROGRAM_HEAD']);
const change = z.object({ instructorId: z.string().min(1).max(200), designation, version: z.number().int().positive() }).strict();
const create = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().max(254), password: z.string().min(12).max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72), designation, version: z.number().int().positive() }).strict();
export async function setFaculty(actor: Actor, programId: string, input: unknown, creating = false) {
    const parsed = (creating ? create : change).safeParse(input);
    if (!parsed.success) throw new AccessError(400, 'Check the instructor, designation and current program version.');
    const data = parsed.data;
    const password = 'password' in data ? await hash(data.password, 12) : null;
    try {
        return await db.$transaction(async tx => {
            await lockAccounts(tx, [actor.id, ...('instructorId' in data ? [data.instructorId] : [])]);
            const user = await administrator(tx, actor);
            const programs = await tx.$queryRaw<{ chartVersion: number }[]>`SELECT "chartVersion" FROM public."AcademicProgram" WHERE id=${programId} AND "instituteId"=${user.instituteId} AND "isActive" FOR UPDATE`;
            if (!programs.length) throw new AccessError(404, 'Program not found.');
            if (programs[0].chartVersion !== data.version) throw new AccessError(409, 'The program changed. Refresh before saving.');
            let instructorId: string;
            if ('name' in data && password) {
                const instructor = await tx.user.create({ data: { name: data.name, email: data.email.toLowerCase(), password, role: 'PROFESSOR', instituteId: user.instituteId, permissions: '[]', isActive: true } });
                instructorId = instructor.id;
            } else if ('instructorId' in data) {
                instructorId = data.instructorId;
                const target = await tx.user.findUnique({ where: { id: instructorId } });
                if (!target || target.instituteId !== user.instituteId || canonicalRole(target.role) !== 'INSTRUCTOR' || !mayAdmitAccount(target)) throw new AccessError(403, 'Choose an active ICS instructor.');
            } else throw new AccessError(400, 'Invalid instructor.');
            const rows = await tx.$queryRaw<{ version: number }[]>`SELECT super_user_security.set_ics_faculty(${actor.sessionId},${actor.tokenHash},${programId},${instructorId},${data.designation},${data.version}::integer) AS version`;
            return { instructorId, designation: data.designation, version: rows[0].version };
        }, { timeout: 10000 });
    } catch (error) {
        const e = error as { code?: string; meta?: { code?: string } };
        if (e.code === 'P2002') throw new AccessError(409, 'An account with that email already exists.');
        if (e.meta?.code === '40001' || e.code === 'P2034') throw new AccessError(409, 'The program changed. Refresh before saving.');
        if (e.meta?.code === 'P0002') throw new AccessError(404, 'Program not found.');
        if (e.meta?.code === '42501') throw new AccessError(403, 'Designation is not authorized.');
        throw error;
    }
}
