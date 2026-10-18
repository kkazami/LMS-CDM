/**
 * apps/web/src/lib/harness/guardrails/rate-limiter.ts
 *
 * Layer 2 Guardrail: Token & Request Rate Limiter
 * Enforces per-user request limits to prevent runaway loops and API cost spikes.
 */

import { GuardrailCheckResult } from "../core/types";

interface RateLimitBucket {
  count: number;
  windowStartMs: number;
}

const userBuckets = new Map<string, RateLimitBucket>();

// Default: 20 requests per minute per user
const WINDOW_SIZE_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

export function checkRateLimit(
  userId: string,
  maxRequests = MAX_REQUESTS_PER_WINDOW,
  windowMs = WINDOW_SIZE_MS
): GuardrailCheckResult {
  const now = Date.now();
  let bucket = userBuckets.get(userId);

  if (!bucket || now - bucket.windowStartMs > windowMs) {
    bucket = { count: 1, windowStartMs: now };
    userBuckets.set(userId, bucket);
    return { allowed: true, guardrailName: "RateLimiter" };
  }

  bucket.count++;

  if (bucket.count > maxRequests) {
    return {
      allowed: false,
      guardrailName: "RateLimiter",
      reason: `Rate limit exceeded: Maximum ${maxRequests} requests per minute. Please pause before submitting further queries.`,
      severity: "BLOCK",
    };
  }

  return { allowed: true, guardrailName: "RateLimiter" };
}
