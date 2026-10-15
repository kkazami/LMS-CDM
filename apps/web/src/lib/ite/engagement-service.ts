/**
 * apps/web/src/lib/ite/engagement-service.ts
 *
 * Computes a per-student, per-course engagement score from real ActivityEvent data.
 *
 * This is a pure, unit-testable function — no HTTP calls, no side effects.
 * All weights and thresholds come from engagement-config.ts.
 */

import { db } from "@/lib/db";
import type { ActivityEventType } from "@prisma/client";
import {
  ENGAGEMENT_WINDOW_DAYS,
  ENGAGEMENT_WEIGHTS,
  MAX_LEARNING_ACTIONS_FOR_FULL_SCORE,
  RECENCY_FULL_DAYS,
  RECENCY_ZERO_DAYS,
  TREND_DELTA_THRESHOLD,
} from "./engagement-config";

// ─── Public types ──────────────────────────────────────────────────────────

export type EngagementTrend = "UP" | "FLAT" | "DOWN";

export interface DailyActivityPoint {
  date: string; // ISO date "YYYY-MM-DD"
  count: number;
}

export interface EngagementComponents {
  /** 0–100: proportion of active days in the 14-day window */
  activeDays: number | "insufficient_data";
  /** 0–100: on-time submission rate. "insufficient_data" when no tasks were due */
  onTimeRate: number | "insufficient_data";
  /** 0–100: scaled count of learning actions in the window */
  learningActions: number;
  /** 0–100: recency bonus (100 = active today, 0 = inactive ≥ 14 days) */
  recencyScore: number;
}

export interface EngagementResult {
  /** Composite engagement score 0–100 */
  score: number;
  components: EngagementComponents;
  /** 14-day daily activity series (includes days with 0 events) */
  dailySeries: DailyActivityPoint[];
  trend: EngagementTrend;
  /** Last recorded activity (null if no events at all) */
  lastActivityAt: Date | null;
}

// ─── Learning action types ─────────────────────────────────────────────────

const LEARNING_ACTION_TYPES: ActivityEventType[] = [
  "MATERIAL_VIEW",
  "QUIZ_ATTEMPT",
  "FLASHCARD_REVIEW",
  "MEETING_JOIN",
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDailySeries(events: { createdAt: Date }[], windowDays: number): DailyActivityPoint[] {
  const now = new Date();
  const series: DailyActivityPoint[] = [];
  const countMap = new Map<string, number>();

  for (const ev of events) {
    const key = toDateString(ev.createdAt);
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = toDateString(d);
    series.push({ date: key, count: countMap.get(key) ?? 0 });
  }
  return series;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ─── Core computation ──────────────────────────────────────────────────────

/**
 * Computes the engagement score for a student in a course over the last 14 days.
 *
 * Designed to be pure/testable — accepts raw data arrays so tests can inject
 * arbitrary events and submissions without needing a live database.
 */
export function computeEngagementFromData(params: {
  events: { createdAt: Date; type: ActivityEventType }[];
  submissions: { submittedAt: Date | null; syllabusItem: { dueDate: Date | null } }[];
  enrolledAt: Date;
  now?: Date;
}): EngagementResult {
  const now = params.now ?? new Date();
  const windowStart = new Date(now.getTime() - ENGAGEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const prevWindowStart = new Date(windowStart.getTime() - ENGAGEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const windowEvents = params.events.filter((e) => e.createdAt >= windowStart && e.createdAt <= now);
  const prevWindowEvents = params.events.filter((e) => e.createdAt >= prevWindowStart && e.createdAt < windowStart);

  // ── Active days ────────────────────────────────────────────
  const activeDaySet = new Set(windowEvents.map((e) => toDateString(e.createdAt)));
  const activeDaysRaw = activeDaySet.size;
  const activeDaysScore = clamp((activeDaysRaw / ENGAGEMENT_WINDOW_DAYS) * 100, 0, 100);

  // ── On-time submission rate ────────────────────────────────
  // Only count tasks with due dates within the 14-day window
  const dueTasks = params.submissions.filter(
    (s) => s.syllabusItem.dueDate && new Date(s.syllabusItem.dueDate) >= windowStart && new Date(s.syllabusItem.dueDate) <= now
  );
  let onTimeRateScore: number | "insufficient_data";
  if (dueTasks.length === 0) {
    onTimeRateScore = "insufficient_data";
  } else {
    const onTime = dueTasks.filter(
      (s) => s.submittedAt && s.syllabusItem.dueDate && new Date(s.submittedAt) <= new Date(s.syllabusItem.dueDate)
    ).length;
    onTimeRateScore = clamp((onTime / dueTasks.length) * 100, 0, 100);
  }

  // ── Learning actions ───────────────────────────────────────
  const learningActionCount = windowEvents.filter((e) =>
    LEARNING_ACTION_TYPES.includes(e.type)
  ).length;
  const learningActionsScore = clamp(
    (learningActionCount / MAX_LEARNING_ACTIONS_FOR_FULL_SCORE) * 100,
    0,
    100
  );

  // ── Recency (days since last activity) ────────────────────
  const allEventDates = params.events.map((e) => e.createdAt);
  const lastActivityAt = allEventDates.length > 0 ? new Date(Math.max(...allEventDates.map((d) => d.getTime()))) : null;
  let recencyScore = 0;
  if (lastActivityAt) {
    const daysSince = (now.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince <= RECENCY_FULL_DAYS) {
      recencyScore = 100;
    } else if (daysSince >= RECENCY_ZERO_DAYS) {
      recencyScore = 0;
    } else {
      recencyScore = clamp(
        ((RECENCY_ZERO_DAYS - daysSince) / (RECENCY_ZERO_DAYS - RECENCY_FULL_DAYS)) * 100,
        0,
        100
      );
    }
  }

  // ── Composite score ────────────────────────────────────────
  // Exclude "insufficient_data" components from weighting
  let totalWeight = 0;
  let weightedSum = 0;

  const addComponent = (value: number | "insufficient_data", weight: number) => {
    if (value !== "insufficient_data") {
      weightedSum += value * weight;
      totalWeight += weight;
    }
  };

  addComponent(activeDaysScore, ENGAGEMENT_WEIGHTS.activeDays);
  addComponent(onTimeRateScore, ENGAGEMENT_WEIGHTS.onTimeRate);
  addComponent(learningActionsScore, ENGAGEMENT_WEIGHTS.learningActions);
  addComponent(recencyScore, ENGAGEMENT_WEIGHTS.recencyPenalty);

  const score = totalWeight > 0 ? clamp(Math.round(weightedSum / totalWeight), 0, 100) : 0;

  // ── Trend (compare to previous 14-day window) ──────────────
  const prevActiveDays = new Set(prevWindowEvents.map((e) => toDateString(e.createdAt))).size;
  const prevLearningActions = prevWindowEvents.filter((e) => LEARNING_ACTION_TYPES.includes(e.type)).length;
  const prevActiveDaysScore = clamp((prevActiveDays / ENGAGEMENT_WINDOW_DAYS) * 100, 0, 100);
  const prevLearningScore = clamp((prevLearningActions / MAX_LEARNING_ACTIONS_FOR_FULL_SCORE) * 100, 0, 100);
  const prevScore = Math.round((prevActiveDaysScore * ENGAGEMENT_WEIGHTS.activeDays + prevLearningScore * ENGAGEMENT_WEIGHTS.learningActions) /
    (ENGAGEMENT_WEIGHTS.activeDays + ENGAGEMENT_WEIGHTS.learningActions));

  const delta = score - prevScore;
  let trend: EngagementTrend = "FLAT";
  if (delta >= TREND_DELTA_THRESHOLD) trend = "UP";
  else if (delta <= -TREND_DELTA_THRESHOLD) trend = "DOWN";

  // ── Daily series ───────────────────────────────────────────
  const dailySeries = buildDailySeries(windowEvents, ENGAGEMENT_WINDOW_DAYS);

  return {
    score,
    components: {
      activeDays: activeDaysScore,
      onTimeRate: onTimeRateScore,
      learningActions: learningActionsScore,
      recencyScore,
    },
    dailySeries,
    trend,
    lastActivityAt,
  };
}

/**
 * Database-connected version of computeEngagement.
 * Fetches events and submissions then delegates to the pure function.
 */
export async function computeEngagement(
  studentId: string,
  courseId: string
): Promise<EngagementResult> {
  const now = new Date();
  const twoWindowsBack = new Date(now.getTime() - 2 * ENGAGEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [events, submissions, enrollment] = await Promise.all([
    db.activityEvent.findMany({
      where: {
        userId: studentId,
        courseId,
        createdAt: { gte: twoWindowsBack },
      },
      select: { createdAt: true, type: true },
      orderBy: { createdAt: "asc" },
    }),
    db.studentSubmission.findMany({
      where: {
        studentId,
        syllabusItem: { courseId },
      },
      select: {
        submittedAt: true,
        syllabusItem: { select: { dueDate: true } },
      },
    }),
    db.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
      select: { createdAt: true },
    }),
  ]);

  return computeEngagementFromData({
    events,
    submissions,
    enrolledAt: enrollment?.createdAt ?? now,
    now,
  });
}
