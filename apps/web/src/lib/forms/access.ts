import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireCourseAccess, type CourseActor } from '@/lib/course-access';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { AccessError } from '@/lib/super-user-v1/actor';
import { formIsVisible } from './availability';

export async function requireFormAccess(actor: CourseActor, courseId: string, formId?: string, teaching = false, client: Prisma.TransactionClient = db) {
  await requireCourseAccess(actor, courseId, teaching, client);
  if (!formId) return;
  const form = await client.form.findFirst({ where: { id: formId, courseId }, include: { syllabusItem: { select: { targetGroups: { select: { group: { select: { members: { where: { studentId: actor.id }, select: { studentId: true } } } } } } } } } });
  if (!form) throw new AccessError(404, 'Form not found.');
  if (canonicalRole(actor.role) === 'STUDENT') {
    if (!formIsVisible(form) || form.syllabusItem.targetGroups.length && !form.syllabusItem.targetGroups.some(target => target.group.members.length)) throw new AccessError(404, 'Form not found.');
  }
  return form;
}
