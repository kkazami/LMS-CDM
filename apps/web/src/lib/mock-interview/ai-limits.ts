/**
 * Pure (database-free) validation and quota decision logic for Mock Interview AI evaluation.
 * Kept free of server imports so it is unit-testable and safe to share.
 */

import { createManilaMidnight, getManilaDateString } from "../ite/focus/manila-calendar";
import {
  AI_COOLDOWN_SECONDS,
  AI_DAILY_LIMIT,
  AI_MAX_CHARS,
  AI_MIN_WORDS,
  AI_TEXT_DAILY_LIMIT,
  AI_VOICE_DAILY_LIMIT,
  AI_VOICE_MAX_CHARS,
  AI_VOICE_MAX_SECONDS,
  type AiInputMode,
} from "./ai-types";

export {
  AI_COOLDOWN_SECONDS,
  AI_DAILY_LIMIT,
  AI_MAX_CHARS,
  AI_MIN_WORDS,
  AI_TEXT_DAILY_LIMIT,
  AI_VOICE_DAILY_LIMIT,
  AI_VOICE_MAX_CHARS,
  AI_VOICE_MAX_SECONDS,
};

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
export function validateAnswer(raw: unknown, maxChars: number = AI_MAX_CHARS): AnswerValidation {
  if (typeof raw !== "string") {
    return { ok: false, code: "EMPTY", message: "Please write an answer before requesting an evaluation." };
  }
  const answer = normalizeAnswer(raw);
  if (!answer) {
    return { ok: false, code: "EMPTY", message: "Please write an answer before requesting an evaluation." };
  }
  if (answer.length > maxChars) {
    return {
      ok: false,
      code: "TOO_LONG",
      message: `Your answer is too long. Please keep it within ${maxChars} characters.`,
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

export interface UsageEntry {
  id?: string;
  createdAt: Date;
  mode?: AiInputMode;
}

export function inferModeFromRequestId(id?: string, explicitMode?: AiInputMode): AiInputMode {
  if (explicitMode === "voice" || explicitMode === "text") return explicitMode;
  if (typeof id === "string" && id.startsWith("voice_")) return "voice";
  return "text";
}

export type UsageDecision =
  | {
      allowed: true;
      countToday: number;
      remainingToday: number;
      remainingTextToday: number;
      remainingVoiceToday: number;
      resetAt: string;
    }
  | {
      allowed: false;
      reason: "DAILY_LIMIT_EXCEEDED" | "MODE_LIMIT_EXCEEDED" | "COOLDOWN_ACTIVE";
      countToday: number;
      remainingToday: number;
      remainingTextToday: number;
      remainingVoiceToday: number;
      retryAfterSeconds: number;
      resetAt: string;
    };

/**
 * Decides whether another AI evaluation is allowed given previous reservation timestamps/entries.
 * Supports both shared daily limit and per-mode daily limits (5 Option A Text + 5 Option B Voice).
 */
export function decideUsage(
  entries: ReadonlyArray<Date | UsageEntry>,
  now: Date = new Date(),
  limit: number = AI_DAILY_LIMIT,
  cooldownSeconds: number = AI_COOLDOWN_SECONDS,
  requestedMode?: AiInputMode
): UsageDecision {
  const { startOfDay, nextMidnight } = getManilaDayRange(now);
  const normalized: Array<{ createdAt: Date; mode: AiInputMode }> = entries.map((e) =>
    e instanceof Date
      ? { createdAt: e, mode: "text" }
      : { createdAt: e.createdAt, mode: inferModeFromRequestId(e.id, e.mode) }
  );

  const today = normalized.filter((e) => e.createdAt >= startOfDay && e.createdAt < nextMidnight);
  const countToday = today.length;
  const textUsedToday = today.filter((e) => e.mode === "text").length;
  const voiceUsedToday = today.filter((e) => e.mode === "voice").length;

  const remainingToday = Math.max(0, limit - countToday);
  const remainingTextToday = Math.min(remainingToday, Math.max(0, AI_TEXT_DAILY_LIMIT - textUsedToday));
  const remainingVoiceToday = Math.min(remainingToday, Math.max(0, AI_VOICE_DAILY_LIMIT - voiceUsedToday));
  const resetAt = nextMidnight.toISOString();
  const secondsUntilReset = Math.max(1, Math.ceil((nextMidnight.getTime() - now.getTime()) / 1000));

  if (countToday >= limit) {
    return {
      allowed: false,
      reason: "DAILY_LIMIT_EXCEEDED",
      countToday,
      remainingToday: 0,
      remainingTextToday: 0,
      remainingVoiceToday: 0,
      retryAfterSeconds: secondsUntilReset,
      resetAt,
    };
  }

  if (requestedMode === "text" && textUsedToday >= AI_TEXT_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "MODE_LIMIT_EXCEEDED",
      countToday,
      remainingToday,
      remainingTextToday: 0,
      remainingVoiceToday,
      retryAfterSeconds: secondsUntilReset,
      resetAt,
    };
  }

  if (requestedMode === "voice" && voiceUsedToday >= AI_VOICE_DAILY_LIMIT) {
    return {
      allowed: false,
      reason: "MODE_LIMIT_EXCEEDED",
      countToday,
      remainingToday,
      remainingTextToday,
      remainingVoiceToday: 0,
      retryAfterSeconds: secondsUntilReset,
      resetAt,
    };
  }

  const latest = normalized.reduce<Date | null>(
    (acc, e) => (!acc || e.createdAt > acc ? e.createdAt : acc),
    null
  );
  if (latest) {
    const elapsedMs = now.getTime() - latest.getTime();
    const cooldownMs = cooldownSeconds * 1000;
    if (elapsedMs >= 0 && elapsedMs < cooldownMs) {
      return {
        allowed: false,
        reason: "COOLDOWN_ACTIVE",
        countToday,
        remainingToday,
        remainingTextToday,
        remainingVoiceToday,
        retryAfterSeconds: Math.max(1, Math.ceil((cooldownMs - elapsedMs) / 1000)),
        resetAt,
      };
    }
  }

  return {
    allowed: true,
    countToday,
    remainingToday,
    remainingTextToday,
    remainingVoiceToday,
    resetAt,
  };
}

