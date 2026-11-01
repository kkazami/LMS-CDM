import type { AttendanceCode, AttendanceOverview, AttendanceSession as SessionView, AttendanceSummary } from '@lms/types';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { AccessError } from '@/lib/super-user-v1/actor';
import { access, attendanceUTC, requireStaff, requireWritable, type AttendanceActor, type Tx } from './access';
import { event, finalizeExpired, recordInclude } from './lifecycle';
import { bulkEligible, csvCell } from './rules';
import { liveCode, signAttendanceToken } from './tokens';

export async function transaction<T>(operation: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(async tx => { await attendanceUTC(tx); return operation(tx); }, { maxWait: 15000, timeout: 25000 }); }
    catch (error) {
      if (attempt < 2 && error && typeof error === 'object' && 'code' in error && error.code === 'P2034') continue;
      throw error;
    }
  }
}
export async function getAttendance(actor: AttendanceActor, courseId: string, page = 1): Promise<AttendanceOverview> {
  const now = new Date();
  return transaction(async tx => {
    const ctx = await access(tx, actor, courseId);
    await finalizeExpired(tx, courseId, now);
    const student = ctx.role === 'STUDENT';
    const include = { records: { where: student ? { studentId: actor.id } : {}, include: recordInclude, orderBy: { student: { name: 'asc' as const } } } };
    const active = await tx.attendanceSession.findMany({ where: { courseId, state: 'OPEN', ...(student ? { records: { some: { studentId: actor.id } } } : {}) }, include, orderBy: { opensAt: 'desc' } });
    const previous = await tx.attendanceSession.findMany({ where: { courseId, state: { not: 'OPEN' }, ...(student ? { records: { some: { studentId: actor.id } } } : {}) }, include, orderBy: [{ opensAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 21 });
    const arrangements = ctx.policy.phase >= 2 ? await tx.attendanceArrangement.findMany({ where: { courseId, expiresAt: { gt: now }, ...(student ? { studentId: actor.id } : {}) }, select: { studentId: true } }) : [];
    const arranged = new Set(arrangements.map(item => item.studentId));
    const serialize = (s: typeof active[number]): SessionView => ({
      id: s.id, title: s.title, instructions: s.instructions, mode: s.mode, state: s.state, opensAt: s.opensAt.toISOString(), closesAt: s.closesAt.toISOString(), presentUntil: s.presentUntil.toISOString(), timezone: s.timezone, sessionDate: s.sessionDate, requiresLocation: s.requiresLocation, radius: s.radius, liveCodeEnabled: s.liveCodeEnabled, legalHold: ctx.isAdmin && s.legalHold,
      records: s.records.map(r => ({ id: r.id, studentId: r.studentId, name: r.student.name, studentNumber: r.student.studentNumber, required: r.required, eligibilityReason: r.eligibilityReason, status: r.status, source: r.source, verification: r.verification, markedAt: r.markedAt?.toISOString() ?? null, presentUntil: r.presentUntil.toISOString(), revision: r.revision, approvedArrangement: arranged.has(r.studentId) })),
      requests: s.records.flatMap(r => r.request ? [{ id: r.request.id, recordId: r.id, studentId: r.studentId, name: r.student.name, submittedAt: r.request.submittedAt.toISOString(), reason: r.request.reason, state: r.request.state, verification: r.request.verification, revision: r.request.revision, decisionReason: r.request.decisionReason, bulkEligible: bulkEligible(s.requiresLocation, r.request.verification) && (!r.status || r.source === 'AUTOMATIC'), approvedArrangement: arranged.has(r.studentId) }] : []),
    });
    const enrollments = !student ? await tx.enrollment.findMany({ where: { courseId, status: 'APPROVED', student: { isActive: true } }, select: { student: { select: { id: true, name: true } } }, orderBy: { student: { name: 'asc' } } }) : [];
    const grants = ctx.role === 'MANAGER' && ctx.policy.phase >= 3 ? await tx.attendanceGrant.findMany({ where: { courseId } }) : [];
    const staff = ctx.role === 'MANAGER' && ctx.policy.phase >= 3 ? await tx.user.findMany({ where: { instituteId: ctx.user.instituteId, isActive: true, role: { in: ['PROFESSOR', 'TEACHER', 'INSTRUCTOR'] } }, select: { id: true, name: true } }) : [];
    const summaries = !student && ctx.policy.phase >= 3 ? await summariesForCourse(tx, courseId) : [];
    return {
      asOf: now.toISOString(), course: { id: courseId, title: ctx.course.title, instituteCode: ctx.course.institute.code, archived: ctx.course.isArchived }, enabled: ctx.enabled, phase: ctx.policy.phase, role: ctx.role,
      policy: ctx.isAdmin ? ctx.policy : { ...ctx.policy, privacyReview: '', pilotCourseIds: [] }, settings: student ? { ...ctx.settings, latitude: null, longitude: null } : ctx.settings,
      sessions: [...active, ...previous.slice(0, 20)].map(serialize), page, hasMore: previous.length > 20, summaries,
      students: enrollments.map(e => ({ ...e.student, approvedArrangement: arranged.has(e.student.id) })),
      helpers: grants.map(g => ({ id: g.id, userId: g.userId, name: staff.find(u => u.id === g.userId)?.name ?? 'Inactive helper' })), staff,
    };
  });
}
async function summariesForCourse(tx: Tx, courseId: string): Promise<AttendanceSummary[]> {
  const records = await tx.attendanceRecord.findMany({ where: { session: { courseId, state: 'CLOSED' }, required: true }, include: { student: { select: { name: true } }, request: { select: { state: true } } }, orderBy: [{ session: { opensAt: 'asc' } }, { sessionId: 'asc' }] });
  const summaries = new Map<string, AttendanceSummary>();
  for (const r of records) {
    const row = summaries.get(r.studentId) ?? { studentId: r.studentId, name: r.student.name, present: 0, tardy: 0, absent: 0, excused: 0, absenceStreak: 0, tardyStreak: 0, pending: 0 };
    if (r.status === 'PRESENT') row.present++;
    if (r.status === 'TARDY') row.tardy++;
    if (r.status === 'ABSENT') row.absent++;
    if (r.status === 'EXCUSED') row.excused++;
    row.absenceStreak = r.status === 'ABSENT' ? row.absenceStreak + 1 : 0;
    row.tardyStreak = r.status === 'TARDY' ? row.tardyStreak + 1 : 0;
    if (r.request?.state === 'PENDING') row.pending++;
    summaries.set(r.studentId, row);
  }
  return [...summaries.values()].sort((a, b) => a.name.localeCompare(b.name));
}
export async function attendanceCodes(actor: AttendanceActor, courseId: string, sessionId: string): Promise<AttendanceCode> {
  const now = new Date();
  const data = await transaction(async tx => {
    const ctx = await access(tx, actor, courseId); requireStaff(ctx); requireWritable(ctx);
    await finalizeExpired(tx, courseId, now);
    const s = await tx.attendanceSession.findFirst({ where: { id: sessionId, courseId, state: 'OPEN', closesAt: { gt: now } } });
    if (!s) throw new AccessError(409, 'This session has closed.');
    return s;
  });
  const slotEnd = (Math.floor(now.getTime() / 15000) + 1) * 15000;
  const token = data.mode === 'IN_PERSON' ? await signAttendanceToken('qr', data, new Date(slotEnd - 15000), 15 + data.qrGraceSeconds) : null;
  const codeDeadline = data.liveCodeEnabled ? (Math.floor(now.getTime() / 60000) + 1) * 60000 + 10000 : slotEnd + data.qrGraceSeconds * 1000;
  return { token, qrImage: token ? await QRCode.toDataURL(token, { width: 480, margin: 4, errorCorrectionLevel: 'M' }) : null, code: data.liveCodeEnabled ? liveCode(data.id, data.tokenVersion, Math.floor(now.getTime() / 60000)) : null, expiresAt: new Date(Math.min(codeDeadline, data.closesAt.getTime())).toISOString(), serverTime: now.toISOString() };
}
export async function attendanceChallenge(actor: AttendanceActor, courseId: string, sessionId: string) {
  return transaction(async tx => {
    const now = new Date(); const ctx = await access(tx, actor, courseId); requireWritable(ctx, 2);
    if (ctx.role !== 'STUDENT') throw new AccessError(403, 'Student access required.');
    await finalizeExpired(tx, courseId, now);
    const s = await tx.attendanceSession.findFirst({ where: { id: sessionId, courseId, state: 'OPEN', closesAt: { gt: now }, records: { some: { studentId: actor.id, required: true } } } });
    if (!s) throw new AccessError(409, 'This session is unavailable.');
    return { challenge: await signAttendanceToken('challenge', s, now, 60, actor.id) };
  });
}
export async function attendanceExport(actor: AttendanceActor, courseId: string, from?: string, to?: string) {
  const now = new Date();
  return transaction(async tx => {
    const ctx = await access(tx, actor, courseId);
    if (ctx.role !== 'MANAGER') throw new AccessError(403, 'Only the primary instructor or administrator can export attendance.');
    if ([from, to].some(v => v !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(v)) || from && to && from > to) throw new AccessError(400, 'Use a valid session-date range.');
    await finalizeExpired(tx, courseId, now);
    const sessions = await tx.attendanceSession.findMany({ where: { courseId, ...(from || to ? { sessionDate: { gte: from, lte: to } } : {}) }, include: { records: { include: recordInclude } }, orderBy: { opensAt: 'asc' } });
    const rows: unknown[][] = [['Class', 'Session', 'Session date', 'Timezone', 'Session state', 'Student number', 'Student', 'Required', 'Status', 'Recorded time', 'Source', 'Verification', 'Request pending', 'As of (UTC)']];
    for (const s of sessions) for (const r of s.records) rows.push([ctx.course.title, s.title, s.sessionDate, s.timezone, s.state, r.student.studentNumber, r.student.name, r.required ? 'Yes' : 'No', r.status ?? 'Not marked', r.markedAt ? new Intl.DateTimeFormat('en-GB', { timeZone: s.timezone, dateStyle: 'short', timeStyle: 'medium' }).format(r.markedAt) : '', r.source, r.verification, r.request?.state === 'PENDING' ? 'Yes' : 'No', now.toISOString()]);
    await event(tx, { courseId, actorId: actor.id, action: 'EXPORT', reason: `${from ?? 'all'} to ${to ?? 'all'}; asOf ${now.toISOString()}` }, now);
    return { csv: '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), asOf: now.toISOString() };
  });
}
export async function attendanceAssignments(actor: AttendanceActor) {
  return transaction(async tx => {
    const session = await tx.session.findUnique({ where: { id: actor.sessionId }, include: { user: true } });
    if (!session || session.userId !== actor.id || session.expiresAt <= new Date()) throw new AccessError(401, 'Please sign in.');
    const candidates = await tx.attendanceGrant.findMany({ where: { userId: actor.id, course: { instituteId: session.user.instituteId } }, include: { course: { select: { id: true, title: true } } } });
    const result: Array<{ id: string; title: string }> = [];
    for (const grant of candidates) { try { await access(tx, actor, grant.courseId); result.push(grant.course); } catch (error) { if (!(error instanceof AccessError)) throw error; } }
    return result;
  });
}
