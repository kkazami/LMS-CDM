import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { getSessionFromRequest } from '@/lib/api-auth';
import { canonicalRole, mayAdmitAccount, supportedInstitute } from '@/lib/super-user-v1/capabilities';
import { AccessError, assertMutationOrigin } from '@/lib/super-user-v1/actor';
import { lockAccounts } from '@/lib/super-user-v1/account-lock';
import { createHash, randomUUID } from 'node:crypto';
import { isAcademicSchemaUnavailable, academicSetupMessage } from './schema-readiness';
export type Tx = Prisma.TransactionClient;
export type AcademicActor = {
    id: string;
    instituteId: string;
    instituteCode: string;
    sessionId: string;
    tokenHash: string;
    role: 'INSTRUCTOR' | 'STUDENT';
};
export async function academicActor(request?: Request): Promise<AcademicActor> {
    const session = await getSessionFromRequest(request);
    if (!session)
        throw new AccessError(401, 'Authentication required.');
    if (!supportedInstitute(session.user.institute.code))
        throw new AccessError(403, 'Unsupported institute.');
    const role = canonicalRole(session.user.role);
    if (role !== 'INSTRUCTOR' && role !== 'STUDENT')
        throw new AccessError(403, 'This operation is not available to your role.');
    if (request)
        assertMutationOrigin(request);
    return { id: session.userId, instituteId: session.user.instituteId, instituteCode: session.user.institute.code.toLowerCase(), sessionId: session.id, tokenHash: session.tokenHash, role };
}
export async function revalidateAcademicActor(tx: Tx, actor: AcademicActor) {
    await lockAccounts(tx, [actor.id]);
    const session = await tx.session.findUnique({ where: { id: actor.sessionId }, include: { user: true } });
    if (!session || session.userId !== actor.id || session.tokenHash !== actor.tokenHash || session.expiresAt <= new Date() || !mayAdmitAccount(session.user))
        throw new AccessError(401, 'Authentication required.');
    if (session.user.instituteId !== actor.instituteId || canonicalRole(session.user.role) !== actor.role)
        throw new AccessError(403, 'Your access has changed. Refresh this page.');
    return session.user;
}
export function academicTransaction<T>(actor: AcademicActor, work: (tx: Tx) => Promise<T>) {
    return db.$transaction(async (tx) => { await revalidateAcademicActor(tx, actor); return work(tx); }, { timeout: 10000, maxWait: 5000 });
}
export async function programAccess(tx: Tx, actor: AcademicActor, programId: string, requireHead = false, lock = false) {
    if (actor.role !== 'INSTRUCTOR')
        throw new AccessError(403, 'Instructors only.');
    if (lock)
        await tx.$queryRaw `SELECT id FROM public."AcademicProgram" WHERE id=${programId} FOR UPDATE`;
    const program = await tx.academicProgram.findFirst({ where: { id: programId, instituteId: actor.instituteId, isActive: true } });
    if (!program)
        throw new AccessError(404, 'Program not found.');
    const member = await tx.programMembership.findUnique({ where: { programId_userId: { programId, userId: actor.id } }, include: { headAssignment: true } });
    if (!member?.isActive || member.kind !== 'INSTRUCTOR' || member.instituteId !== actor.instituteId)
        throw new AccessError(403, 'You are not assigned to this program.');
    const isHead = member.headAssignment?.isActive === true && member.headAssignment.revokedAt === null;
    if (requireHead && !isHead)
        throw new AccessError(403, 'A current Program Head designation is required.');
    return { program, isHead };
}
export async function teachingCourse(tx: Tx, actor: AcademicActor, courseId: string, lock = false) {
    if (actor.role !== 'INSTRUCTOR')
        throw new AccessError(403, 'Instructors only.');
    if (lock)
        await tx.$queryRaw `SELECT id FROM public."Course" WHERE id=${courseId} FOR UPDATE`;
    const course = await tx.course.findFirst({ where: { id: courseId, instituteId: actor.instituteId, isArchived: false } });
    if (!course)
        throw new AccessError(404, 'Class not found.');
    if (course.instructorId !== actor.id)
        throw new AccessError(403, 'You do not teach this class.');
    return course;
}
export async function academicAudit(tx: Tx, actor: AcademicActor, action: string, scope: {
    programId?: string;
    courseId?: string;
    eventId?: string;
    version?: number;
} = {}) {
    await tx.auditLog.create({ data: { adminId: actor.id, targetId: actor.id, action, metadata: JSON.stringify({ instituteId: actor.instituteId, sessionReferenceSHA256: createHash('sha256').update(actor.sessionId).digest('hex'), correlationId: randomUUID(), result: 'SUCCESS', ...scope }) } });
}
export function academicError(error: unknown): Response {
    if (isAcademicSchemaUnavailable(error))
        return Response.json({ message: academicSetupMessage }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
    if (error instanceof SyntaxError)
        error = new AccessError(400, 'Invalid JSON.');
    if (error instanceof AccessError)
        return Response.json({ message: error.message }, { status: error.status, headers: { 'Cache-Control': 'private, no-store' } });
    console.warn('ACADEMIC_OPERATION_UNAVAILABLE', error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : 'UNCLASSIFIED');
    return Response.json({ message: 'The operation could not be confirmed. Refresh before retrying.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
}
