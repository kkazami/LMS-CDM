"use server";
import { requireOwnedUpload } from '@/lib/private-upload';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth-session';
import { revalidatePath } from 'next/cache';
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { requireCourseAccess, type CourseActor } from '@/lib/course-access';
import { saveSubmission, gradeSubmission, lockAcademicRecord, submissionInput } from '@/lib/academic-records';
import { awardBadgeIfEarned } from '@/lib/gamification/badge-checker';
import type { Prisma } from '@prisma/client';

async function student() {
  const session = await getSession();
  if (!session || canonicalRole(session.user.role) !== 'STUDENT') throw new Error('Student authentication required.');
  return session.user;
}
async function mutable<T>(actor: CourseActor, submissionId: string, courseId: string, itemId: string, write: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async tx => {
    await lockAcademicRecord(tx, actor.id, itemId);
    await requireCourseAccess(actor, courseId, false, tx);
    const submission = await tx.studentSubmission.findFirst({ where: { id: submissionId, studentId: actor.id, syllabusItemId: itemId, syllabusItem: { courseId } }, include: { syllabusItem: true } });
    if (!submission) throw new Error('Submission not found.');
    if (submission.isReturned || submission.grade !== null) throw new Error('Submission has already been graded.');
    if (submission.syllabusItem.dueDate && submission.syllabusItem.dueDate < new Date()) throw new Error('The deadline has passed.');
    return write(tx);
  });
}
export async function getOrCreateSubmission(syllabusItemId: string) {
  await requireLegacyActor('classwork/actions.ts#getOrCreateSubmission', () => ({ syllabusItemId }));
  const actor = await student();
  return db.$transaction(async tx => {
    await lockAcademicRecord(tx, actor.id, syllabusItemId);
    const item = await tx.syllabusItem.findUnique({ where: { id: syllabusItemId } });
    if (!item) throw new Error('Assignment not found.');
    await requireCourseAccess(actor, item.courseId, false, tx);
    return tx.studentSubmission.upsert({ where: { syllabusItemId_studentId: { syllabusItemId, studentId: actor.id } }, create: { syllabusItemId, studentId: actor.id }, update: {}, include: { attachments: true } });
  });
}
export async function submitWork(submissionId: string, instituteCode: string, courseId: string, itemId: string) {
  await requireLegacyActor('classwork/actions.ts#submitWork', () => ({ institute: instituteCode, courseId, submissionId, itemId }));
  const actor = await student();
  const submission = await db.studentSubmission.findFirst({ where: { id: submissionId, studentId: actor.id, syllabusItemId: itemId, syllabusItem: { courseId } } });
  if (!submission) throw new Error('Submission not found.');
  await saveSubmission(actor, courseId, { syllabusItemId: itemId });
  try { await awardBadgeIfEarned(actor.id, 'assignment-first'); } catch { console.warn('SUBMISSION_BADGE_UNAVAILABLE'); }
  revalidatePath(`/${instituteCode}/courses/${courseId}/classwork/${itemId}`);
  return { success: true, error: undefined as string | undefined };
}
export async function unsubmitWork(submissionId: string, instituteCode: string, courseId: string, itemId: string) {
  await requireLegacyActor('classwork/actions.ts#unsubmitWork', () => ({ institute: instituteCode, courseId, submissionId, itemId }));
  const actor = await student();
  await mutable(actor, submissionId, courseId, itemId, tx => tx.studentSubmission.update({ where: { id: submissionId }, data: { status: 'DRAFT', submittedAt: null } }));
  revalidatePath(`/${instituteCode}/courses/${courseId}/classwork/${itemId}`);
  return { success: true, error: undefined as string | undefined };
}
async function addAttachment(submissionId: string, url: string, fileName: string, instituteCode: string, courseId: string, itemId: string, type: 'FILE' | 'LINK') {
  const actor = await student();
  const parsed = submissionInput.safeParse({ syllabusItemId: itemId, attachments: [{ url, fileName, type }] });
  if (!parsed.success) throw new Error('Invalid attachment.');
  const attachment = await mutable(actor, submissionId, courseId, itemId, async tx => {
    await requireOwnedUpload(tx, actor, url);
    const data = { submissionId, url, fileName, type };
    await tx.studentSubmission.update({ where: { id: submissionId }, data: { status: 'DRAFT' } });
    return await tx.submissionAttachment.findFirst({ where: data }) ?? tx.submissionAttachment.create({ data });
  });
  revalidatePath(`/${instituteCode}/courses/${courseId}/classwork/${itemId}`);
  return { success: true, attachmentId: attachment.id, error: undefined as string | undefined };
}
export async function addSubmissionLink(submissionId: string, url: string, fileName: string, instituteCode: string, courseId: string, itemId: string) {
  await requireLegacyActor('classwork/actions.ts#addSubmissionLink', () => ({ institute: instituteCode, courseId, submissionId, itemId }));
  return addAttachment(submissionId, url, fileName, instituteCode, courseId, itemId, 'LINK');
}
export async function addSubmissionFile(submissionId: string, url: string, fileName: string, instituteCode: string, courseId: string, itemId: string) {
  await requireLegacyActor('classwork/actions.ts#addSubmissionFile', () => ({ institute: instituteCode, courseId, submissionId, itemId }));
  return addAttachment(submissionId, url, fileName, instituteCode, courseId, itemId, 'FILE');
}
export async function removeSubmissionAttachment(attachmentId: string, submissionId: string, instituteCode: string, courseId: string, itemId: string) {
  await requireLegacyActor('classwork/actions.ts#removeSubmissionAttachment', () => ({ institute: instituteCode, courseId, submissionId, attachmentId, itemId }));
  await mutable(await student(), submissionId, courseId, itemId, tx => tx.submissionAttachment.deleteMany({ where: { id: attachmentId, submissionId } }));
  revalidatePath(`/${instituteCode}/courses/${courseId}/classwork/${itemId}`);
  return { success: true, error: undefined as string | undefined };
}
export async function returnGrade(submissionId: string, grade: number, privateComment: string | undefined, instituteCode: string, courseId: string, itemId: string) {
  const actor = await requireLegacyActor('classwork/actions.ts#returnGrade', () => ({ institute: instituteCode, courseId, submissionId, itemId }));
  const submission = await db.studentSubmission.findFirst({ where: { id: submissionId, syllabusItemId: itemId, syllabusItem: { courseId } } });
  if (!submission) throw new Error('Submission not found.');
  await gradeSubmission(actor, submissionId, grade, privateComment, courseId);
  revalidatePath(`/${instituteCode}/courses/${courseId}/classwork/${itemId}/submissions`);
  revalidatePath(`/${instituteCode}/courses/${courseId}/gradebook`);
  return { success: true, error: undefined as string | undefined };
}
export async function updateGrade(submissionId: string, grade: number) {
  const actor = await requireLegacyActor('classwork/actions.ts#updateGrade', () => ({ submissionId }));
  await gradeSubmission(actor, submissionId, grade);
  return { success: true, error: undefined as string | undefined };
}
