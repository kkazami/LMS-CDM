/**
 * apps/web/src/lib/ite/guidance/rate-limit.ts
 *
 * Daily rate limiting (10 requests per Manila day) and cooldown (5 seconds)
 * for ITE AI Guidance, calculated using Asia/Manila calendar boundaries.
 */

import { db } from "@/lib/db";
import { getManilaDateString, createManilaMidnight } from "@/lib/ite/focus/manila-calendar";
import type { RateLimitCheckResult } from "./types";

export const DAILY_REQUEST_LIMIT = 10;
export const COOLDOWN_SECONDS = 5;

/**
 * Calculates start and end Date for the Manila calendar day containing `now`.
 */
export function getManilaDayRange(now: Date = new Date()): {
  startOfDay: Date;
  nextMidnight: Date;
} {
  const dateStr = getManilaDateString(now);
  const startOfDay = createManilaMidnight(dateStr);

  // Next midnight is +24 hours from Manila midnight
  const nextMidnight = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  return { startOfDay, nextMidnight };
}

/**
 * Pure rate limit calculation function (unit-testable).
 */
export function evaluateRateLimitDecision(
  requestsToday: Array<{ createdAt: Date }>,
  now: Date = new Date(),
  limit: number = DAILY_REQUEST_LIMIT,
  cooldownSeconds: number = COOLDOWN_SECONDS
): RateLimitCheckResult {
  const { startOfDay, nextMidnight } = getManilaDayRange(now);

  // Filter requests that fall strictly within today's Manila calendar day
  const validToday = requestsToday.filter((r) => r.createdAt >= startOfDay && r.createdAt < nextMidnight);
  const countToday = validToday.length;
  const remainingToday = Math.max(0, limit - countToday);

  // Check cooldown: most recent request within cooldown window
  let cooldownActive = false;
  let cooldownSecondsRemaining = 0;

  if (requestsToday.length > 0) {
    // Sort descending
    const sorted = [...requestsToday].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const latest = sorted[0];
    const diffMs = now.getTime() - latest.createdAt.getTime();
    const cooldownMs = cooldownSeconds * 1000;

    if (diffMs < cooldownMs && diffMs >= 0) {
      cooldownActive = true;
      cooldownSecondsRemaining = Math.ceil((cooldownMs - diffMs) / 1000);
    }
  }

  if (countToday >= limit) {
    return {
      allowed: false,
      countToday,
      remainingToday: 0,
      cooldownActive,
      cooldownSecondsRemaining,
      resetAt: nextMidnight.toISOString(),
      reason: "DAILY_LIMIT_EXCEEDED",
    };
  }

  if (cooldownActive) {
    return {
      allowed: false,
      countToday,
      remainingToday,
      cooldownActive: true,
      cooldownSecondsRemaining,
      resetAt: nextMidnight.toISOString(),
      reason: "COOLDOWN_ACTIVE",
    };
  }

  return {
    allowed: true,
    countToday,
    remainingToday,
    cooldownActive: false,
    cooldownSecondsRemaining: 0,
    resetAt: nextMidnight.toISOString(),
  };
}

/**
 * Database-backed rate limit check for an ITE student.
 */
export async function checkGuidanceRateLimit(
  userId: string,
  now: Date = new Date()
): Promise<RateLimitCheckResult> {
  const { startOfDay } = getManilaDayRange(now);

  // Query requests from start of today or within the last minute (for cooldown)
  const sinceDate = new Date(Math.min(startOfDay.getTime(), now.getTime() - 60 * 1000));

  const recentRequests = await db.aiGuidanceRequest.findMany({
    where: {
      userId,
      createdAt: { gte: sinceDate },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return evaluateRateLimitDecision(recentRequests, now);
}
