/**
 * apps/web/src/lib/ite/guidance/types.ts
 *
 * Domain types for ITE AI-assisted guidance and rule-based dashboard study suggestions.
 */

export interface PracticeQuestion {
  question: string;
  answer: string;
}

export interface StudyHelpContent {
  summary: string;
  keyPoints: string[];
  practiceQuestion: PracticeQuestion;
  reflection: string;
}

export interface StudyHelpResponse extends StudyHelpContent {
  materialId: string;
  remainingToday: number;
  cached?: boolean;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  countToday: number;
  remainingToday: number;
  cooldownActive: boolean;
  cooldownSecondsRemaining: number;
  resetAt: string; // ISO string of Manila midnight
  reason?: "DAILY_LIMIT_EXCEEDED" | "COOLDOWN_ACTIVE";
}

export type SuggestionPriority = 1 | 2 | 3 | 4 | 5;

export interface StudySuggestion {
  id: string;
  title: string;
  detail: string;
  href: string;
  priority: SuggestionPriority;
  category: "OVERDUE" | "DUE_SOON" | "ENGAGEMENT" | "FOCUS" | "ON_TRACK";
}

export interface DueTaskItem {
  id: string;
  title: string;
  type: string;
  dueDate: string; // ISO string
  courseId: string;
  courseTitle: string;
  courseCode: string;
  courseSection?: string | null;
}

export interface CourseRiskInput {
  courseId: string;
  courseTitle: string;
  courseCode: string;
  reasons: Array<{
    code: "LOW_ENGAGEMENT" | "OVERDUE_TASKS" | "INACTIVE" | "LOW_GRADE" | "NEW_STUDENT";
    label: string;
    detail: string;
  }>;
}

export interface FocusSummaryInput {
  totalMinutes: number;
  sessionCount: number;
}

export interface StudySuggestionsInput {
  instituteCode: string;
  tasks: DueTaskItem[];
  courseRisks: CourseRiskInput[];
  focusSummary: FocusSummaryInput | null;
  now?: Date;
}
