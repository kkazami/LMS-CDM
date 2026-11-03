import { academicProvenance } from '@/lib/labs/readiness';
import { assertOrdinaryClasswork, markAcademicWorkStarted } from '@/lib/academic-task';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { githubSubmissionError, parseGithubRepository } from '@/lib/coursework-submission';
import { db } from '@/lib/db';
import { requireCourseAccess, type CourseActor } from './course-access';
import { canonicalRole } from './super-user-v1/capabilities';
import { AccessError } from './super-user-v1/actor';
import { grantExp } from './gamification/grant-exp';
import { EXP_VALUES } from './gamification/exp-engine';
import { awardBadgeIfEarned } from './gamification/badge-checker';
import { requireOwnedUpload } from './private-upload';

const id = z.string().min(1).max(200);
export const attachmentLocation = z.string().min(1).max(35 * 1024 * 1024).refine(value => {
  if (/^\/api\/assets\/[a-zA-Z0-9-]{1,100}$/.test(value)) return true;
  if (/^\/uploads\/[^?#\\]+$/.test(value)) return true;
  if (/^data:(?:application\/(?:pdf|vnd\.[a-z0-9.+-]+)|image\/(?:png|jpeg|gif|webp)|text\/(?:plain|csv));base64,[a-z0-9+/]+={0,2}$/i.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}, 'Invalid attachment URL.');
const attachment = z.object({ url: attachmentLocation, fileName: z.string().max(255).optional(), type: z.enum(['FILE', 'LINK']).optional() }).strict();
export const submissionInput = z.object({
  syllabusItemId: id, status: z.enum(['SUBMITTED', 'DRAFT']).default('SUBMITTED'),
  attachmentUrl: attachmentLocation.optional(), fileName: z.string().max(255).optional(), attachments: z.array(attachment).max(20).optional(),
  replaceAttachments: z.boolean().optional(),
}).strict();
export const gradeInput = z.object({ submissionId: id, grade: z.number().finite().nonnegative(), feedback: z.string().max(10000).optional() }).strict();

export async function lockAcademicRecord(tx: Prisma.TransactionClient, studentId: string, itemId: string) {
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${JSON.stringify(['academic', studentId, itemId])}, 0))`;
}

export async function saveSubmission(actor: CourseActor, courseId: string, raw: unknown, key?: string | null) {
  if (canonicalRole(actor.role) !== 'STUDENT') throw new AccessError(403, 'Students only.');
  const parsed = submissionInput.safeParse(raw);
  if (!parsed.success || key != null && !/^[\x21-\x7e]{1,128}$/.test(key)) throw new AccessError(400, 'Invalid submission.');
  const input = parsed.data;
  const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const requestId = key ? digest([actor.id, key]) : null;
  const requestHash = digest([courseId, input]);
  return db.$transaction(async tx => {
    // A receipt key is scoped to the actor, including across different assignments.
    if (requestId) await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${requestId}, 0))`;
    await assertOrdinaryClasswork(tx, input.syllabusItemId);
    await lockAcademicRecord(tx, actor.id, input.syllabusItemId);
    await requireCourseAccess(actor, courseId, false, tx);
    const item = await tx.syllabusItem.findFirst({ where: { id: input.syllabusItemId, courseId }, include: { form: { select: { id: true } } } });
    if (!item || item.type === 'MATERIAL') throw new AccessError(404, 'Assignment not found.');
    if (item.form) throw new AccessError(400, 'Submit this assessment through its form.');
    if (requestId) {
      const receipt = await tx.submissionRequest.findUnique({ where: { id: requestId } });
      if (receipt) {
        if (receipt.requestHash !== requestHash) throw new AccessError(409, 'Idempotency key was already used for another request.');
        return receipt.response;
      }
    }
    const existing = await tx.studentSubmission.findUnique({ where: { syllabusItemId_studentId: { syllabusItemId: item.id, studentId: actor.id } } });
    if (existing && (existing.isReturned || existing.grade !== null)) throw new AccessError(409, 'This assignment has already been graded or returned.');
    if (item.dueDate && item.dueDate < new Date()) throw new AccessError(409, 'The deadline has passed.');
    await markAcademicWorkStarted(tx, item.id, actor.id);
    const files = [...(input.attachments ?? []), ...(input.attachmentUrl ? [{ url: input.attachmentUrl, fileName: input.fileName || 'Submission Link', type: 'LINK' as const }] : [])];
    if (item.requireGithubRepo) {
      const retained = !input.replaceAttachments && existing ? await tx.submissionAttachment.findMany({ where: { submissionId: existing.id } }) : [];
      const combined = [...retained, ...files.filter(file => !retained.some(saved => saved.type === (file.type || 'FILE') && saved.url === file.url))];
      const error = githubSubmissionError(true, combined, input.status === 'SUBMITTED');
      if (error) throw new AccessError(400, error);
      for (const file of files) {
        const repository = parseGithubRepository(file.url)!;
        file.url = repository.url;
        file.fileName = repository.name;
      }
    }
    const submittedAt = input.status === 'SUBMITTED' ? (existing?.status === 'SUBMITTED' ? existing.submittedAt : new Date()) : existing?.submittedAt ?? null;
    const saved = await tx.studentSubmission.upsert({
      where: { syllabusItemId_studentId: { syllabusItemId: item.id, studentId: actor.id } },
      update: { status: input.status, submittedAt, ...await academicProvenance('STARTED', tx) }, create: { syllabusItemId: item.id, studentId: actor.id, status: input.status, submittedAt, ...await academicProvenance('STARTED', tx) },
    });
    for (const file of files) await requireOwnedUpload(tx, actor, file.url);
    if (input.replaceAttachments) await tx.submissionAttachment.deleteMany({ where: { submissionId: saved.id } });
    for (const file of files) {
      const data = { submissionId: saved.id, url: file.url, fileName: file.fileName || 'Attachment', type: file.type || 'FILE' };
      const where = item.requireGithubRepo ? { submissionId: saved.id, url: file.url, type: 'LINK' } : data;
      if (!await tx.submissionAttachment.findFirst({ where })) await tx.submissionAttachment.create({ data });
    }
    const result = await tx.studentSubmission.findUniqueOrThrow({ where: { id: saved.id }, include: { attachments: { select: { id: true, type: true, url: true, fileName: true } } } });
    if (input.status === 'SUBMITTED') await grantExp({ userId: actor.id, amount: EXP_VALUES.assignment_submitted,
      reason: `Submitted Assignment: ${item.id}`, source: 'assignment', courseId, idempotencyKey: `assignment_sub_${item.id}` }, tx);
    const response = { success: true, submission: { id: result.id, status: result.status, grade: result.grade, isReturned: result.isReturned, submittedAt: result.submittedAt?.toISOString() ?? null, attachments: result.attachments } };
    if (requestId) await tx.submissionRequest.create({ data: { id: requestId, userId: actor.id, requestHash, response } });
    return response;
  }, { timeout: 15000 });
}

// Regrading can award newly met rules; previously awarded rules are never awarded again or clawed back.
export async function gradeSubmission(actor: CourseActor, submissionId: string, rawGrade: number, feedback?: string, expectedCourseId?: string, transaction?: Prisma.TransactionClient) {
  const parsed = gradeInput.safeParse({ submissionId, grade: rawGrade, feedback });
  if (!parsed.success) throw new AccessError(400, 'Invalid grade or feedback.');
  const write = async (tx: Prisma.TransactionClient) => {
    const initial = await tx.studentSubmission.findUnique({ where: { id: submissionId }, include: { syllabusItem: true } });
    if (!initial || expectedCourseId && initial.syllabusItem.courseId !== expectedCourseId) throw new AccessError(404, 'Submission not found.');
    await assertOrdinaryClasswork(tx, initial.syllabusItemId);
    await lockAcademicRecord(tx, initial.studentId, initial.syllabusItemId);
    const course = await requireCourseAccess(actor, initial.syllabusItem.courseId, true, tx);
    const existing = await tx.studentSubmission.findUniqueOrThrow({ where: { id: submissionId }, include: { syllabusItem: true, student: true } });
    if (existing.student.instituteId !== actor.instituteId || canonicalRole(existing.student.role) !== 'STUDENT') throw new AccessError(404, 'Student not found.');
    await markAcademicWorkStarted(tx, existing.syllabusItemId, existing.studentId);
    const grade = Math.min(rawGrade, existing.syllabusItem.maxPoints ?? rawGrade);
    const changed = existing.grade !== grade || !existing.isReturned;
    const submission = await tx.studentSubmission.update({ where: { id: submissionId }, data: { grade, status: 'RETURNED', isReturned: true }, include: { student: { select: { id: true, name: true, email: true } }, attachments: true } });
    if (feedback?.trim()) {
      const data = { courseId: course.id, senderId: actor.id, recipientId: existing.studentId, content: feedback.trim() };
      if (!await tx.privateComment.findFirst({ where: data })) await tx.privateComment.create({ data });
    }
    const rules = await tx.gradeIncentiveRule.findMany({ where: { courseId: course.id, isActive: true } });
    if (rules.length) await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${JSON.stringify(['exp', existing.studentId])}, 0))`;
    // Legacy returned grades have no attributable reward key; do not pay them retroactively.
    for (const rule of rules) if (existing.isReturned && existing.grade !== null && existing.grade >= rule.gradeMin) {
      await tx.expTransaction.createMany({ data: [{ userId: existing.studentId, amount: 0, source: 'grade_incentive_baseline', courseId: course.id,
        reason: 'Historical returned grade eligibility recorded; no EXP awarded.', idempotencyKey: `grade:${submissionId}:${rule.id}` }], skipDuplicates: true });
    }
    for (const rule of rules) if (grade >= rule.gradeMin) await grantExp({ userId: existing.studentId, amount: rule.bonusExp,
      reason: `Grade Incentive: ${rule.label} (${grade} pts in ${course.code})`, source: 'grade_incentive', courseId: course.id,
      idempotencyKey: `grade:${submissionId}:${rule.id}` }, tx);
    if (existing.syllabusItem.maxPoints && grade === existing.syllabusItem.maxPoints) await awardBadgeIfEarned(existing.studentId, 'perfect-score', tx);
    if (changed) await tx.notification.create({ data: { userId: existing.studentId, type: 'GRADE', title: `Grade posted: ${existing.syllabusItem.title}`,
      message: `Your instructor returned a score of ${grade}${existing.syllabusItem.maxPoints == null ? '' : '/' + existing.syllabusItem.maxPoints}.`, link: `/${course.institute.code}/grades` } });
    return { submission, course, item: existing.syllabusItem };
  };
  return transaction ? write(transaction) : db.$transaction(write, { timeout: 15000 });
}

export async function gradeStudent(actor: CourseActor, itemId: string, studentId: string, grade: number) {
  if (!id.safeParse(itemId).success || !id.safeParse(studentId).success || !Number.isFinite(grade) || grade < 0) throw new AccessError(400, 'Invalid grade.');
  return db.$transaction(async tx => {
    await assertOrdinaryClasswork(tx, itemId);
    await lockAcademicRecord(tx, studentId, itemId);
    const item = await tx.syllabusItem.findUnique({ where: { id: itemId } });
    if (!item) throw new AccessError(404, 'Assignment not found.');
    await requireCourseAccess(actor, item.courseId, true, tx);
    const student = await tx.user.findUnique({ where: { id: studentId } });
    if (!student || student.instituteId !== actor.instituteId || canonicalRole(student.role) !== 'STUDENT') throw new AccessError(404, 'Student not found.');
    const enrollment = await tx.enrollment.findUnique({ where: { courseId_studentId: { courseId: item.courseId, studentId } } });
    if (enrollment?.status !== 'APPROVED') throw new AccessError(403, 'Student is not enrolled.');
    const submission = await tx.studentSubmission.upsert({ where: { syllabusItemId_studentId: { syllabusItemId: itemId, studentId } },
      create: { syllabusItemId: itemId, studentId, ...await academicProvenance('STARTED', tx) }, update: {} });
    return gradeSubmission(actor, submission.id, grade, undefined, item.courseId, tx);
  }, { timeout: 15000 });
}
