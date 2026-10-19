import type { Prisma } from '@prisma/client';

/** All account writers and session admission take the same ordered row locks. */
export async function lockAccounts(tx: Prisma.TransactionClient, ids: readonly string[]) {
  for (const id of [...new Set(ids)].sort()) {
    await tx.$queryRaw`SELECT id FROM public."User" WHERE id = ${id} FOR UPDATE`;
  }
}
