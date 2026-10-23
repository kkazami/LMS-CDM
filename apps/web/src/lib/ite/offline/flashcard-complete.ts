/**
 * apps/web/src/lib/ite/offline/flashcard-complete.ts
 *
 * DB-backed idempotency logic for completing flashcard study sessions.
 * Prevents duplicate EXP grants and duplicate activity logs across serverless instances.
 */

import { db } from "@/lib/db";
import { grantExp, type GrantExpArgs, type GrantExpResult } from "@/lib/gamification/grant-exp";
import { EXP_VALUES, DAILY_EXP_CAPS } from "@/lib/gamification/exp-engine";
import { awardBadgeIfEarned } from "@/lib/gamification/badge-checker";
import { logActivity } from "@/lib/ite/activity-logger";
import { formatNamespacedIdempotencyKey } from "./pure-logic";

export interface CompleteSessionDeps {
  findDeck?: (deckId: string) => Promise<{ id: string; title: string; courseId: string | null } | null>;
  findExistingTx?: (userId: string, namespacedKey: string) => Promise<{ id: string } | null>;
  grantExp?: (args: GrantExpArgs) => Promise<GrantExpResult>;
  awardBadgeIfEarned?: (userId: string, badgeId: string) => Promise<void>;
  logActivity?: (params: Parameters<typeof logActivity>[0]) => Promise<void>;
}

export interface ProcessCompleteSessionParams {
  userId: string;
  instituteId?: string;
  deckId: string;
  cardsReviewed: number;
  durationSeconds: number;
  idempotencyKey?: string | null;
  deps?: CompleteSessionDeps;
}

export interface ProcessCompleteSessionResult {
  status: number;
  body: {
    success?: boolean;
    grantedExp?: number;
    leveledUp?: boolean;
    newLevel?: number;
    duplicate?: boolean;
    message?: string;
  };
  shouldLogActivity: boolean;
  activityParams?: Parameters<typeof logActivity>[0];
}

export async function processCompleteSession({
  userId,
  instituteId,
  deckId,
  cardsReviewed,
  durationSeconds,
  idempotencyKey,
  deps = {},
}: ProcessCompleteSessionParams): Promise<ProcessCompleteSessionResult> {
  const findDeck =
    deps.findDeck ??
    ((id: string) =>
      db.flashcardDeck.findUnique({
        where: { id },
        select: { id: true, title: true, courseId: true },
      }));

  const findExistingTx =
    deps.findExistingTx ??
    ((uid: string, key: string) =>
      db.expTransaction.findFirst({
        where: {
          userId: uid,
          reason: { contains: `[KEY:${key}]` },
        },
        select: { id: true },
      }));

  const doGrantExp = deps.grantExp ?? grantExp;
  const doAwardBadge = deps.awardBadgeIfEarned ?? awardBadgeIfEarned;
  const doLogActivity = deps.logActivity;

  // 1. Validate & namespace idempotency key if provided
  const namespacedKey = formatNamespacedIdempotencyKey(userId, idempotencyKey);

  // 2. DB-backed duplicate check prior to any state mutation
  if (namespacedKey) {
    const existingTx = await findExistingTx(userId, namespacedKey);
    if (existingTx) {
      return {
        status: 200,
        body: {
          success: true,
          grantedExp: 0,
          leveledUp: false,
          newLevel: 1,
          duplicate: true,
        },
        shouldLogActivity: false,
      };
    }
  }

  // 3. Verify deck exists
  const deck = await findDeck(deckId);
  if (!deck) {
    return {
      status: 404,
      body: { message: "Deck not found" },
      shouldLogActivity: false,
    };
  }

  // 4. Minimum engagement threshold (≥3 cards and ≥10 seconds duration)
  let grantedExp = 0;
  let leveledUp = false;
  let newLevel = 1;
  let isDuplicateFromTx = false;

  if (cardsReviewed >= 3 && durationSeconds >= 10) {
    const expRes = await doGrantExp({
      userId,
      amount: EXP_VALUES.flashcard_session,
      reason: `Flashcard Deck Review: ${deck.title}`,
      source: "flashcard",
      courseId: deck.courseId ?? undefined,
      idempotencyKey: namespacedKey ?? undefined,
      dailyCap: DAILY_EXP_CAPS.flashcard,
    });

    // Check if grantExp detected an existing transaction for this idempotency key
    if (namespacedKey && expRes.grantedAmount === 0 && expRes.transactionId) {
      // In a concurrent race condition, grantExp returns the existing transactionId
      isDuplicateFromTx = true;
    }

    grantedExp = expRes.grantedAmount;
    leveledUp = expRes.leveledUp;
    newLevel = expRes.newLevel;

    if (!isDuplicateFromTx) {
      await doAwardBadge(userId, "flashcard-first").catch(() => {});
    }
  }

  if (isDuplicateFromTx) {
    return {
      status: 200,
      body: {
        success: true,
        grantedExp: 0,
        leveledUp: false,
        newLevel,
        duplicate: true,
      },
      shouldLogActivity: false,
    };
  }

  const activityParams: Parameters<typeof logActivity>[0] = {
    userId,
    instituteId,
    courseId: deck.courseId ?? undefined,
    type: "FLASHCARD_REVIEW",
    refId: deck.id,
  };

  // If a mock logger was supplied, call it now
  if (doLogActivity) {
    await doLogActivity(activityParams).catch(() => {});
  }

  return {
    status: 200,
    body: {
      success: true,
      grantedExp,
      leveledUp,
      newLevel,
    },
    shouldLogActivity: true,
    activityParams,
  };
}
