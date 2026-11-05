import { db } from "@/lib/db";
import { decideUsage, getManilaDayRange, type UsageDecision, AI_DAILY_LIMIT } from "./ai-limits";
import { ensureMockInterviewTablesAndContent } from "./server-db";

export type ReserveResult =
  | { ok: true; requestId: string; remainingToday: number; resetAt: string }
  | { ok: false; decision: Extract<UsageDecision, { allowed: false }> };

async function executeReservationTx(studentId: string, now: Date): Promise<ReserveResult> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${`mock-interview-ai:${studentId}`}))) AS l`;

    const { startOfDay } = getManilaDayRange(now);
    const since = new Date(Math.min(startOfDay.getTime(), now.getTime() - 60_000));
    const rows = await tx.mockInterviewAiRequest.findMany({
      where: { studentId, createdAt: { gte: since } },
      select: { createdAt: true },
    });

    const decision = decideUsage(
      rows.map((r) => r.createdAt),
      now
    );
    if (!decision.allowed) return { ok: false as const, decision };

    const created = await tx.mockInterviewAiRequest.create({
      data: { studentId, createdAt: now },
      select: { id: true },
    });
    return {
      ok: true as const,
      requestId: created.id,
      remainingToday: Math.max(0, decision.remainingToday - 1),
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
export async function reserveAiEvaluation(studentId: string, now: Date = new Date()): Promise<ReserveResult> {
  try {
    return await executeReservationTx(studentId, now);
  } catch (err) {
    console.warn("Retrying AI evaluation reservation after bootstrap:", err instanceof Error ? err.message : "unknown");
    await ensureMockInterviewTablesAndContent();
    return await executeReservationTx(studentId, now);
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

/** Read-only remaining quota for today (does not reserve anything). */
export async function getRemainingToday(studentId: string, now: Date = new Date()): Promise<number> {
  try {
    const { startOfDay } = getManilaDayRange(now);
    const rows = await db.mockInterviewAiRequest.findMany({
      where: { studentId, createdAt: { gte: startOfDay } },
      select: { createdAt: true },
    });
    const decision = decideUsage(
      rows.map((r) => r.createdAt),
      new Date(now.getTime() + 60_000) // ignore cooldown for a pure quota read
    );
    return decision.remainingToday;
  } catch {
    return AI_DAILY_LIMIT;
  }
}

