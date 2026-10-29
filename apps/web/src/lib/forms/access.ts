import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { requireCourseAccess, type CourseActor } from '@/lib/course-access';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { AccessError } from '@/lib/super-user-v1/actor';
import { formIsVisible } from './availability';

/** Schedule metadata only; never select question text, descriptions, passwords or answers. */
export async function scheduledForm(actor: CourseActor, courseId: string, formId: string, now = new Date(), client: Prisma.TransactionClient = db) {
  if (canonicalRole(actor.role) !== 'STUDENT') return null;
  const metadata = await client.form.findFirst({
    where: {
      id: formId, courseId, status: 'PUBLISHED', opensAt: { gt: now },
      syllabusItem: { OR: [
        { targetGroups: { none: {} } },
        { targetGroups: { some: { group: { members: { some: { studentId: actor.id } } } } } },
      ] },
    },
    select: { title: true, formType: true, opensAt: true, closesAt: true },
  });
  if (!metadata) return null;
  try { await requireCourseAccess(actor, courseId, false, client); }
  catch (error) { if (error instanceof AccessError && [403, 404].includes(error.status)) return null; throw error; }
  return metadata;
}

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
