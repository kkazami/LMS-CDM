import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { AccessError } from './super-user-v1/actor';

// Reuse the existing receipt table; the write and receipt commit together.
export async function studentMutationReceipt<T>(userId: string, operation: string, key: string | null, payload: unknown, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  if (key !== null && !/^[\x21-\x7e]{1,128}$/.test(key)) throw new AccessError(400, 'Invalid operation key.');
  const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const receiptId = key ? hash([operation, userId, key]) : null;
  const requestHash = hash(payload);
  return db.$transaction(async tx => {
    if (receiptId) {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${receiptId}, 0))`;
      const previous = await tx.submissionRequest.findUnique({ where: { id: receiptId } });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new AccessError(409, 'This operation key was used for different work.');
        return previous.response as T;
      }
    }
    const response = await work(tx);
    if (receiptId) await tx.submissionRequest.create({ data: { id: receiptId, userId, requestHash, response: JSON.parse(JSON.stringify(response)) as Prisma.InputJsonValue } });
    return response;
  });
}
