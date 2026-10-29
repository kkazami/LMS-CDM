import type { Prisma } from '@prisma/client';
import { AccessError } from '@/lib/super-user-v1/actor';
import { labsAvailable } from '@/lib/labs/readiness';

/** Item locks precede student/attempt locks so linking cannot race academic writes. */
export async function lockSyllabusItem(tx: Prisma.TransactionClient, itemId: string): Promise<void> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "SyllabusItem" WHERE "id" = ${itemId} FOR UPDATE`;
  if (!rows.length) throw new AccessError(404, 'Classwork not found.');
}

export async function assertOrdinaryClasswork(tx: Prisma.TransactionClient, itemId: string): Promise<void> {
  await lockSyllabusItem(tx, itemId);
  if (!await labsAvailable(tx)) return;
  const item = await tx.syllabusItem.findUnique({ where: { id: itemId }, select: { labAssignment: { select: { id: true } } } });
  if (!item) throw new AccessError(404, 'Classwork not found.');
  if (item.labAssignment) throw new AccessError(409, 'Use the guided practical lab workflow for this classwork.');
}

export async function markAcademicWorkStarted(tx: Prisma.TransactionClient, itemId: string, studentId?: string): Promise<void> {
  if (!await labsAvailable(tx)) return;
  await tx.syllabusItem.update({ where: { id: itemId }, data: { workHistoryState: 'STARTED' } });
  if (studentId) await tx.studentSubmission.updateMany({
    where: { syllabusItemId: itemId, studentId }, data: { workHistoryState: 'STARTED' },
  });
}
