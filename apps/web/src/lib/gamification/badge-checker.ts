import { db } from '@/lib/db';
import { grantExp } from './grant-exp';
import { EXP_VALUES } from './exp-engine';
import type { Prisma } from '@prisma/client';

export async function awardBadgeIfEarned(userId: string, badgeRuleId: string, transaction?: Prisma.TransactionClient): Promise<boolean> {
  const award = async (tx: Prisma.TransactionClient) => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${JSON.stringify(['exp', userId])}, 0))`;
    const profile = await tx.gamificationProfile.upsert({ where: { studentId: userId }, create: { studentId: userId }, update: {}, select: { id: true } });
    const created = await tx.studentBadge.createMany({ data: [{ profileId: profile.id, badgeRuleId, isNew: true }], skipDuplicates: true });
    if (!created.count) return false;
    await grantExp({ userId, amount: EXP_VALUES.badge_earned, reason: `Badge earned: ${badgeRuleId}`, source: 'badge', idempotencyKey: `badge:${badgeRuleId}` }, tx);
    return true;
  };
  return transaction ? award(transaction) : db.$transaction(award);
}
