import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  decideUsage,
  getManilaDayRange,
  type UsageDecision,
  AI_DAILY_LIMIT,
  AI_TEXT_DAILY_LIMIT,
  AI_VOICE_DAILY_LIMIT,
} from "./ai-limits";
import type { AiInputMode, AiModeQuota } from "./ai-types";
import { ensureMockInterviewTablesAndContent } from "./server-db";

export type ReserveResult =
  | {
      ok: true;
      requestId: string;
      remainingToday: number;
      remainingTextToday: number;
      remainingVoiceToday: number;
      resetAt: string;
    }
  | { ok: false; decision: Extract<UsageDecision, { allowed: false }> };

async function executeReservationTx(
  studentId: string,
  now: Date,
  mode: AiInputMode = "text"
): Promise<ReserveResult> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${`mock-interview-ai:${studentId}`}))) AS l`;

    const { startOfDay } = getManilaDayRange(now);
    const since = new Date(Math.min(startOfDay.getTime(), now.getTime() - 60_000));
    const rows = await tx.mockInterviewAiRequest.findMany({
      where: { studentId, createdAt: { gte: since } },
      select: { id: true, createdAt: true },
    });

    const decision = decideUsage(
      rows,
      now,
      AI_DAILY_LIMIT,
      undefined,
      mode
    );
    if (!decision.allowed) return { ok: false as const, decision };

    const prefixedId = `${mode === "voice" ? "voice" : "text"}_${randomUUID()}`;
    const created = await tx.mockInterviewAiRequest.create({
      data: { id: prefixedId, studentId, createdAt: now },
      select: { id: true },
    });
    const nextRemainingToday = Math.max(0, decision.remainingToday - 1);
    const nextRemainingText =
      mode === "text"
        ? Math.min(nextRemainingToday, Math.max(0, decision.remainingTextToday - 1))
        : Math.min(nextRemainingToday, decision.remainingTextToday);
    const nextRemainingVoice =
      mode === "voice"
        ? Math.min(nextRemainingToday, Math.max(0, decision.remainingVoiceToday - 1))
        : Math.min(nextRemainingToday, decision.remainingVoiceToday);

    return {
      ok: true as const,
      requestId: created.id,
      remainingToday: nextRemainingToday,
      remainingTextToday: nextRemainingText,
      remainingVoiceToday: nextRemainingVoice,
      resetAt: decision.resetAt,
    };
  });
}

/**
 * Atomically checks quota + cooldown and records a reservation for one AI evaluation.
 *
 * A per-student Postgres advisory lock serializes concurrent requests across all server
 * instances, so parallel submissions cannot exceed the daily limit or skip the cooldown.
 * If the usage table does not exist yet, it automatically bootstraps via ensureMockInterviewTablesAndContent.
 */
export async function reserveAiEvaluation(
  studentId: string,
  now: Date = new Date(),
  mode: AiInputMode = "text"
): Promise<ReserveResult> {
  try {
    return await executeReservationTx(studentId, now, mode);
  } catch (err) {
    console.warn("Retrying AI evaluation reservation after bootstrap:", err instanceof Error ? err.message : "unknown");
    await ensureMockInterviewTablesAndContent();
    return await executeReservationTx(studentId, now, mode);
  }
}

/** Returns a reservation (used when the AI provider failed, so the student is not charged). */
export async function releaseAiEvaluation(requestId: string, studentId: string): Promise<void> {
  try {
    await db.mockInterviewAiRequest.deleteMany({ where: { id: requestId, studentId } });
  } catch {
    // If the table doesn't exist or query failed, ignore
  }
}

/** Read-only remaining quota per mode for today (does not reserve anything). */
export async function getRemainingQuotaToday(
  studentId: string,
  now: Date = new Date()
): Promise<AiModeQuota> {
  try {
    const { startOfDay } = getManilaDayRange(now);
    const rows = await db.mockInterviewAiRequest.findMany({
      where: { studentId, createdAt: { gte: startOfDay } },
      select: { id: true, createdAt: true },
    });
    const decision = decideUsage(
      rows,
      new Date(now.getTime() + 60_000) // ignore cooldown for a pure quota read
    );
    return {
      remainingTotal: decision.remainingToday,
      remainingText: decision.remainingTextToday,
      remainingVoice: decision.remainingVoiceToday,
    };
  } catch {
    return {
      remainingTotal: AI_DAILY_LIMIT,
      remainingText: AI_TEXT_DAILY_LIMIT,
      remainingVoice: AI_VOICE_DAILY_LIMIT,
    };
  }
}

/** Read-only remaining quota for today (does not reserve anything). */
export async function getRemainingToday(studentId: string, now: Date = new Date()): Promise<number> {
  const quota = await getRemainingQuotaToday(studentId, now);
  return quota.remainingTotal;
}

