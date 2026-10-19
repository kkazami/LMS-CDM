import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { canonicalRole, mayAdmitAccount, supportedInstitute, type KnownRole } from './capabilities';
import { lockAccounts } from './account-lock';
import { applicationWriterQualified } from './provisioning';

export class AccessError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export async function requireActor(request: Request, roles: readonly KnownRole[]) {
  const session = await getSessionFromRequest(request);
  if (!session) throw new AccessError(401, 'Authentication required.');
  if (!roles.includes(canonicalRole(session.user.role) as KnownRole)) {
    throw new AccessError(403, 'Forbidden.');
  }
  assertMutationOrigin(request);
  return { id: session.user.id, sessionId: session.id, tokenHash: session.tokenHash };
}

export function assertMutationOrigin(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  const destination = new URL(Reflect.get(Request.prototype, 'url', request));
  // Next.js can build the URL from its bind address; Host retains the browser's
  // destination. Never use forwarded-host headers to authorize a mutation.
  const host = request.headers.get('host');
  const expectedOrigin = host ? `${destination.protocol}//${host.toLowerCase()}` : destination.origin;
  if ((origin !== null && origin !== expectedOrigin) || (site && !['same-origin','none'].includes(site))) throw new AccessError(403, 'Forbidden origin.');
}

export type Actor = Awaited<ReturnType<typeof requireActor>>;

/** Never switch actor on revalidation, even if Cookie/Bearer disagree. */
export async function revalidateActor(tx: Prisma.TransactionClient, actor: Actor, roles: readonly KnownRole[]) {
  await lockAccounts(tx, [actor.id]);
  const session = await tx.session.findUnique({ where: { id: actor.sessionId }, include: { user: true } });
  if (!session || session.userId !== actor.id || session.tokenHash !== actor.tokenHash || session.expiresAt <= new Date() || !mayAdmitAccount(session.user)) {
    throw new AccessError(401, 'Authentication required.');
  }
  if (!roles.includes(canonicalRole(session.user.role) as KnownRole)) throw new AccessError(403, 'Forbidden.');
  if (!await applicationWriterQualified(tx)) throw new AccessError(503, 'Writer boundary unavailable.');
  return session.user;
}

export async function resolveInstitute(code: string) {
  const selected = supportedInstitute(code);
  if (!selected) throw new AccessError(400, 'Unsupported institute.');
  const institute = await db.institute.findUnique({ where: { code: selected }, select: { id: true, code: true } });
  if (!institute) throw new AccessError(404, 'Institute not found.');
  return institute;
}

export async function requireCourseRelationship(user: { id: string; role: string; instituteId: string }, courseId: string, teaching = false) {
  const role = canonicalRole(user.role);
  if (role !== 'INSTRUCTOR' && (!teaching && role !== 'STUDENT') || teaching && role !== 'INSTRUCTOR') throw new AccessError(403, 'Forbidden.');
  const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true, instituteId: true, instructorId: true } });
  if (!course || course.instituteId !== user.instituteId) throw new AccessError(404, 'Course not found.');
  if (role === 'INSTRUCTOR') {
    if (course.instructorId !== user.id) throw new AccessError(403, 'Forbidden course.');
  } else {
    const enrollment = await db.enrollment.findUnique({ where: { courseId_studentId: { courseId, studentId: user.id } }, select: { status: true } });
    if (enrollment?.status !== 'APPROVED') throw new AccessError(403, 'Forbidden course.');
  }
  return course;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof SyntaxError) error = new AccessError(400, 'Invalid request.');
  if (error instanceof AccessError) {
    const code = error.message === 'HANDOFF_INCOMPLETE' ? 'HANDOFF_INCOMPLETE' :
      ({ 400: 'INVALID_INPUT', 401: 'AUTHENTICATION_REQUIRED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: error.message === 'STATUS_CONFLICT' ? 'STATUS_CONFLICT' : 'ACCOUNT_CONFLICT' } as Record<number, string>)[error.status] ?? 'OPERATION_UNAVAILABLE';
    return Response.json({ error: { code, message: error.message } }, { status: error.status });
  }
  // Do not emit ORM errors, query parameters, credentials, or arbitrary audit metadata.
  return Response.json({ error: { code: 'OPERATION_UNAVAILABLE', message: 'Operation unavailable.' } }, { status: 503 });
}

export function accountErrorResponse(error: unknown): Response {
  if (error instanceof SyntaxError) error = new AccessError(400, 'Invalid request.');
  return Response.json({ message: error instanceof AccessError ? error.message : 'Operation unavailable.' }, { status: error instanceof AccessError ? error.status : 503 });
}
