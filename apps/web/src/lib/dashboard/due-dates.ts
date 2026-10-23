/**
 * Pure due-date bucketing for the student dashboard. All calendar comparisons use
 * Asia/Manila (PHT, UTC+8, no DST) so "today" / "tomorrow" match what a student in the
 * Philippines sees, and output is identical on the server and in the browser.
 */

export const DASHBOARD_TIME_ZONE = "Asia/Manila";

export type DueStatus = "overdue" | "today" | "tomorrow" | "upcoming";

export interface DueLabel {
  label: string;
  status: DueStatus;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" in Asia/Manila. */
export function manilaDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: DASHBOARD_TIME_ZONE }).format(d);
}

/** The Manila calendar date after the one containing `d`, as "YYYY-MM-DD". */
function nextManilaDateKey(d: Date): string {
  const [y, m, day] = manilaDateKey(d).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day + 1)).toISOString().slice(0, 10);
}

function formatManila(d: Date, options: Intl.DateTimeFormatOptions): string {
  return d.toLocaleDateString("en-US", { timeZone: DASHBOARD_TIME_ZONE, ...options });
}

/**
 * Classifies one due date relative to `now`.
 * - overdue: the due instant has passed
 * - today / tomorrow: Manila calendar dates
 * - upcoming: anything later, labelled with weekday + date
 */
export function classifyDueDate(dueDateIso: string, nowIso: string): DueLabel {
  const due = new Date(dueDateIso);
  const now = new Date(nowIso);

  if (due.getTime() < now.getTime()) {
    return { label: "Overdue", status: "overdue" };
  }

  const dueKey = manilaDateKey(due);
  if (dueKey === manilaDateKey(now)) {
    return { label: "Due Today", status: "today" };
  }
  if (dueKey === nextManilaDateKey(now)) {
    return { label: "Due Tomorrow", status: "tomorrow" };
  }

  if (due.getTime() - now.getTime() <= 7 * DAY_MS) {
    const dayName = formatManila(due, { weekday: "short" });
    const monthDay = formatManila(due, { month: "short", day: "numeric" });
    return { label: `Due ${dayName}, ${monthDay}`, status: "upcoming" };
  }

  return { label: `Due ${formatManila(due, { month: "short", day: "numeric" })}`, status: "upcoming" };
}

/** Splits items into overdue and not-yet-due, preserving the input order inside each group. */
export function splitOverdue<T extends { dueDate: string }>(
  items: T[],
  nowIso: string
): { overdue: T[]; upcoming: T[] } {
  const nowMs = new Date(nowIso).getTime();
  const overdue: T[] = [];
  const upcoming: T[] = [];
  for (const item of items) {
    (new Date(item.dueDate).getTime() < nowMs ? overdue : upcoming).push(item);
  }
  return { overdue, upcoming };
}
