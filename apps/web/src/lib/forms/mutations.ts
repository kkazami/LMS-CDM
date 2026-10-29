import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { assertOrdinaryClasswork } from '@/lib/academic-task';
import type { CourseActor } from '@/lib/course-access';
import { AccessError } from '@/lib/super-user-v1/actor';
import { requireFormAccess } from './access';

/** Same syllabus lock as attempt creation: edits and starting an assessment serialize. */
export async function lockFormForWrite(tx: Prisma.TransactionClient, actor: CourseActor, courseId: string, formId: string) {
  const reference = await tx.form.findFirst({ where: { id: formId, courseId }, select: { syllabusItemId: true } });
  if (!reference) throw new AccessError(404, 'Form not found.');
  await assertOrdinaryClasswork(tx, reference.syllabusItemId);
  const form = await requireFormAccess(actor, courseId, formId, true, tx);
  if (!form) throw new AccessError(404, 'Form not found.');
  return form;
}

export function editFormDefinition<T>(actor: CourseActor, courseId: string, formId: string, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(async tx => {
    const form = await lockFormForWrite(tx, actor, courseId, formId);
    if (await tx.formAttempt.count({ where: { formId } })) throw new AccessError(409, 'Students have started this assessment. Question content is locked to preserve their work; create a new assessment for different questions.');
    // Hide incomplete autosaved question edits until the instructor publishes again.
    if (form.status === 'PUBLISHED') await tx.form.update({ where: { id: formId }, data: { status: 'DRAFT' } });
    return work(tx);
  });
}
