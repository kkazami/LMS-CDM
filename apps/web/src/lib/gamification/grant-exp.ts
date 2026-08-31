/**
 * grantExp — Atomically award EXP to a user and update their level/tier.
 * Must be called server-side only (API routes or Server Actions).
 *
 * Anti-Abuse Features:
 *   - Prisma transaction to prevent race conditions.
 *   - Idempotency guard via idempotencyKey to block duplicate claims.
 *   - Category Daily Caps (00:00 GMT+8 reset) to limit maximum daily farming per source.
 */

import { db } from "@/lib/db";
import { computeLevelInfo } from "./exp-engine";

export interface GrantExpArgs {
  userId: string;
  amount: number;
  reason: string;
  source: string;
  courseId?: string;
  idempotencyKey?: string;
  dailyCap?: number;
}

export interface GrantExpResult {
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  newExp: number;
  transactionId: string;
  grantedAmount: number;
}

function getPHTMidnight(d: Date = new Date()): Date {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const pht = new Date(utc + 8 * 3600000);
  pht.setHours(0, 0, 0, 0);
  return pht;
}

export async function grantExp({
  userId,
  amount,
  reason,
  source,
  courseId,
  idempotencyKey,
  dailyCap,
}: GrantExpArgs): Promise<GrantExpResult> {
  if (amount <= 0) {
    const profile = await db.gamificationProfile.findUnique({
      where: { studentId: userId },
      select: { exp: true, level: true },
    });
    return {
      previousLevel: profile?.level || 1,
      newLevel: profile?.level || 1,
      leveledUp: false,
      newExp: profile?.exp || 0,
      transactionId: "",
      grantedAmount: 0,
    };
  }

  return await db.$transaction(async (tx) => {
    // 1. Check Idempotency Key if provided (e.g. specific assignment, level, material)
    const formattedReason = idempotencyKey
      ? `[KEY:${idempotencyKey}] ${reason}`
      : reason;

    if (idempotencyKey) {
      const existing = await tx.expTransaction.findFirst({
        where: {
          userId,
          reason: { contains: `[KEY:${idempotencyKey}]` },
        },
        select: { id: true },
      });

      if (existing) {
        const profile = await tx.gamificationProfile.findUnique({
          where: { studentId: userId },
          select: { exp: true, level: true },
        });
        return {
          previousLevel: profile?.level || 1,
          newLevel: profile?.level || 1,
          leveledUp: false,
          newExp: profile?.exp || 0,
          transactionId: existing.id,
          grantedAmount: 0,
        };
      }
    }

    // 2. Enforce Daily Category Cap (PST / GMT+8 midnight reset)
    let finalAmount = amount;
    if (dailyCap && dailyCap > 0) {
      const todayStart = getPHTMidnight();
      const agg = await tx.expTransaction.aggregate({
        where: {
          userId,
          source,
          createdAt: { gte: todayStart },
        },
        _sum: { amount: true },
      });

      const todayTotal = agg._sum.amount || 0;
      if (todayTotal >= dailyCap) {
        const profile = await tx.gamificationProfile.findUnique({
          where: { studentId: userId },
          select: { exp: true, level: true },
        });
        return {
          previousLevel: profile?.level || 1,
          newLevel: profile?.level || 1,
          leveledUp: false,
          newExp: profile?.exp || 0,
          transactionId: "",
          grantedAmount: 0,
        };
      }

      finalAmount = Math.min(amount, dailyCap - todayTotal);
      if (finalAmount <= 0) {
        const profile = await tx.gamificationProfile.findUnique({
          where: { studentId: userId },
          select: { exp: true, level: true },
        });
        return {
          previousLevel: profile?.level || 1,
          newLevel: profile?.level || 1,
          leveledUp: false,
          newExp: profile?.exp || 0,
          transactionId: "",
          grantedAmount: 0,
        };
      }
    }

    // 3. Ensure GamificationProfile exists (upsert)
    const profile = await tx.gamificationProfile.upsert({
      where: { studentId: userId },
      create: {
        studentId: userId,
        exp: 0,
        level: 1,
        levelTier: "newcomer",
      },
      update: {},
      select: { id: true, exp: true, level: true },
    });

    const previousLevel = profile.level;
    const newExp = Math.max(0, profile.exp + finalAmount);
    const levelInfo = computeLevelInfo(newExp);

    // 4. Update EXP and level
    await tx.gamificationProfile.update({
      where: { studentId: userId },
      data: {
        exp: newExp,
        level: levelInfo.level,
        levelTier: levelInfo.tier,
        totalPoints: { increment: Math.max(0, finalAmount) },
      },
    });

    // 5. Log the transaction
    const transaction = await tx.expTransaction.create({
      data: {
        userId,
        amount: finalAmount,
        reason: formattedReason,
        source,
        courseId: courseId ?? null,
      },
    });

    return {
      previousLevel,
      newLevel: levelInfo.level,
      leveledUp: levelInfo.level > previousLevel,
      newExp,
      transactionId: transaction.id,
      grantedAmount: finalAmount,
    };
  });
}
