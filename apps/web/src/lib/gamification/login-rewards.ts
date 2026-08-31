/**
 * Processes daily login rewards. Call once per session creation / dashboard load.
 * Safe to call multiple times — the DB ensures idempotency via lastDailyRewardAt.
 * Resets at 12:00 AM PST (Philippine Standard Time, GMT+8).
 */

import { db } from "@/lib/db";
import { grantExp } from "./grant-exp";
import { EXP_VALUES } from "./exp-engine";
import { awardBadgeIfEarned } from "./badge-checker";

/**
 * Returns a Date object representing 00:00:00 in PST/PHT (GMT+8)
 */
export function getPHTMidnight(d: Date = new Date()): Date {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const pht = new Date(utc + 8 * 3600000);
  pht.setHours(0, 0, 0, 0);
  return pht;
}

/**
 * Returns today's date string formatted as "YYYY-MM-DD" in GMT+8
 */
export function getPHTDateString(d: Date = new Date()): string {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const pht = new Date(utc + 8 * 3600000);
  return pht.toISOString().slice(0, 10);
}

export async function processLoginReward(userId: string): Promise<{ rewarded: boolean; streak: number }> {
  const today = getPHTMidnight();

  const profile = await db.gamificationProfile.findUnique({
    where: { studentId: userId },
    select: {
      id: true,
      lastLoginDate: true,
      lastDailyRewardAt: true,
      loginStreakCurrent: true,
      loginStreakLongest: true,
      totalLoginDays: true,
    },
  });

  // If no profile, create it (first ever login)
  if (!profile) {
    await db.gamificationProfile.create({
      data: {
        studentId: userId,
        lastLoginDate: today,
        loginStreakCurrent: 1,
        loginStreakLongest: 1,
        totalLoginDays: 1,
        lastDailyRewardAt: today,
      },
    });
    await grantExp({ userId, amount: EXP_VALUES.login_daily, reason: "First login! Welcome!", source: "daily_login" });
    await awardBadgeIfEarned(userId, "first-day");
    return { rewarded: true, streak: 1 };
  }

  // Check if already rewarded today in GMT+8
  if (profile.lastDailyRewardAt) {
    const lastReward = getPHTMidnight(new Date(profile.lastDailyRewardAt));
    if (lastReward.getTime() === today.getTime()) {
      return { rewarded: false, streak: Math.max(1, profile.loginStreakCurrent) };
    }
  }

  // Calculate streak
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const lastRewardDate = profile.lastDailyRewardAt ? getPHTMidnight(new Date(profile.lastDailyRewardAt)) : null;

  const isConsecutive = lastRewardDate ? lastRewardDate.getTime() === yesterday.getTime() : false;
  const newStreak = isConsecutive ? profile.loginStreakCurrent + 1 : 1;
  const newLongest = Math.max(newStreak, profile.loginStreakLongest);

  await db.gamificationProfile.update({
    where: { studentId: userId },
    data: {
      lastLoginDate: today,
      loginStreakCurrent: newStreak,
      loginStreakLongest: newLongest,
      totalLoginDays: { increment: 1 },
      lastDailyRewardAt: today,
    },
  });

  // Grant EXP
  await grantExp({ userId, amount: EXP_VALUES.login_daily, reason: `Daily login (Day ${newStreak})`, source: "daily_login" });

  // Streak bonuses
  if (newStreak === 7) await grantExp({ userId, amount: EXP_VALUES.login_streak_7, reason: "7-Day Login Streak!", source: "daily_login" });
  if (newStreak === 30) await grantExp({ userId, amount: EXP_VALUES.login_streak_30, reason: "30-Day Login Streak!", source: "daily_login" });

  // Badge checks
  if (newStreak >= 3) await awardBadgeIfEarned(userId, "login-streak-3");
  if (newStreak >= 7) await awardBadgeIfEarned(userId, "login-streak-7");
  if (newStreak >= 14) await awardBadgeIfEarned(userId, "login-streak-14");
  if (newStreak >= 30) await awardBadgeIfEarned(userId, "login-streak-30");
  if (profile.totalLoginDays + 1 >= 100) await awardBadgeIfEarned(userId, "login-days-100");

  return { rewarded: true, streak: newStreak };
}
