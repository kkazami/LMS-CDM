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
 * Returns date string formatted as "YYYY-MM-DD" in PST/PHT (GMT+8 / Asia/Manila)
 */
export function getPHTDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(d);
}

/**
 * Returns yesterday's date string formatted as "YYYY-MM-DD" relative to d in Asia/Manila
 */
export function getPHTYesterdayString(d: Date = new Date()): string {
  const todayStr = getPHTDateString(d);
  const [y, m, day] = todayStr.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, day - 1));
  return prev.toISOString().slice(0, 10);
}

/**
 * Returns a Date object representing 00:00:00 in PST/PHT (GMT+8)
 */
export function getPHTMidnight(d: Date = new Date()): Date {
  const dateStr = getPHTDateString(d);
  return new Date(`${dateStr}T00:00:00+08:00`);
}

export async function processLoginReward(userId: string): Promise<{ rewarded: boolean; streak: number }> {
  const now = new Date();
  const todayStr = getPHTDateString(now);
  const yesterdayStr = getPHTYesterdayString(now);

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
        lastLoginDate: now,
        loginStreakCurrent: 1,
        loginStreakLongest: 1,
        totalLoginDays: 1,
        lastDailyRewardAt: now,
      },
    });
    await grantExp({ userId, amount: EXP_VALUES.login_daily, reason: "First login! Welcome!", source: "daily_login" });
    await awardBadgeIfEarned(userId, "first-day");
    return { rewarded: true, streak: 1 };
  }

  // Check if already rewarded today in GMT+8 (PHT)
  if (profile.lastDailyRewardAt) {
    const lastRewardStr = getPHTDateString(new Date(profile.lastDailyRewardAt));
    if (lastRewardStr === todayStr) {
      return { rewarded: false, streak: Math.max(1, profile.loginStreakCurrent) };
    }
  }

  // Calculate streak based on yesterday in PHT
  const lastRewardStr = profile.lastDailyRewardAt ? getPHTDateString(new Date(profile.lastDailyRewardAt)) : null;
  const isConsecutive = lastRewardStr === yesterdayStr;
  const newStreak = isConsecutive ? profile.loginStreakCurrent + 1 : 1;
  const newLongest = Math.max(newStreak, profile.loginStreakLongest);

  await db.gamificationProfile.update({
    where: { studentId: userId },
    data: {
      lastLoginDate: now,
      loginStreakCurrent: newStreak,
      loginStreakLongest: newLongest,
      totalLoginDays: { increment: 1 },
      lastDailyRewardAt: now,
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
