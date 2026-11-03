import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { getSession } from '@/lib/auth-session';
import { canonicalRole, mayAdmitAccount } from '@/lib/super-user-v1/capabilities';
import { mutationOriginAllowed } from '@/lib/request-security';
import { sessionExpired } from '@/lib/session-policy';
import { OhmwardError } from '../domain/schema';

export type Actor = { id: string; instituteId: string; role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN'; sessionId: string; tokenHash: string };
export function requireFeature() { if (process.env.OHMWARD_ENABLED !== 'true') throw new OhmwardError(404, 'Ohmward is not available.'); }
export async function actorFor(request?: Request): Promise<Actor> {
  requireFeature();
  const session = request ? await getSessionFromRequest(request) : await getSession();
  if (!session) throw new OhmwardError(401, 'Sign in to continue. Your unsaved work is still on this page.');
  const role = canonicalRole(session.user.role);
  if (session.user.institute.code.toLowerCase() !== 'ics' || !['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(role)) throw new OhmwardError(403, 'Ohmward is available to ICS students and authorized staff only.');
  if (request && !mutationOriginAllowed(request)) throw new OhmwardError(403, 'This request origin is not allowed.');
  return { id: session.user.id, instituteId: session.user.instituteId, role: role as Actor['role'], sessionId: session.id, tokenHash: session.tokenHash };
}
export function studentOnly(actor: Actor) { if (actor.role !== 'STUDENT') throw new OhmwardError(403, 'Only students can save or submit learning attempts.'); }
export function staffOnly(actor: Actor) { if (!['INSTRUCTOR', 'ADMIN'].includes(actor.role)) throw new OhmwardError(403, 'Staff access is required.'); }
export async function freshStudent(tx: Prisma.TransactionClient, actor: Actor) {
  studentOnly(actor);
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${actor.id} FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${actor.sessionId} FOR SHARE`;
  const session = await tx.session.findUnique({ where: { id: actor.sessionId }, include: { user: { include: { institute: true } } } });
  if (!session || session.userId !== actor.id || session.tokenHash !== actor.tokenHash || sessionExpired(session) || !mayAdmitAccount(session.user)) throw new OhmwardError(401, 'Your session changed. Sign in again before saving.');
  if (canonicalRole(session.user.role) !== 'STUDENT' || session.user.instituteId !== actor.instituteId || session.user.institute.code.toLowerCase() !== 'ics') throw new OhmwardError(403, 'Your learning access changed.');
  const enrollments = await tx.$queryRaw<Array<{ id: string }>>`SELECT e.id FROM "Enrollment" e JOIN "Course" c ON c.id=e."courseId" WHERE e."studentId"=${actor.id} AND e.status='APPROVED' AND c."instituteId"=${actor.instituteId} AND NOT c."isArchived" ORDER BY e.id FOR SHARE OF e,c`;
  if (!enrollments.length) throw new OhmwardError(403, 'An approved enrollment in an active ICS class is required.');
}
export function rosterWhere(actor: Actor, courseId?: string): Prisma.UserWhereInput {
  staffOnly(actor);
  return { instituteId: actor.instituteId, role: 'STUDENT', isActive: true, activationStatus: 'ACTIVE', enrollments: { some: { status: 'APPROVED', course: { instituteId: actor.instituteId, isArchived: false, ...(actor.role === 'INSTRUCTOR' ? { instructorId: actor.id } : {}), ...(courseId ? { id: courseId } : {}) } } } };
}
export async function assertCourse(actor: Actor, courseId?: string) {
  staffOnly(actor);
  if (courseId && !await db.course.findFirst({ where: { id: courseId, instituteId: actor.instituteId, isArchived: false, ...(actor.role === 'INSTRUCTOR' ? { instructorId: actor.id } : {}) }, select: { id: true } })) throw new OhmwardError(404, 'Class not found.');
}
