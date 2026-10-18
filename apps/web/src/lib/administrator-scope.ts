import { db } from '@/lib/db';
import { AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole, supportedInstitute } from '@/lib/super-user-v1/capabilities';

type Administrator = { id: string; role: string; instituteId: string };

export async function administratorInstitute(actor: Administrator, code?: string | null) {
  if (canonicalRole(actor.role) !== 'ADMIN') throw new AccessError(403, 'Administrator required.');
  const institute = await db.institute.findUnique({ where: { id: actor.instituteId }, select: { id: true, code: true } });
  if (!institute || !supportedInstitute(institute.code) || code && code.toLowerCase() !== institute.code) throw new AccessError(403, 'Forbidden institute.');
  return institute;
}

export async function administratorTarget(actor: Administrator, userId: string) {
  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, instituteId: true, role: true, credentialProvisioningState: true } });
  if (!target || target.instituteId !== actor.instituteId) throw new AccessError(404, 'Account not found.');
  if (target.id === actor.id || !['INSTRUCTOR', 'STUDENT'].includes(canonicalRole(target.role))) throw new AccessError(403, 'Only instructors and students in your institute may be managed.');
  return target;
}

export async function administratorCourse(actor: Administrator, courseId: string) {
  const course = await db.course.findUnique({ where: { id: courseId }, select: { id: true, instituteId: true, instructorId: true } });
  if (!course || course.instituteId !== actor.instituteId) throw new AccessError(404, 'Course not found.');
  return course;
}

export async function administratorInstructor(actor: Administrator, instructorId: string) {
  const target = await administratorTarget(actor, instructorId);
  if (canonicalRole(target.role) !== 'INSTRUCTOR') throw new AccessError(403, 'Instructor required.');
  return target;
}

export type AdministratorScope = {
  institute?: string; courseId?: string; courseIds?: string[]; syllabusItemId?: string;
  itemId?: string; submissionId?: string; attachmentId?: string; announcementId?: string;
  groupId?: string; studentId?: string; studentIds?: string[]; recipientId?: string;
};

/** Resolve each independent target; a valid course claim cannot mask a foreign item. */
export async function checkAdministratorScope(actor: Administrator, scope: AdministratorScope) {
  await administratorInstitute(actor, scope.institute);
  const courseIds = [...(scope.courseIds ?? []), ...(scope.courseId ? [scope.courseId] : [])];
  const accountIds = [...(scope.studentIds ?? []), ...[scope.studentId, scope.recipientId].filter((id): id is string => Boolean(id))];
  if (courseIds.length > 1000 || accountIds.length > 1000) throw new AccessError(400, 'Too many targets.');
  for (const id of accountIds) await administratorTarget(actor, id);
  for (const id of [scope.itemId, scope.syllabusItemId]) if (id) {
    const item = await db.syllabusItem.findUnique({ where: { id }, select: { courseId: true } });
    if (!item) throw new AccessError(404, 'Activity not found.');
    courseIds.push(item.courseId);
  }
  let submissionId = scope.submissionId;
  if (scope.attachmentId) {
    const attachment = await db.submissionAttachment.findUnique({ where: { id: scope.attachmentId }, select: { submissionId: true } });
    if (!attachment || submissionId && attachment.submissionId !== submissionId) throw new AccessError(404, 'Attachment not found.');
    submissionId = attachment.submissionId;
  }
  if (submissionId) {
    const submission = await db.studentSubmission.findUnique({ where: { id: submissionId }, select: { syllabusItem: { select: { courseId: true } }, student: { select: { instituteId: true } } } });
    if (!submission || submission.student.instituteId !== actor.instituteId) throw new AccessError(404, 'Submission not found.');
    courseIds.push(submission.syllabusItem.courseId);
  }
  if (scope.announcementId) {
    const item = await db.announcement.findUnique({ where: { id: scope.announcementId }, select: { courseId: true } });
    if (!item) throw new AccessError(404, 'Announcement not found.');
    courseIds.push(item.courseId);
  }
  if (scope.groupId) {
    const group = await db.studentGroup.findUnique({ where: { id: scope.groupId }, select: { courseId: true } });
    if (!group) throw new AccessError(404, 'Group not found.');
    courseIds.push(group.courseId);
  }
  for (const id of new Set(courseIds)) await administratorCourse(actor, id);
}
