import { assertOrdinaryClasswork, markAcademicWorkStarted } from '@/lib/academic-task';
import { z } from 'zod';
import { db } from './db';
import { requireCourseAccess, type CourseActor } from './course-access';
import { canonicalRole } from './super-user-v1/capabilities';
import { AccessError } from './super-user-v1/actor';
import { lockAcademicRecord } from './academic-records';
import { getProblemById } from '@/features/interactive-activities/codelab/problems';

export const moderationInput = z.object({ submissionId: z.string().min(1).max(200), action: z.enum(['reject', 'delete', 'restore']), reason: z.string().max(2000).optional(), instituteCode: z.string().min(2).max(20).optional() }).strict();

export async function moderateCodeLab(actor: CourseActor, raw: unknown) {
  const input = moderationInput.safeParse(raw);
  if (!input.success) throw new AccessError(400, 'Invalid moderation request.');
  const role = canonicalRole(actor.role);
  if (!['ADMIN', 'INSTRUCTOR'].includes(role)) throw new AccessError(403, 'Instructors only.');
  return db.$transaction(async tx => {
    const first = await tx.activitySubmission.findUnique({ where: { id: input.data.submissionId }, include: { template: true } });
    if (!first) throw new AccessError(404, 'Submission not found.');
    if (first.template.syllabusItemId) await assertOrdinaryClasswork(tx, first.template.syllabusItemId);
    await lockAcademicRecord(tx, first.studentId, first.template.syllabusItemId || first.templateId);
    const submission = await tx.activitySubmission.findUniqueOrThrow({ where: { id: first.id }, include: { student: true, template: { include: { course: { include: { institute: true } } } } } });
    const institute = await tx.institute.findUnique({ where: { id: actor.instituteId } });
    if (institute?.code !== 'ics' || input.data.instituteCode && input.data.instituteCode !== institute.code || submission.student.instituteId !== actor.instituteId || canonicalRole(submission.student.role) !== 'STUDENT') throw new AccessError(404, 'Submission not found.');
    if (submission.template.syllabusItemId !== first.template.syllabusItemId) throw new AccessError(409, 'Activity linkage changed. Retry.');
    if (submission.template.syllabusItemId) {
      const item = await tx.syllabusItem.findUnique({ where: { id: submission.template.syllabusItemId } });
      if (!item || item.courseId !== submission.template.courseId) throw new AccessError(404, 'Activity course does not match.');
    }
    if (getProblemById(submission.templateId) && !submission.template.syllabusItemId) {
      if (role === 'INSTRUCTOR' && !await tx.enrollment.findFirst({ where: { studentId: submission.studentId, status: 'APPROVED', course: { instituteId: actor.instituteId, instructorId: actor.id } } })) throw new AccessError(403, 'Forbidden student.');
    } else await requireCourseAccess(actor, submission.template.courseId, true, tx);
    if (submission.activityType !== 'codelab') throw new AccessError(404, 'Submission not found.');
    let state: Record<string, unknown> = {};
    try { const parsed = JSON.parse(submission.stateCheck || '{}'); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) state = parsed; } catch { /* Legacy empty state. */ }
    const action = input.data.action;
    let score = submission.score;
    if (action === 'restore') {
      if (state.isRejected !== true) return { success: true, action, message: 'Submission is already restored.' };
      if (typeof state.originalScore !== 'number' || !Number.isFinite(state.originalScore) || state.originalScore < 0 || state.originalScore > 100) throw new AccessError(409, 'Original score is unavailable.');
      score = state.originalScore;
      for (const key of ['isRejected', 'rejectionReason', 'rejectedAt', 'rejectedBy']) delete state[key];
    } else if (action === 'reject') {
      if (state.isRejected !== true) state.originalScore = submission.score;
      Object.assign(state, { isRejected: true, rejectionReason: input.data.reason || 'Submission rejected by instructor.', rejectedAt: new Date().toISOString(), rejectedBy: actor.id });
      score = 0;
    }
    if (submission.template.syllabusItemId) await markAcademicWorkStarted(tx, submission.template.syllabusItemId, submission.studentId);
    if (action === 'delete') await tx.activitySubmission.delete({ where: { id: submission.id } });
    else await tx.activitySubmission.update({ where: { id: submission.id }, data: { score, passed: score >= 60, stateCheck: JSON.stringify(state) } });
    if (submission.template.syllabusItemId) await tx.studentSubmission.updateMany({ where: { syllabusItemId: submission.template.syllabusItemId, studentId: submission.studentId },
      data: { grade: action === 'delete' ? null : score, status: action === 'delete' ? 'DRAFT' : 'GRADED', ...(action === 'delete' ? { isReturned: false } : {}) } });
    await tx.notification.create({ data: { userId: submission.studentId, type: 'GRADE', title: 'CodeLab submission updated', message: `Your instructor applied: ${action}.`, link: `/${institute.code}/activities/codelab` } });
    return { success: true, action, message: 'Submission updated.' };
  }, { timeout: 15000 });
}
