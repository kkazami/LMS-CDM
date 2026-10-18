/**
 * apps/web/src/lib/gamification/kx-exp.ts
 *
 * Gamification EXP integration for Knowledge Exchange activities.
 * Wraps grantExp with anti-farming daily caps and idempotency keys.
 */

import { grantExp } from "./grant-exp";
import { KX_EXP_VALUES } from "@/features/knowledge-exchange/constants";

export const KX_EXP_SOURCE = "knowledge-exchange";

/**
 * Award +5 EXP for publishing a question or discussion.
 */
export async function awardExpForQuestion(userId: string, postId: string) {
  return await grantExp({
    userId,
    amount: KX_EXP_VALUES.ASK_QUESTION,
    reason: "Asked question in Knowledge Exchange",
    source: KX_EXP_SOURCE,
    idempotencyKey: `kx-post-${postId}`,
  });
}

/**
 * Award +10 EXP for contributing an answer.
 */
export async function awardExpForAnswer(userId: string, answerId: string) {
  return await grantExp({
    userId,
    amount: KX_EXP_VALUES.ANSWER_QUESTION,
    reason: "Contributed answer in Knowledge Exchange",
    source: KX_EXP_SOURCE,
    idempotencyKey: `kx-answer-${answerId}`,
  });
}

/**
 * Award +15 EXP to the answer author when their answer is accepted.
 */
export async function awardExpForAcceptedAnswer(userId: string, answerId: string) {
  return await grantExp({
    userId,
    amount: KX_EXP_VALUES.ACCEPTED_ANSWER,
    reason: "Answer accepted by question author",
    source: KX_EXP_SOURCE,
    idempotencyKey: `kx-accepted-${answerId}`,
  });
}

/**
 * Award +25 EXP to the answer author when verified by an instructor.
 */
export async function awardExpForVerifiedAnswer(userId: string, answerId: string) {
  return await grantExp({
    userId,
    amount: KX_EXP_VALUES.VERIFIED_ANSWER,
    reason: "Answer verified by instructor",
    source: KX_EXP_SOURCE,
    idempotencyKey: `kx-verified-${answerId}`,
  });
}

/**
 * Award +2 EXP to content author when they receive an upvote.
 * Capped at 20 EXP per day using dailyCap: 20 and idempotency key.
 */
export async function awardExpForUpvote(
  authorId: string,
  voterId: string,
  targetId: string
) {
  // Self-voting is strictly forbidden
  if (authorId === voterId) return null;

  return await grantExp({
    userId: authorId,
    amount: KX_EXP_VALUES.UPVOTE_RECEIVED,
    reason: "Received community upvote in Knowledge Exchange",
    source: "kx-upvote",
    dailyCap: KX_EXP_VALUES.DAILY_UPVOTE_EXP_CAP,
    idempotencyKey: `kx-vote-${voterId}-${targetId}`,
  });
}
