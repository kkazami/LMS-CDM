/**
 * apps/web/src/lib/ite/focus/service.ts
 *
 * Core domain service for ITE Focus Mode:
 * - Session creation with prior active auto-abandon
 * - Heartbeat & end updates with strict monotonic / wall-clock clamping
 * - 5-minute stale session auto-closure
 * - Manila-time weekly and 7-day stats aggregation
 */

import { db } from "@/lib/db";
import { HttpError } from "@/lib/practicum/http";
import type {
  CreateFocusSessionInput,
  UpdateFocusSessionInput,
  FocusSummaryResponse,
  FocusActor,
  FocusContextType,
} from "./types";
import {
  getManilaWeekRange,
  getManilaSevenDaySeries,
  splitSessionByDay,
} from "./manila-calendar";

const VALID_CONTEXT_TYPES: FocusContextType[] = ["STUDY", "MATERIAL", "FLASHCARDS", "QUIZ"];

/**
 * Validates session creation parameters.
 */
export function validateCreateSessionInput(body: unknown): CreateFocusSessionInput {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "Request body must be an object.");
  }

  const rec = body as Record<string, unknown>;

  if (typeof rec.contextType !== "string" || !VALID_CONTEXT_TYPES.includes(rec.contextType as FocusContextType)) {
    throw new HttpError(400, `contextType must be one of: ${VALID_CONTEXT_TYPES.join(", ")}`);
  }

  const contextType = rec.contextType as FocusContextType;
  const courseId = typeof rec.courseId === "string" && rec.courseId.trim() ? rec.courseId.trim() : null;
  const refId = typeof rec.refId === "string" && rec.refId.trim() ? rec.refId.trim() : null;

  let plannedMinutes: number | null = null;
  if (rec.plannedMinutes !== undefined && rec.plannedMinutes !== null) {
    const parsed = Number(rec.plannedMinutes);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 240) {
      throw new HttpError(400, "plannedMinutes must be an integer between 1 and 240.");
    }
    plannedMinutes = parsed;
  }

  return { contextType, courseId, refId, plannedMinutes };
}

/**
 * Clamps client-reported progress so that:
 * 1. focusedSeconds can NEVER exceed elapsed wall-clock time.
 * 2. focusedSeconds can NEVER decrease below previous recorded value.
 * 3. tabSwitchCount can NEVER decrease below previous recorded value, capped at a sane 10,000 maximum.
 */
export function clampSessionProgress(
  existingSession: { startedAt: Date; focusedSeconds: number; tabSwitchCount: number },
  incoming: { focusedSeconds?: unknown; tabSwitchCount?: unknown },
  now: Date = new Date()
): {
  safeFocusedSeconds: number;
  safeTabSwitchCount: number;
  elapsedWallSeconds: number;
} {
  const elapsedWallSeconds = Math.max(0, Math.floor((now.getTime() - existingSession.startedAt.getTime()) / 1000));

  const clientSeconds = Math.floor(Number(incoming.focusedSeconds) || 0);
  const safeFocusedSeconds = Math.max(
    existingSession.focusedSeconds,
    Math.min(clientSeconds, elapsedWallSeconds)
  );

  const clientTabSwitches = Math.floor(Number(incoming.tabSwitchCount) || 0);
  const safeTabSwitchCount = Math.max(
    existingSession.tabSwitchCount,
    Math.min(10000, clientTabSwitches)
  );

  return { safeFocusedSeconds, safeTabSwitchCount, elapsedWallSeconds };
}

/**
 * Creates a new FocusSession for an ITE student.
 * If the student already has an ACTIVE session, marks it ABANDONED first.
 */
export async function createFocusSession(
  actor: FocusActor,
  input: CreateFocusSessionInput,
  dbClient: typeof db = db
) {
  // If courseId provided, ensure student is an APPROVED enrollee of that course
  if (input.courseId) {
    const enrollment = await dbClient.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId: input.courseId, studentId: actor.userId },
      },
      include: {
        course: { select: { id: true, instituteId: true } },
      },
    });

    if (!enrollment || enrollment.status !== "APPROVED") {
      throw new HttpError(403, "You must be an approved enrolled student in this course.");
    }

    if (enrollment.course.instituteId !== actor.instituteId) {
      throw new HttpError(403, "This course does not belong to your institute.");
    }
  }

  const now = new Date();

  // Mark any currently ACTIVE session as ABANDONED first
  await dbClient.focusSession.updateMany({
    where: {
      userId: actor.userId,
      status: "ACTIVE",
    },
    data: {
      status: "ABANDONED",
      endedAt: now,
    },
  });

  return dbClient.focusSession.create({
    data: {
      userId: actor.userId,
      courseId: input.courseId || null,
      contextType: input.contextType,
      refId: input.refId || null,
      plannedMinutes: input.plannedMinutes || null,
      status: "ACTIVE",
      startedAt: now,
      lastHeartbeatAt: now,
      focusedSeconds: 0,
      tabSwitchCount: 0,
    },
  });
}

/**
 * Updates an ongoing focus session (heartbeat or end).
 */
export async function updateFocusSession(
  sessionId: string,
  actor: FocusActor,
  input: UpdateFocusSessionInput,
  dbClient: typeof db = db,
  now: Date = new Date()
) {
  const existing = await dbClient.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!existing) {
    throw new HttpError(404, "Focus session not found.");
  }

  if (existing.userId !== actor.userId) {
    throw new HttpError(403, "You do not own this focus session.");
  }

  if (existing.status !== "ACTIVE") {
    throw new HttpError(409, "Focus session is no longer active.");
  }

  const { safeFocusedSeconds, safeTabSwitchCount } = clampSessionProgress(existing, input, now);

  if (input.action === "end") {
    return dbClient.focusSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        endedAt: now,
        lastHeartbeatAt: now,
        focusedSeconds: safeFocusedSeconds,
        tabSwitchCount: safeTabSwitchCount,
      },
    });
  }

  // Heartbeat
  return dbClient.focusSession.update({
    where: { id: sessionId },
    data: {
      lastHeartbeatAt: now,
      focusedSeconds: safeFocusedSeconds,
      tabSwitchCount: safeTabSwitchCount,
    },
  });
}

/**
 * Auto-closes any ACTIVE sessions whose lastHeartbeatAt is older than 5 minutes.
 * Preserves the focusedSeconds and tabSwitchCount already recorded.
 */
export async function autoCloseStaleSessions(
  userId: string,
  dbClient: typeof db = db,
  now: Date = new Date()
) {
  const staleThreshold = new Date(now.getTime() - 5 * 60 * 1000);

  return dbClient.focusSession.updateMany({
    where: {
      userId,
      status: "ACTIVE",
      lastHeartbeatAt: { lt: staleThreshold },
    },
    data: {
      status: "ABANDONED",
      endedAt: now,
    },
  });
}

/**
 * Computes a student's private focus statistics based on Manila calendar time.
 */
export async function computeFocusSummary(
  userId: string,
  dbClient: typeof db = db,
  now: Date = new Date()
): Promise<FocusSummaryResponse> {
  // 1. Auto-close stale sessions older than 5 minutes
  await autoCloseStaleSessions(userId, dbClient, now);

  // 2. Compute Manila boundaries
  const { thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd } = getManilaWeekRange(now);
  const sevenDaySlots = getManilaSevenDaySeries(now);

  // 3. Fetch recent sessions
  const [recentSessions, longestCompleted, activeSession] = await Promise.all([
    dbClient.focusSession.findMany({
      where: {
        userId,
        startedAt: { gte: lastWeekStart },
      },
    }),
    dbClient.focusSession.findFirst({
      where: {
        userId,
        status: "COMPLETED",
      },
      orderBy: { focusedSeconds: "desc" },
      select: { focusedSeconds: true },
    }),
    dbClient.focusSession.findFirst({
      where: {
        userId,
        status: "ACTIVE",
      },
      select: { id: true },
    }),
  ]);

  return aggregateFocusSessions(
    recentSessions,
    longestCompleted,
    activeSession?.id ?? null,
    now
  );
}

/**
 * Pure aggregation function for focus sessions using Manila calendar bounds.
 */
export function aggregateFocusSessions(
  recentSessions: Array<{
    startedAt: Date;
    focusedSeconds: number;
    tabSwitchCount: number;
    status: string;
  }>,
  longestCompleted: { focusedSeconds: number } | null,
  activeSessionId: string | null,
  now: Date = new Date()
): FocusSummaryResponse {
  const { thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd } = getManilaWeekRange(now);
  const sevenDaySlots = getManilaSevenDaySeries(now);

  let focusedSecondsThisWeek = 0;
  let focusedSecondsLastWeek = 0;
  let completedSessionsThisWeek = 0;
  let totalTabSwitchesThisWeek = 0;
  let totalSessionsThisWeek = 0;

  // Daily map for the 7-day series: dateKey -> totalSeconds
  const dailySecondsMap = new Map<string, number>();
  for (const slot of sevenDaySlots) {
    dailySecondsMap.set(slot.date, 0);
  }

  for (const s of recentSessions) {
    const isThisWeek = s.startedAt >= thisWeekStart && s.startedAt < thisWeekEnd;
    if (isThisWeek) {
      totalSessionsThisWeek++;
      totalTabSwitchesThisWeek += s.tabSwitchCount;
      if (s.status === "COMPLETED") {
        completedSessionsThisWeek++;
      }
    }

    // Allocate seconds across midnight boundaries in Manila
    const daySplits = splitSessionByDay(s.startedAt, s.focusedSeconds);
    for (const split of daySplits) {
      // Check if chunk falls in this week vs last week
      if (split.startInstant >= thisWeekStart && split.startInstant < thisWeekEnd) {
        focusedSecondsThisWeek += split.focusedSeconds;
      } else if (split.startInstant >= lastWeekStart && split.startInstant < lastWeekEnd) {
        focusedSecondsLastWeek += split.focusedSeconds;
      }

      // 7-day series
      if (dailySecondsMap.has(split.dateKey)) {
        dailySecondsMap.set(
          split.dateKey,
          (dailySecondsMap.get(split.dateKey) || 0) + split.focusedSeconds
        );
      }
    }
  }

  const averageTabSwitchesThisWeek =
    totalSessionsThisWeek > 0
      ? Number((totalTabSwitchesThisWeek / totalSessionsThisWeek).toFixed(1))
      : 0;

  const sevenDaySeries = sevenDaySlots.map((slot) => ({
    date: slot.date,
    label: slot.label,
    focusedMinutes: Math.round((dailySecondsMap.get(slot.date) || 0) / 60),
  }));

  return {
    focusedMinutesThisWeek: Math.round(focusedSecondsThisWeek / 60),
    focusedMinutesLastWeek: Math.round(focusedSecondsLastWeek / 60),
    completedSessionsThisWeek,
    averageTabSwitchesThisWeek,
    longestCompletedSessionMinutes: longestCompleted
      ? Math.round(longestCompleted.focusedSeconds / 60)
      : 0,
    sevenDaySeries,
    activeSessionId,
  };
}
