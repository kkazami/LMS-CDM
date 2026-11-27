import { persistentLimit, pruneExpiredRateLimitBatch } from '@/lib/roster/rate-limit';

export const authenticatedRateLimits = {
  sessionRevocation: { prefix: 'self-session-revoke', requests: 20, windowMs: 60_000 },
  passwordChange: { prefix: 'self-password-change', requests: 6, windowMs: 5 * 60_000 },
  instructorProvisioning: { prefix: 'instructor-provisioning', requests: 20, windowMs: 5 * 60_000 },
  adminPasswordReset: { prefix: 'admin-password-reset', requests: 10, windowMs: 5 * 60_000 },
  codeLabRun: { prefix: 'codelab', requests: 30, windowMs: 5 * 60_000 },
  supportReport: { prefix: 'support-report', requests: 10, windowMs: 60 * 60_000 },
  helpQuestion: { prefix: 'student-help', requests: 10, windowMs: 60_000 },
} as const;

let nextCleanup = 0;

export async function limitAuthenticatedOperation(operation: keyof typeof authenticatedRateLimits, actorId: string) {
  const policy = authenticatedRateLimits[operation];
  await persistentLimit(`${policy.prefix}:${actorId}`, policy.requests, policy.windowMs);
  const now = Date.now();
  if (now >= nextCleanup) {
    nextCleanup = now + 60_000;
    await pruneExpiredRateLimitBatch().catch(() => console.warn('Rate limit expiry cleanup unavailable.'));
  }
}
