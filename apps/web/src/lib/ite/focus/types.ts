/**
 * apps/web/src/lib/ite/focus/types.ts
 *
 * Domain types and contracts for ITE Focus Mode (distraction-free learning).
 */

export type FocusContextType = "STUDY" | "MATERIAL" | "FLASHCARDS" | "QUIZ";
export type FocusSessionStatus = "ACTIVE" | "COMPLETED" | "ABANDONED";

export interface CreateFocusSessionInput {
  contextType: FocusContextType;
  courseId?: string | null;
  refId?: string | null;
  plannedMinutes?: number | null;
}

export interface UpdateFocusSessionInput {
  action: "heartbeat" | "end";
  focusedSeconds?: number;
  tabSwitchCount?: number;
}

export interface DailyFocusStat {
  date: string; // "YYYY-MM-DD"
  label: string; // e.g. "Mon"
  focusedMinutes: number;
}

export interface FocusSummaryResponse {
  focusedMinutesThisWeek: number;
  focusedMinutesLastWeek: number;
  completedSessionsThisWeek: number;
  averageTabSwitchesThisWeek: number;
  longestCompletedSessionMinutes: number;
  sevenDaySeries: DailyFocusStat[];
  activeSessionId: string | null;
}

export interface FocusActor {
  userId: string;
  role: "STUDENT";
  instituteId: string;
  instituteCode: string;
  name: string;
}
