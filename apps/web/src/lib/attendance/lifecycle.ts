import type { AttendanceStatus, AttendanceVerification, Prisma } from '@prisma/client';
import { attendanceUTC, type Tx } from './access';
import { asyncEligibility, expiresAfter } from './rules';

export async function event(tx: Tx, input: {
  courseId: string; sessionId?: string; actorId?: string; studentId?: string; action: string;
  beforeStatus?: AttendanceStatus | null; afterStatus?: AttendanceStatus | null;
  reason?: string; source?: string; verification?: AttendanceVerification;
}, now: Date) {
  const policy = await tx.attendancePolicy.findFirst({ where: { institute: { courses: { some: { id: input.courseId } } } } });
  await tx.attendanceEvent.create({ data: { ...input, createdAt: now, expiresAt: expiresAfter(now, policy?.eventDays ?? null) } });
}
export async function finalizeExpired(tx: Tx, courseId: string, now: Date) {
  const expired = await tx.attendanceSession.findMany({ where: { courseId, state: 'OPEN', closesAt: { lte: now } }, select: { id: true }, orderBy: { id: 'asc' } });
  for (const item of expired) await closeSession(tx, courseId, item.id, now);
}
export async function closeSession(tx: Tx, courseId: string, sessionId: string, now: Date, actorId?: string, cancel = false) {
  await attendanceUTC(tx);
  await tx.$queryRaw`SELECT id FROM "AttendanceSession" WHERE id = ${sessionId} AND "courseId" = ${courseId} FOR UPDATE`;
  const session = await tx.attendanceSession.findFirst({ where: { id: sessionId, courseId } });
  if (!session || session.state !== 'OPEN' && !cancel) return;
  if (session.state === 'CANCELLED') return;
  const closedAt = session.closedAt ?? new Date(Math.min(now.getTime(), session.closesAt.getTime()));
  const originalEnd = session.closedAt ?? session.closesAt;
  const expiresAt = session.expiresAt ? new Date(closedAt.getTime() + Math.max(0, session.expiresAt.getTime() - originalEnd.getTime())) : null;
  if (!cancel) {
    const records = await tx.attendanceRecord.findMany({ where: { sessionId, required: true, status: null } });
    const policy = await tx.attendancePolicy.findFirst({ where: { institute: { courses: { some: { id: courseId } } } } });
    await tx.attendanceRecord.updateMany({ where: { sessionId, required: true, status: null }, data: { status: 'ABSENT', source: 'AUTOMATIC', markedAt: closedAt, revision: { increment: 1 } } });
    if (records.length) await tx.attendanceEvent.createMany({ data: records.map(record => ({ courseId, sessionId, studentId: record.studentId, action: 'AUTO_ABSENT', afterStatus: 'ABSENT', source: 'AUTOMATIC', createdAt: closedAt, expiresAt: expiresAfter(closedAt, policy?.eventDays ?? null) })) });
  } else {
    await tx.attendanceRequest.updateMany({ where: { record: { sessionId }, state: 'PENDING' }, data: { state: 'SUPERSEDED', decidedAt: now, revision: { increment: 1 } } });
  }
  await tx.attendanceSession.update({ where: { id: sessionId }, data: { state: cancel ? 'CANCELLED' : 'CLOSED', closedAt, expiresAt, tokenVersion: { increment: 1 } } });
  await event(tx, { courseId, sessionId, actorId, action: cancel ? 'CANCEL_SESSION' : 'CLOSE_SESSION' }, now);
}

/** Called inside the enrollment writer's transaction, before changing membership. */
export async function attendanceEnrollmentChanged(tx: Tx, courseId: string, studentId: string, approved: boolean, now = new Date()) {
  await attendanceUTC(tx);
  await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${courseId} FOR UPDATE`;
  await finalizeExpired(tx, courseId, now);
  const sessions = await tx.attendanceSession.findMany({ where: { courseId, mode: 'ASYNCHRONOUS', state: 'OPEN', closesAt: { gt: now } }, orderBy: { id: 'asc' } });
  for (const session of sessions) {
    await tx.$queryRaw`SELECT id FROM "AttendanceSession" WHERE id = ${session.id} FOR UPDATE`;
    const current = await tx.attendanceSession.findUnique({ where: { id: session.id } });
    if (!current || current.state !== 'OPEN') continue;
    const previous = await tx.attendanceRecord.findUnique({ where: { sessionId_studentId: { sessionId: session.id, studentId } } });
    if (approved) {
      const eligibility = asyncEligibility(session.opensAt, session.closesAt, session.presentUntil, previous?.eligibleAt ?? now);
      if (!previous) await tx.attendanceRecord.create({ data: { sessionId: session.id, studentId, eligibleAt: now, ...eligibility, eligibilityReason: eligibility.required ? '' : 'Joined near closing' } });
      else if (!previous.status && previous.eligibilityReason === 'Left class') await tx.attendanceRecord.update({ where: { id: previous.id }, data: { required: eligibility.required, eligibilityReason: eligibility.required ? '' : 'Joined near closing', revision: { increment: 1 } } });
    } else if (previous && !previous.status) {
      await tx.attendanceRecord.update({ where: { id: previous.id }, data: { required: false, eligibilityReason: 'Left class', revision: { increment: 1 } } });
      await tx.attendanceRequest.updateMany({ where: { recordId: previous.id, state: 'PENDING' }, data: { state: 'SUPERSEDED', revision: { increment: 1 } } });
    }
    await event(tx, { courseId, sessionId: session.id, studentId, action: approved ? 'ENROLLMENT_APPROVED' : 'ENROLLMENT_REMOVED' }, now);
  }
}
export const recordInclude = { student: { select: { name: true, studentNumber: true } }, request: true } satisfies Prisma.AttendanceRecordInclude;
