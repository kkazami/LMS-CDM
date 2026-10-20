/**
 * apps/web/src/lib/ite/focus/manila-calendar.ts
 *
 * Pure date calculations for Asia/Manila (PHT, UTC+8, no daylight saving).
 * Ensures identical computation across Node, browser, and serverless environments.
 */

export const MANILA_TIMEZONE = "Asia/Manila";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the calendar date string ("YYYY-MM-DD") in Asia/Manila.
 */
export function getManilaDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MANILA_TIMEZONE }).format(date);
}

/**
 * Returns the short day-of-week label (e.g. "Mon", "Tue") in Asia/Manila.
 */
export function getManilaDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: MANILA_TIMEZONE, weekday: "short" }).format(date);
}

/**
 * Parses a Date into Manila calendar components: year, month (1-12), day, and day-of-week (0=Sun..6=Sat).
 */
export function getManilaParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
} {
  const dateStr = getManilaDateString(date);
  const [year, month, day] = dateStr.split("-").map(Number);
  // UTC Date with same Y-M-D has identical day-of-week
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = utcDate.getUTCDay(); // 0 is Sun, 1 is Mon, etc.
  return { year, month, day, dayOfWeek };
}

/**
 * Creates a Date representing 00:00:00.000 in Asia/Manila (+08:00) for a given YYYY-MM-DD.
 */
export function createManilaMidnight(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+08:00`);
}

/**
 * Returns Monday 00:00:00 Manila time for the week containing `date`.
 * Academic weeks in Philippines run Monday 00:00:00 to Sunday 23:59:59.
 */
export function getManilaWeekStart(date: Date = new Date()): Date {
  const { year, month, day, dayOfWeek } = getManilaParts(date);
  // Monday is 1; Sunday is 0 (which is 6 days after Monday)
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayUtc = new Date(Date.UTC(year, month - 1, day - daysSinceMonday));
  const mondayStr = mondayUtc.toISOString().slice(0, 10);
  return createManilaMidnight(mondayStr);
}

export interface ManilaWeekRange {
  thisWeekStart: Date;
  thisWeekEnd: Date;
  lastWeekStart: Date;
  lastWeekEnd: Date;
}

/**
 * Returns week boundaries for "this week" and "last week" (Monday to Sunday) in Asia/Manila.
 */
export function getManilaWeekRange(date: Date = new Date()): ManilaWeekRange {
  const thisWeekStart = getManilaWeekStart(date);
  const thisWeekEnd = new Date(thisWeekStart.getTime() + 7 * ONE_DAY_MS);
  const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * ONE_DAY_MS);
  const lastWeekEnd = thisWeekStart;

  return {
    thisWeekStart,
    thisWeekEnd,
    lastWeekStart,
    lastWeekEnd,
  };
}

export interface SevenDaySlot {
  date: string; // YYYY-MM-DD
  label: string; // Mon, Tue...
  start: Date;
  end: Date;
}

/**
 * Returns 7 consecutive days ending on the Manila calendar date of `date`.
 */
export function getManilaSevenDaySeries(date: Date = new Date()): SevenDaySlot[] {
  const { year, month, day } = getManilaParts(date);
  const slots: SevenDaySlot[] = [];

  for (let i = 6; i >= 0; i--) {
    const slotUtc = new Date(Date.UTC(year, month - 1, day - i));
    const dateKey = slotUtc.toISOString().slice(0, 10);
    const start = createManilaMidnight(dateKey);
    const end = new Date(start.getTime() + ONE_DAY_MS);
    const label = getManilaDayLabel(start);
    slots.push({ date: dateKey, label, start, end });
  }

  return slots;
}

/**
 * Splits a session's focusedSeconds across midnight boundaries in Asia/Manila.
 * If a session starts at 23:50 PHT and finishes 20 minutes later (00:10 PHT),
 * it produces two day allocations: 600s on Day 1 and 600s on Day 2.
 */
export function splitSessionByDay(
  startedAt: Date,
  focusedSeconds: number
): Array<{ dateKey: string; focusedSeconds: number; startInstant: Date; endInstant: Date }> {
  if (focusedSeconds <= 0) return [];

  const results: Array<{ dateKey: string; focusedSeconds: number; startInstant: Date; endInstant: Date }> = [];
  let remainingSeconds = focusedSeconds;
  let currentStart = new Date(startedAt.getTime());

  while (remainingSeconds > 0) {
    const currentDateKey = getManilaDateString(currentStart);
    // Find next midnight in Manila
    const [y, m, d] = currentDateKey.split("-").map(Number);
    const nextDayUtc = new Date(Date.UTC(y, m - 1, d + 1));
    const nextDayKey = nextDayUtc.toISOString().slice(0, 10);
    const nextMidnight = createManilaMidnight(nextDayKey);

    const secondsUntilMidnight = Math.max(0, Math.floor((nextMidnight.getTime() - currentStart.getTime()) / 1000));

    if (secondsUntilMidnight <= 0) {
      // Advance by 1 second if clock anomaly
      currentStart = new Date(currentStart.getTime() + 1000);
      continue;
    }

    const chunkSeconds = Math.min(remainingSeconds, secondsUntilMidnight);
    const chunkEnd = new Date(currentStart.getTime() + chunkSeconds * 1000);

    results.push({
      dateKey: currentDateKey,
      focusedSeconds: chunkSeconds,
      startInstant: currentStart,
      endInstant: chunkEnd,
    });

    remainingSeconds -= chunkSeconds;
    currentStart = nextMidnight;
  }

  return results;
}
