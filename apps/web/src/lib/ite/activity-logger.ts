/**
 * apps/web/src/lib/ite/activity-logger.ts
 *
 * ITE-only activity event logger.
 *
 * Rules:
 * - No-op for non-ITE users (checked against DB; result is not cached across calls).
 * - Deduplicates view-type events: at most one per (userId, courseId, type, refId)
 *   within DEDUP_WINDOW_MINUTES.
 * - Never throws or blocks the main action — all errors are caught and logged.
 * - Never generates synthetic/fake events.
 */

import { db } from "@/lib/db";
import type { ActivityEventType } from "@prisma/client";
import {
  ITE_INSTITUTE_CODE,
  DEDUP_WINDOW_MINUTES,
} from "./engagement-config";

export type { ActivityEventType };

/** Event types that are deduplicated within the time window. */
const DEDUP_EVENT_TYPES = new Set<ActivityEventType>([
  "COURSE_VIEW",
  "MATERIAL_VIEW",
  "ANNOUNCEMENT_READ",
]);

interface LogActivityParams {
  userId: string;
  /** Institute ID of the user — optional; looked up from user if omitted */
  instituteId?: string | null;
  courseId?: string | null;
  type: ActivityEventType;
  /** ID of the entity that triggered the event (syllabusItemId, deckId, etc.) */
  refId?: string | null;
}

/**
 * Logs an ITE activity event.
 * - Silently no-ops for non-ITE users.
 * - Deduplicates view-style events within the configured window.
 * - Never throws; always catches errors internally.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    if (!params.userId) return;

    let instituteId = params.instituteId;
    if (!instituteId) {
      const user = await db.user.findUnique({
        where: { id: params.userId },
        select: { instituteId: true },
      });
      instituteId = user?.instituteId ?? null;
    }
    if (!instituteId) return;

    // Guard: only log for ITE users
    const institute = await db.institute.findUnique({
      where: { id: instituteId },
      select: { code: true },
    });
    if (institute?.code?.toLowerCase() !== ITE_INSTITUTE_CODE) return;

    // Deduplication for view-type events
    if (DEDUP_EVENT_TYPES.has(params.type)) {
      const windowStart = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000);
      const existing = await db.activityEvent.findFirst({
        where: {
          userId: params.userId,
          ...(params.courseId ? { courseId: params.courseId } : {}),
          type: params.type,
          ...(params.refId ? { refId: params.refId } : { refId: null }),
          createdAt: { gte: windowStart },
        },
        select: { id: true },
      });
      if (existing) return; // Already logged within dedup window
    }

    await db.activityEvent.create({
      data: {
        userId: params.userId,
        courseId: params.courseId ?? null,
        type: params.type,
        refId: params.refId ?? null,
      },
    });
  } catch (err) {
    // Never crash the calling action
    console.error("[ITE_ACTIVITY_LOG_ERROR]", err);
  }
}
