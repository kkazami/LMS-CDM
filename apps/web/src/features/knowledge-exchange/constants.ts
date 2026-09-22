/**
 * apps/web/src/features/knowledge-exchange/constants.ts
 *
 * Constant definitions, limits, and configuration for Knowledge Exchange.
 */

export const KX_POST_TYPES = ["QUESTION", "DISCUSSION"] as const;

export const KX_POST_STATUSES = ["OPEN", "ANSWERED", "CLOSED", "LOCKED"] as const;

export const KX_FLAG_REASONS = [
  "SPAM",
  "OFFENSIVE",
  "CHEATING",
  "OFF_TOPIC",
  "OTHER",
] as const;

export const KX_FLAG_REASON_LABELS: Record<string, string> = {
  SPAM: "Spam or automated advertising",
  OFFENSIVE: "Harassment, abuse, or offensive language",
  CHEATING: "Academic dishonesty / Exam cheating",
  OFF_TOPIC: "Off-topic or irrelevant to computing",
  OTHER: "Other community guideline violation",
};

export const KX_MODERATION_ACTIONS = [
  "CLOSE",
  "REOPEN",
  "LOCK",
  "UNLOCK",
  "PIN",
  "UNPIN",
  "DELETE",
  "RESTORE",
] as const;

export const KX_VALIDATION = {
  MIN_TITLE_LENGTH: 10,
  MAX_TITLE_LENGTH: 150,
  MIN_BODY_LENGTH: 20,
  MAX_BODY_LENGTH: 20000,
  MIN_ANSWER_LENGTH: 20,
  MAX_ANSWER_LENGTH: 20000,
  MIN_COMMENT_LENGTH: 5,
  MAX_COMMENT_LENGTH: 2000,
  MIN_TAGS: 1,
  MAX_TAGS: 5,
} as const;

export const KX_EXP_VALUES = {
  ASK_QUESTION: 5,
  ANSWER_QUESTION: 10,
  ACCEPTED_ANSWER: 15,
  VERIFIED_ANSWER: 25,
  UPVOTE_RECEIVED: 2,
  DAILY_UPVOTE_EXP_CAP: 20,
} as const;

export const KX_FEED_PAGE_SIZE = 15;
export const KX_COMMENTS_PAGE_SIZE = 50;

export const KX_TAG_CATEGORIES = {
  CPE: {
    label: "Computer Engineering",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  IT: {
    label: "Information Technology",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  TOPIC: {
    label: "Core Computer Science",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  GENERAL: {
    label: "General & Community",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
} as const;
