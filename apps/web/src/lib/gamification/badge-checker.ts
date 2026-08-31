/**
 * awardBadgeIfEarned — Awards a badge if the student hasn't already earned it.
 * Idempotent — safe to call multiple times.
 */

import { db } from "@/lib/db";
import { EXP_VALUES } from "./exp-engine";

export async function awardBadgeIfEarned(userId: string, badgeRuleId: string): Promise<boolean> {
  const profile = await db.gamificationProfile.upsert({
    where: { studentId: userId },
    create: { studentId: userId },
    update: {},
    select: { id: true },
  });

  // Check if already earned
  const existing = await db.studentBadge.findUnique({
    where: { profileId_badgeRuleId: { profileId: profile.id, badgeRuleId } },
  });
  if (existing) return false; // Already earned

  // Award the badge
  await db.studentBadge.create({
    data: {
      profileId: profile.id,
      badgeRuleId,
      isNew: true,
    },
  });

  // Grant EXP for earning a badge
  await db.expTransaction.create({
    data: {
      userId,
      amount: EXP_VALUES.badge_earned,
      reason: `Badge earned: ${badgeRuleId}`,
      source: "badge",
    },
  });

  // Increment total points and exp on profile
  await db.gamificationProfile.update({
    where: { id: profile.id },
    data: {
      exp: { increment: EXP_VALUES.badge_earned },
      totalPoints: { increment: EXP_VALUES.badge_earned },
    },
  });

  return true; // Newly awarded
}
