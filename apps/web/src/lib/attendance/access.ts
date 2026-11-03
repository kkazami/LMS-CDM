import type { Prisma } from '@prisma/client';
import type { AttendancePolicy, AttendanceSettings } from '@lms/types';
import { canonicalRole, mayAdmitAccount } from '@/lib/super-user-v1/capabilities';
import { AccessError } from '@/lib/super-user-v1/actor';
import { sessionExpired } from '@/lib/session-policy';

export type Tx = Prisma.TransactionClient;
export type AttendanceActor = { id: string; sessionId: string };
// This adapter normalizes timestamptz text as UTC. Scope UTC to attendance transactions,
// including enrollment/archival hooks, rather than relying on a server's local timezone.
export async function attendanceUTC(tx: Tx) { await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`; }
export const defaultSettings: AttendanceSettings = { liveLimit: 1, asyncLimit: 1, absenceThreshold: 3, tardyThreshold: 3, latitude: null, longitude: null, locationLabel: '' };
// Attendance works without institute setup; location remains an explicit opt-in.
export const defaultPolicy: AttendancePolicy = { rollout: 'ENABLED', phase: 3, pilotCourseIds: [], locationEnabled: false, timezone: 'Asia/Manila', privacyReview: '', recordDays: null, eventDays: null, requestDays: 30, verificationDays: 30, arrangementDays: 90 };

export async function access(tx: Tx, actor: AttendanceActor, courseId: string, lockGrant = false) {
  const session = await tx.session.findUnique({ where: { id: actor.sessionId }, include: { user: true } });
  if (!session || session.userId !== actor.id || sessionExpired(session) || !mayAdmitAccount(session.user)) throw new AccessError(401, 'Please sign in again.');
  const user = session.user;
  const canonical = canonicalRole(user.role);
  if (!['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(canonical)) throw new AccessError(403, 'Attendance access is unavailable for this role.');
  const course = await tx.course.findUnique({ where: { id: courseId }, include: { institute: { include: { attendancePolicy: true } }, attendanceSettings: true } });
  if (!course || course.instituteId !== user.instituteId) throw new AccessError(404, 'Class not found.');
  const stored = course.institute.attendancePolicy;
  const policy: AttendancePolicy = {
    rollout: stored?.rollout as AttendancePolicy['rollout'] ?? defaultPolicy.rollout, phase: stored?.phase ?? defaultPolicy.phase,
    pilotCourseIds: stored?.pilotCourseIds ?? [], locationEnabled: stored?.locationEnabled ?? false,
    timezone: course.institute.timezone, privacyReview: stored?.privacyReview ?? '',
    recordDays: stored?.recordDays ?? null, eventDays: stored?.eventDays ?? null,
    requestDays: stored?.requestDays ?? defaultPolicy.requestDays, verificationDays: stored?.verificationDays ?? defaultPolicy.verificationDays,
    arrangementDays: stored?.arrangementDays ?? defaultPolicy.arrangementDays,
  };
  const saved = course.attendanceSettings;
  const settings: AttendanceSettings = saved ? { liveLimit: saved.liveLimit, asyncLimit: saved.asyncLimit, absenceThreshold: saved.absenceThreshold, tardyThreshold: saved.tardyThreshold, latitude: saved.latitude, longitude: saved.longitude, locationLabel: saved.locationLabel } : { ...defaultSettings };
  const enabled = policy.rollout === 'ENABLED' || policy.rollout === 'PILOT' && policy.pilotCourseIds.includes(courseId);
  const manager = canonical === 'ADMIN' || canonical === 'INSTRUCTOR' && course.instructorId === user.id;
  let role: 'MANAGER' | 'STUDENT' | 'HELPER' = manager ? 'MANAGER' : 'STUDENT';
  if (!manager && canonical === 'INSTRUCTOR') {
    const grant = policy.phase >= 3 ? await tx.attendanceGrant.findUnique({ where: { courseId_userId: { courseId, userId: user.id } } }) : null;
    if (!grant) throw new AccessError(403, 'You do not have attendance access for this class.');
    if (lockGrant) {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "AttendanceGrant" WHERE id = ${grant.id} FOR SHARE`;
      if (!locked.length) throw new AccessError(403, 'Your attendance access was revoked.');
    }
    role = 'HELPER';
  } else if (!manager) {
    const enrollment = await tx.enrollment.findUnique({ where: { courseId_studentId: { courseId, studentId: user.id } } });
    if (enrollment?.status !== 'APPROVED') throw new AccessError(403, 'You are not enrolled in this class.');
  }
  return { user, course, policy, enabled, role, settings, isAdmin: canonical === 'ADMIN' };
}
export type Context = Awaited<ReturnType<typeof access>>;
export function requireManager(context: Context) { if (context.role !== 'MANAGER') throw new AccessError(403, 'Only the primary instructor or institute administrator can do this.'); }
export function requireStaff(context: Context) { if (context.role === 'STUDENT') throw new AccessError(403, 'Instructor access required.'); }
export function requireWritable(context: Context, phase = 1) {
  if (context.course.isArchived) throw new AccessError(409, 'Archived attendance is read-only.');
  if (!context.enabled || context.policy.phase < phase) throw new AccessError(409, 'This attendance capability is not enabled for this class.');
}
