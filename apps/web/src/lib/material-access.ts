import { db } from './db';
import { requireCourseAccess, type CourseActor } from './course-access';
import { canonicalRole } from './super-user-v1/capabilities';
import { AccessError } from './super-user-v1/actor';

export async function requireMaterialAttachment(actor: CourseActor, attachmentId: string, courseId?: string) {
  if (canonicalRole(actor.role) !== 'STUDENT') throw new AccessError(403, 'Students only.');
  const attachment = await db.attachment.findUnique({ where: { id: attachmentId }, include: { syllabusItem: { include: { targetGroups: { select: { group: { select: { members: { where: { studentId: actor.id }, select: { studentId: true } } } } } } } } } });
  if (!attachment || attachment.type !== 'FILE' || !attachment.syllabusItem || courseId && attachment.syllabusItem.courseId !== courseId) throw new AccessError(404, 'Attachment not found in this course.');
  await requireCourseAccess(actor, attachment.syllabusItem.courseId);
  const groups = attachment.syllabusItem.targetGroups;
  if (groups?.length && !groups.some(target => target.group.members.length)) throw new AccessError(404, 'Attachment not found.');
  return attachment;
}
