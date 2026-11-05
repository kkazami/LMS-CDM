/**
 * Pure (database-free) validation and quota decision logic for Mock Interview AI evaluation.
 * Kept free of server imports so it is unit-testable and safe to share.
 */

import { createManilaMidnight, getManilaDateString } from "@/lib/ite/focus/manila-calendar";
import {
  AI_COOLDOWN_SECONDS,
  AI_DAILY_LIMIT,
  AI_MAX_CHARS,
  AI_MIN_WORDS,
} from "./ai-types";

export { AI_COOLDOWN_SECONDS, AI_DAILY_LIMIT, AI_MAX_CHARS, AI_MIN_WORDS };

// ---------------------------------------------------------------------------
// Answer validation
// ---------------------------------------------------------------------------

export type AnswerValidationCode =
  | "EMPTY"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "REPEATED_CHARACTERS"
  | "LOW_VARIETY"
  | "NOT_TEXT";

export type AnswerValidation =
  | { ok: true; answer: string; wordCount: number }
  | { ok: false; code: AnswerValidationCode; message: string };

/** Trims, normalizes line endings and strips control characters (keeps newlines and tabs). */
export function normalizeAnswer(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const REPEATED_RUN = /(\p{L})\1{7,}/u; // same letter 8+ times in a row ("aaaaaaaa")

/**
 * Validates an answer before any AI call is made. Intentionally lenient: it only blocks
 * obvious junk (single repeated letters, near-zero word variety, symbol spam, keyboard mash),
 * not short vocabulary, technical terms, names or non-native English.
 */
export function validateAnswer(raw: unknown): AnswerValidation {
  if (typeof raw !== "string") {
    return { ok: false, code: "EMPTY", message: "Please write an answer before requesting an evaluation." };
  }
  const answer = normalizeAnswer(raw);
  if (!answer) {
    return { ok: false, code: "EMPTY", message: "Please write an answer before requesting an evaluation." };
  }
  if (answer.length > AI_MAX_CHARS) {
    return {
      ok: false,
      code: "TOO_LONG",
      message: `Your answer is too long. Please keep it within ${AI_MAX_CHARS} characters.`,
    };
  }

  const wordCount = countWords(answer);
  if (wordCount < AI_MIN_WORDS) {
    return {
      ok: false,
      code: "TOO_SHORT",
      message: `Please write at least ${AI_MIN_WORDS} words so the AI has enough to evaluate.`,
    };
  }

  const letters = (answer.match(/\p{L}/gu) ?? []).length;
  if (letters / answer.length < 0.5) {
    return {
      ok: false,
      code: "NOT_TEXT",
      message: "Your answer should be written in sentences, not mostly symbols or numbers.",
    };
  }

  if (REPEATED_RUN.test(answer)) {
    return {
      ok: false,
      code: "REPEATED_CHARACTERS",
      message: "Your answer looks like repeated characters. Please write a real response.",
    };
  }

  const words = answer.toLowerCase().split(/\s+/);
  const unique = new Set(words);
  if (unique.size / words.length < 0.3) {
    return {
      ok: false,
      code: "LOW_VARIETY",
      message: "Your answer repeats the same words. Please explain your idea in your own words.",
    };
  }

  // Keyboard mash: most "words" are very long unbroken strings (URLs are tolerated up to a point).
  const mashWords = words.filter((w) => w.length >= 20).length;
  if (mashWords / words.length > 0.5) {
    return {
      ok: false,
      code: "LOW_VARIETY",
      message: "Your answer does not look like readable sentences. Please rewrite it.",
    };
  }

  return { ok: true, answer, wordCount };
}

// ---------------------------------------------------------------------------
// Manila-day quota + cooldown decision
// ---------------------------------------------------------------------------

export function getManilaDayRange(now: Date = new Date()): { startOfDay: Date; nextMidnight: Date } {
  const startOfDay = createManilaMidnight(getManilaDateString(now));
  return { startOfDay, nextMidnight: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) };
}

export type UsageDecision =
  | { allowed: true; countToday: number; remainingToday: number; resetAt: string }
  | {
      allowed: false;
      reason: "DAILY_LIMIT_EXCEEDED" | "COOLDOWN_ACTIVE";
      countToday: number;
      remainingToday: number;
      retryAfterSeconds: number;
      resetAt: string;
    };

/**
 * Decides whether another AI evaluation is allowed given previous reservation timestamps.
 * Daily limit is evaluated first; the cooldown applies to the most recent reservation.
 */
export function decideUsage(
  createdAts: Date[],
  now: Date = new Date(),
  limit: number = AI_DAILY_LIMIT,
  cooldownSeconds: number = AI_COOLDOWN_SECONDS
): UsageDecision {
  const { startOfDay, nextMidnight } = getManilaDayRange(now);
  const today = createdAts.filter((d) => d >= startOfDay && d < nextMidnight);
  const countToday = today.length;
  const remainingToday = Math.max(0, limit - countToday);
  const resetAt = nextMidnight.toISOString();

  if (countToday >= limit) {
    return {
      allowed: false,
      reason: "DAILY_LIMIT_EXCEEDED",
      countToday,
      remainingToday: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((nextMidnight.getTime() - now.getTime()) / 1000)),
      resetAt,
    };
  }

  const latest = createdAts.reduce<Date | null>((acc, d) => (!acc || d > acc ? d : acc), null);
  if (latest) {
    const elapsedMs = now.getTime() - latest.getTime();
    const cooldownMs = cooldownSeconds * 1000;
    if (elapsedMs >= 0 && elapsedMs < cooldownMs) {
      return {
        allowed: false,
        reason: "COOLDOWN_ACTIVE",
        countToday,
        remainingToday,
        retryAfterSeconds: Math.max(1, Math.ceil((cooldownMs - elapsedMs) / 1000)),
        resetAt,
      };
    }
  }

  return { allowed: true, countToday, remainingToday, resetAt };
}

