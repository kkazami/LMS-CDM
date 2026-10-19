import type { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';

/** Required access/mutation audit must succeed in the caller's transaction. */
export async function audit(tx: Prisma.TransactionClient, input: {
  actorId: string; actorSessionId: string; targetId: string; action: string; instituteId: string;
  beforeActive?: boolean; afterActive?: boolean; courseId?: string;
}) {
  return tx.auditLog.create({ data: {
    adminId: input.actorId, targetId: input.targetId, action: input.action,
    metadata: JSON.stringify({
      instituteId: input.instituteId,
      sessionReferenceSHA256: createHash('sha256').update(input.actorSessionId).digest('hex'),
      correlationId: randomUUID(), result: 'SUCCESS',
      ...(input.courseId ? { courseId: input.courseId } : {}),
      ...(input.beforeActive === undefined ? {} : { beforeActive: input.beforeActive }),
      ...(input.afterActive === undefined ? {} : { afterActive: input.afterActive }),
    }),
  } });
}
