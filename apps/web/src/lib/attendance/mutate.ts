import type { AttendanceSession, AttendanceRecord, AttendanceRequest } from '@prisma/client';
import type { AttendanceMutationResult, AttendanceLocation } from '@lms/types';
import { AccessError } from '@/lib/super-user-v1/actor';
import { mayAdmitAccount, canonicalRole } from '@/lib/super-user-v1/capabilities';
import { access, requireManager, requireStaff, requireWritable, type AttendanceActor, type Context, type Tx } from './access';
import { closeSession, event, finalizeExpired } from './lifecycle';
import { bulkEligible, classify, expiresAfter, liveBucket, sessionDate, verification } from './rules';
import { transaction } from './read';
import { mutationSchema, type Mutation } from './schema';
import { verifyAttendanceToken, verifyLiveCode } from './tokens';

async function notify(tx: Tx, ctx: Context, studentId: string, title: string) {
  if (ctx.policy.phase < 2) return;
  await tx.notification.create({ data: { userId: studentId, type: 'ATTENDANCE', title, message: `Your attendance in ${ctx.course.title} was updated. Open Attendance to review it.`, link: `/${ctx.course.institute.code}/courses/${ctx.course.id}/attendance` } });
}
async function locationResult(tx: Tx, s: AttendanceSession, r: AttendanceRecord, input: { location?: AttendanceLocation; challenge?: string }, now: Date, ctx: Context) {
  if (!s.requiresLocation) return 'NOT_CHECKED' as const;
  if (input.location) await verifyAttendanceToken(input.challenge, 'challenge', s, now, r.studentId);
  const checked = verification(input.location, s, now);
  const expiresAt = expiresAfter(now, ctx.policy.verificationDays);
  if (!expiresAt) throw new AccessError(409, 'Verification retention has not been configured.');
  await tx.attendanceVerificationDetail.create({ data: { recordId: r.id, ...checked, outcome: checked.outcome, expiresAt } });
  return checked.outcome;
}
async function decision(tx: Tx, ctx: Context, s: AttendanceSession, request: AttendanceRequest, input: { accept: boolean; status?: AttendanceRecord['status']; reason?: string }, now: Date) {
  const record = await tx.attendanceRecord.findUniqueOrThrow({ where: { id: request.recordId } });
  const enrollment = await tx.enrollment.findUnique({ where: { courseId_studentId: { courseId: s.courseId, studentId: record.studentId } } });
  if (input.accept && (!record.required || enrollment?.status !== 'APPROVED')) throw new AccessError(409, 'This student is no longer eligible for this request.');
  if (record.status && record.source !== 'AUTOMATIC') throw new AccessError(409, 'This student already has an explicit attendance mark.');
  const exception = !bulkEligible(s.requiresLocation, request.verification);
  if (input.accept && exception && (!input.reason?.trim() || !input.status)) throw new AccessError(400, 'Choose a status and explain this location exception.');
  if (input.accept && !exception && input.status && input.status !== classify(request.submittedAt, record.presentUntil)) throw new AccessError(400, 'Ordinary requests use their submission time. Use a separate correction to change that status.');
  const status = input.accept ? exception ? input.status! : classify(request.submittedAt, record.presentUntil) : record.status;
  if (input.accept) await tx.attendanceRecord.update({ where: { id: record.id }, data: { status, source: 'INSTRUCTOR_APPROVED', verification: request.verification, markedAt: request.submittedAt, revision: { increment: 1 } } });
  const textExpiresAt = request.textExpiresAt ?? expiresAfter(now, ctx.policy.requestDays);
  if (input.reason && !textExpiresAt) throw new AccessError(409, 'Configure request-text retention before recording a decision explanation.');
  await tx.attendanceRequest.update({ where: { id: request.id }, data: { state: input.accept ? 'ACCEPTED' : 'DECLINED', decidedAt: now, decidedById: ctx.user.id, decisionReason: input.reason || null, textExpiresAt, revision: { increment: 1 } } });
  await event(tx, { courseId: s.courseId, sessionId: s.id, actorId: ctx.user.id, studentId: record.studentId, action: input.accept ? 'ACCEPT_REQUEST' : 'DECLINE_REQUEST', beforeStatus: record.status, afterStatus: status, source: 'INSTRUCTOR_APPROVED', verification: request.verification }, now);
  await notify(tx, ctx, record.studentId, 'Attendance request updated');
}

export async function mutateAttendance(actor: AttendanceActor, courseId: string, raw: unknown): Promise<AttendanceMutationResult> {
  const parsed = mutationSchema.safeParse(raw);
  if (!parsed.success) throw new AccessError(400, parsed.error.issues.map(issue => issue.message).join(' '));
  const input = parsed.data;
  const receivedAt = new Date();
  return transaction(async tx => {
    let ctx = await access(tx, actor, courseId);
    // Lock order: institute, course, grant, session, record. Shared locks do not serialize check-ins.
    if (input.action === 'POLICY') await tx.$queryRaw`SELECT id FROM "Institute" WHERE id = ${ctx.user.instituteId} FOR UPDATE`;
    else await tx.$queryRaw`SELECT id FROM "Institute" WHERE id = ${ctx.user.instituteId} FOR SHARE`;
    if (['CREATE_SESSION', 'SETTINGS', 'POLICY', 'ARRANGEMENT', 'GRANT', 'REVOKE'].includes(input.action)) {
      await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${courseId} FOR UPDATE`;
    } else await tx.$queryRaw`SELECT id FROM "Course" WHERE id = ${courseId} FOR SHARE`;
    ctx = await access(tx, actor, courseId, true);
    await finalizeExpired(tx, courseId, receivedAt);
    if (input.action === 'POLICY') {
      if (!ctx.isAdmin) throw new AccessError(403, 'Only the institute administrator can change rollout or retention.');
      const { timezone, ...data } = input.policy;
      if (ctx.policy.recordDays !== null && [data.recordDays, data.eventDays, data.requestDays, data.verificationDays, data.arrangementDays].some(value => value === null)) throw new AccessError(400, 'Keep the approved retention schedule when disabling attendance; existing records still need retention rules.');
      if (data.locationEnabled && process.env.NODE_ENV === 'production') {
        const job = await tx.attendanceJob.findUnique({ where: { id: 'retention' } });
        if (!job?.lastSuccessAt || receivedAt.getTime() - job.lastSuccessAt.getTime() >= 30 * 3600000 || job.backlog > 0) throw new AccessError(409, 'Verify scheduled retention cleanup and its monitor before enabling production attendance.');
      }
      const courses = await tx.course.findMany({ where: { instituteId: ctx.user.instituteId, id: { in: data.pilotCourseIds } }, select: { id: true } });
      if (courses.length !== new Set(data.pilotCourseIds).size) throw new AccessError(400, 'Pilot classes must belong to this institute.');
      await tx.institute.update({ where: { id: ctx.user.instituteId }, data: { timezone } });
      await tx.attendancePolicy.upsert({ where: { instituteId: ctx.user.instituteId }, create: { instituteId: ctx.user.instituteId, ...data }, update: data });
      const open = await tx.attendanceSession.findMany({ where: { course: { instituteId: ctx.user.instituteId }, state: 'OPEN', ...(data.rollout === 'DISABLED' ? {} : { OR: [
        ...(data.rollout === 'PILOT' ? [{ courseId: { notIn: data.pilotCourseIds } }] : []),
        ...(!data.locationEnabled || data.phase < 2 ? [{ requiresLocation: true }] : []),
      ] }) }, orderBy: { id: 'asc' } });
      for (const s of open) await closeSession(tx, s.courseId, s.id, receivedAt, actor.id, true);
      await event(tx, { courseId, actorId: actor.id, action: 'POLICY_UPDATED', reason: 'Institute rollout and retention settings updated.' }, receivedAt);
      return { message: 'Institute attendance policy saved.' };
    }
    if (ctx.course.isArchived && input.action !== 'HOLD' && input.action !== 'REVOKE') throw new AccessError(409, 'Archived attendance is read-only.');
    if (input.action === 'SETTINGS') {
      requireManager(ctx); requireWritable(ctx);
      await tx.attendanceSettings.upsert({ where: { courseId }, create: { courseId, ...input.settings }, update: input.settings });
      await event(tx, { courseId, actorId: actor.id, action: 'SETTINGS_UPDATED' }, receivedAt);
      return { message: 'Class attendance settings saved.' };
    }
    if (input.action === 'ARRANGEMENT') {
      requireManager(ctx); requireWritable(ctx, 2);
      const enrolled = await tx.enrollment.findUnique({ where: { courseId_studentId: { courseId, studentId: input.studentId } } });
      if (enrolled?.status !== 'APPROVED') throw new AccessError(400, 'Choose an enrolled student.');
      if (input.enabled) {
        const expiresAt = expiresAfter(receivedAt, ctx.policy.arrangementDays);
        if (!expiresAt) throw new AccessError(409, 'Arrangement retention is not configured.');
        await tx.attendanceArrangement.upsert({ where: { courseId_studentId: { courseId, studentId: input.studentId } }, create: { courseId, studentId: input.studentId, createdById: actor.id, expiresAt }, update: { expiresAt, createdById: actor.id } });
      } else await tx.attendanceArrangement.deleteMany({ where: { courseId, studentId: input.studentId } });
      await event(tx, { courseId, actorId: actor.id, studentId: input.studentId, action: input.enabled ? 'ARRANGEMENT_ENABLED' : 'ARRANGEMENT_REMOVED' }, receivedAt);
      return { message: 'Attendance arrangement saved.' };
    }
    if (input.action === 'GRANT' || input.action === 'REVOKE') {
      requireManager(ctx); if (input.action === 'GRANT') requireWritable(ctx, 3);
      if (input.action === 'GRANT') {
        const target = await tx.user.findUnique({ where: { id: input.userId } });
        if (!target || !mayAdmitAccount(target) || target.instituteId !== ctx.user.instituteId || canonicalRole(target.role) !== 'INSTRUCTOR' || target.id === ctx.course.instructorId) throw new AccessError(400, 'Choose another active instructor in this institute.');
        await tx.attendanceGrant.upsert({ where: { courseId_userId: { courseId, userId: target.id } }, create: { courseId, userId: target.id, createdById: actor.id }, update: {} });
      } else await tx.attendanceGrant.deleteMany({ where: { id: input.grantId, courseId } });
      await event(tx, { courseId, actorId: actor.id, action: input.action === 'GRANT' ? 'GRANT_HELPER' : 'REVOKE_HELPER' }, receivedAt);
      return { message: 'Attendance helper access updated.' };
    }
    if (input.action === 'CREATE_SESSION') {
      requireStaff(ctx); requireWritable(ctx);
      const value = input.input;
      if (value.requiresLocation && (ctx.policy.phase < 2 || !ctx.policy.locationEnabled)) throw new AccessError(409, 'Location verification is not enabled for this institute.');
      const latitude = value.latitude ?? ctx.settings.latitude; const longitude = value.longitude ?? ctx.settings.longitude;
      if (value.requiresLocation && (latitude === null || longitude === null)) throw new AccessError(400, 'Set the class location first.');
      const count = await tx.attendanceSession.count({ where: { courseId, state: 'OPEN', closesAt: { gt: receivedAt }, mode: value.mode === 'ASYNCHRONOUS' ? 'ASYNCHRONOUS' : { in: ['IN_PERSON', 'LIVE_REMOTE'] } } });
      if (count >= ctx.settings[liveBucket(value.mode)]) throw new AccessError(409, 'The class has reached its concurrent-session limit.');
      const closesAt = new Date(receivedAt.getTime() + value.durationMinutes * 60000);
      const presentUntil = new Date(receivedAt.getTime() + (value.presentMinutes ?? (value.mode === 'ASYNCHRONOUS' ? value.durationMinutes : Math.min(10, value.durationMinutes))) * 60000);
      const s = await tx.attendanceSession.create({ data: { courseId, createdById: actor.id, title: value.title, instructions: value.instructions, mode: value.mode, opensAt: receivedAt, closesAt, presentUntil, sessionDate: sessionDate(receivedAt, ctx.policy.timezone), timezone: ctx.policy.timezone, requiresLocation: value.requiresLocation, latitude: value.requiresLocation ? latitude : null, longitude: value.requiresLocation ? longitude : null, radius: value.radius, qrGraceSeconds: value.qrGraceSeconds, liveCodeEnabled: value.liveCodeEnabled, expiresAt: expiresAfter(closesAt, ctx.policy.recordDays) } });
      const students = await tx.enrollment.findMany({ where: { courseId, status: 'APPROVED', student: { isActive: true, role: 'STUDENT' } }, select: { studentId: true } });
      if (students.length) await tx.attendanceRecord.createMany({ data: students.map(r => ({ sessionId: s.id, studentId: r.studentId, eligibleAt: receivedAt, presentUntil })) });
      await event(tx, { courseId, sessionId: s.id, actorId: actor.id, action: 'CREATE_SESSION' }, receivedAt);
      return { message: 'Attendance session started.' };
    }
    // Shared session locks allow a whole class to submit concurrently; closure takes an exclusive lock.
    const exclusive = ['END', 'CANCEL', 'REGENERATE', 'ADD_STUDENT', 'HOLD'].includes(input.action);
    if (exclusive) await tx.$queryRaw`SELECT id FROM "AttendanceSession" WHERE id = ${input.sessionId} AND "courseId" = ${courseId} FOR UPDATE`;
    else await tx.$queryRaw`SELECT id FROM "AttendanceSession" WHERE id = ${input.sessionId} AND "courseId" = ${courseId} FOR SHARE`;
    const s = await tx.attendanceSession.findFirst({ where: { id: input.sessionId, courseId } });
    if (!s || s.state === 'CANCELLED' && input.action !== 'HOLD') throw new AccessError(404, 'Attendance session not found.');
    if (input.action === 'HOLD') {
      if (!ctx.isAdmin) throw new AccessError(403, 'Only an institute administrator can manage retention holds.');
      await tx.attendanceSession.update({ where: { id: s.id }, data: { legalHold: input.enabled } });
      await event(tx, { courseId, sessionId: s.id, actorId: actor.id, action: input.enabled ? 'HOLD_ENABLED' : 'HOLD_REMOVED', reason: input.reason }, receivedAt);
      return { message: 'Retention hold updated.' };
    }
    if (input.action === 'END' || input.action === 'CANCEL' || input.action === 'REGENERATE') {
      requireStaff(ctx);
      if (input.action === 'CANCEL') requireManager(ctx); else requireWritable(ctx);
      if (input.action === 'REGENERATE') { if (s.state !== 'OPEN') throw new AccessError(409, 'This session has closed.'); await tx.attendanceSession.update({ where: { id: s.id }, data: { tokenVersion: { increment: 1 } } }); await event(tx, { courseId, sessionId: s.id, actorId: actor.id, action: 'REGENERATE' }, receivedAt); }
      else await closeSession(tx, courseId, s.id, receivedAt, actor.id, input.action === 'CANCEL');
      return { message: input.action === 'CANCEL' ? 'Session cancelled; it will not count toward attendance.' : input.action === 'END' ? 'Attendance closed.' : 'Old codes invalidated.' };
    }
    if (input.action === 'ADD_STUDENT') {
      requireManager(ctx); requireWritable(ctx);
      if (s.state !== 'OPEN') throw new AccessError(409, 'Add students before the session closes.');
      const enrollment = await tx.enrollment.findUnique({ where: { courseId_studentId: { courseId, studentId: input.studentId } } });
      if (enrollment?.status !== 'APPROVED') throw new AccessError(400, 'Choose an enrolled student.');
      await tx.attendanceRecord.upsert({ where: { sessionId_studentId: { sessionId: s.id, studentId: input.studentId } }, create: { sessionId: s.id, studentId: input.studentId, eligibleAt: receivedAt, presentUntil: s.presentUntil }, update: { required: true, eligibilityReason: '', revision: { increment: 1 } } });
      await event(tx, { courseId, sessionId: s.id, actorId: actor.id, studentId: input.studentId, action: 'ADD_STUDENT', reason: input.reason }, receivedAt);
      return { message: 'Student added to this session.' };
    }
    if (input.action === 'MARK') {
      requireStaff(ctx); if (s.state !== 'OPEN') requireManager(ctx);
      await tx.$queryRaw`SELECT id FROM "AttendanceRecord" WHERE id = ${input.recordId} AND "sessionId" = ${s.id} FOR UPDATE`;
      const r = await tx.attendanceRecord.findFirst({ where: { id: input.recordId, sessionId: s.id } });
      if (!r || r.revision !== input.revision) throw new AccessError(409, 'Attendance changed. Refresh before marking.');
      if (ctx.role === 'HELPER' && r.status && r.source !== 'AUTOMATIC') throw new AccessError(403, 'Helpers cannot change an explicit attendance mark.');
      await tx.attendanceRecord.update({ where: { id: r.id }, data: { status: input.status, required: true, eligibilityReason: '', source: 'MANUAL', markedAt: receivedAt, revision: { increment: 1 } } });
      await tx.attendanceRequest.updateMany({ where: { recordId: r.id, state: 'PENDING' }, data: { state: 'SUPERSEDED', decidedAt: receivedAt, revision: { increment: 1 } } });
      await event(tx, { courseId, sessionId: s.id, actorId: actor.id, studentId: r.studentId, action: 'MARK', beforeStatus: r.status, afterStatus: input.status, reason: input.reason, source: 'MANUAL', verification: r.verification }, receivedAt);
      await notify(tx, ctx, r.studentId, 'Attendance updated');
      return { message: `Attendance marked ${input.status.toLowerCase()}.`, status: input.status };
    }
    if (input.action === 'DECIDE' || input.action === 'ACCEPT_ALL') {
      requireStaff(ctx); if (ctx.policy.phase < 2) throw new AccessError(409, 'Attendance requests are not enabled.');
      if (input.action === 'ACCEPT_ALL' && !s.requiresLocation && !input.acknowledgeUnverified) throw new AccessError(400, 'Acknowledge that location was not checked.');
      const ids = input.action === 'DECIDE' ? [{ id: input.requestId, revision: input.revision }] : [...new Map(input.requests.map(r => [r.id, r])).values()].sort((a, b) => a.id.localeCompare(b.id));
      let skipped = 0;
      for (const item of ids) {
        const request = await tx.attendanceRequest.findFirst({ where: { id: item.id, record: { sessionId: s.id } } });
        if (request) await tx.$queryRaw`SELECT id FROM "AttendanceRecord" WHERE id = ${request.recordId} FOR UPDATE`;
        const latest = request ? await tx.attendanceRequest.findUnique({ where: { id: request.id }, include: { record: true } }) : null;
        const enrolled = latest && input.action === 'ACCEPT_ALL' ? await tx.enrollment.count({ where: { courseId, studentId: latest.record.studentId, status: 'APPROVED' } }) : 1;
        if (!latest || latest.state !== 'PENDING' || latest.revision !== item.revision || input.action === 'ACCEPT_ALL' && (!enrolled || !bulkEligible(s.requiresLocation, latest.verification) || latest.record.status && latest.record.source !== 'AUTOMATIC' || !latest.record.required)) {
          if (input.action === 'DECIDE') throw new AccessError(409, 'This request changed or has already been decided.');
          skipped++; continue;
        }
        await decision(tx, ctx, s, latest, input.action === 'DECIDE' ? input : { accept: true }, receivedAt);
      }
      return { message: input.action === 'DECIDE' ? 'Attendance request decided.' : `${ids.length - skipped} requests accepted; ${skipped} skipped.`, skipped };
    }
    if (input.action === 'CHECK_IN' || input.action === 'REQUEST') return studentSubmission(tx, ctx, s, input, receivedAt);
    throw new AccessError(400, 'Unsupported attendance action.');
  });
}

async function studentSubmission(tx: Tx, ctx: Context, s: AttendanceSession, input: Extract<Mutation, { action: 'CHECK_IN' | 'REQUEST' }>, now: Date): Promise<AttendanceMutationResult> {
  if (ctx.role !== 'STUDENT') throw new AccessError(403, 'Only enrolled students can check in.');
  requireWritable(ctx, input.action === 'REQUEST' ? 2 : 1);
  const current = await tx.attendanceRecord.findUnique({ where: { sessionId_studentId: { sessionId: s.id, studentId: ctx.user.id } } });
  if (!current) throw new AccessError(403, 'You are not on this session roster. Ask your instructor.');
  await tx.$queryRaw`SELECT id FROM "AttendanceRecord" WHERE id = ${current.id} FOR UPDATE`;
  const r = await tx.attendanceRecord.findUniqueOrThrow({ where: { id: current.id } });
  if (r.status && r.source !== 'AUTOMATIC') return { message: `Your attendance is ${r.status.toLowerCase()}.`, status: r.status };
  if (!r.required) throw new AccessError(409, 'Attendance is not required for this session.');
  if (input.action === 'REQUEST') {
    const previous = await tx.attendanceRequest.findUnique({ where: { recordId: r.id } });
    if (previous) return { message: `Your request is ${previous.state.toLowerCase()}.` };
  }
  if (s.state !== 'OPEN' || now >= s.closesAt) throw new AccessError(409, 'This attendance window has closed.');
  if (input.action === 'CHECK_IN') {
    if (s.mode === 'IN_PERSON') await verifyAttendanceToken(input.token, 'qr', s, now);
    else if (s.liveCodeEnabled && !verifyLiveCode(input.code, s, now)) throw new AccessError(400, 'Enter the current code shared by your instructor.');
    else if (input.token) throw new AccessError(400, 'This session uses direct check-in.');
  }
  const checked = await locationResult(tx, s, r, input, now, ctx);
  if (input.action === 'CHECK_IN' && s.requiresLocation && checked !== 'NEARBY') return { message: 'Location could not confirm you are nearby. Request instructor approval instead.' };
  if (input.action === 'REQUEST') {
    await tx.attendanceRequest.create({ data: { recordId: r.id, submittedAt: now, reason: input.reason || null, verification: checked, textExpiresAt: expiresAfter(now, ctx.policy.requestDays) } });
    await event(tx, { courseId: s.courseId, sessionId: s.id, actorId: ctx.user.id, studentId: ctx.user.id, action: 'REQUEST', verification: checked }, now);
    return { message: 'Attendance request sent. Your instructor will review it.' };
  }
  const status = classify(now, r.presentUntil);
  const source = s.mode === 'IN_PERSON' ? 'QR_SCANNED' : s.liveCodeEnabled ? 'REMOTE_CODE' : 'SELF_REPORTED';
  await tx.attendanceRecord.update({ where: { id: r.id }, data: { status, source, verification: checked, markedAt: now, revision: { increment: 1 } } });
  await tx.attendanceRequest.updateMany({ where: { recordId: r.id, state: 'PENDING' }, data: { state: 'SUPERSEDED', revision: { increment: 1 } } });
  await event(tx, { courseId: s.courseId, sessionId: s.id, actorId: ctx.user.id, studentId: ctx.user.id, action: 'CHECK_IN', afterStatus: status, source, verification: checked }, now);
  return { message: `Marked ${status.toLowerCase()}.`, status };
}
