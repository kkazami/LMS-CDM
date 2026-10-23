export const DEFAULT_NOTIFICATION_LIMIT = 50;
export const MAX_NOTIFICATION_LIMIT = 100;

/**
 * Parses the `limit` query parameter. Missing, non-numeric, fractional, zero or negative
 * values fall back to the default; values above the maximum are capped.
 */
export function parseNotificationLimit(
  raw: string | null | undefined,
  fallback: number = DEFAULT_NOTIFICATION_LIMIT,
  max: number = MAX_NOTIFICATION_LIMIT
): number {
  if (raw === null || raw === undefined) return fallback;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return fallback;
  const value = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(value) || value < 1) return fallback;
  return Math.min(value, max);
}
