/**
 * apps/web/src/lib/ite/engagement-config.ts
 *
 * ITE Participation Tracker — Engagement & Risk Configuration
 * =============================================================
 * ALL scoring weights, window sizes, and thresholds live here.
 * Tune this file to adjust how the system behaves; never hardcode
 * magic numbers in service logic.
 *
 * Unit: weights sum to 1.0 within their group.
 */

// ─── Institute gate ────────────────────────────────────────────────────────
/** The only institute code allowed to use ITE participation features. */
export const ITE_INSTITUTE_CODE = "ite";

// ─── Activity window ───────────────────────────────────────────────────────
/** Number of days in the primary engagement calculation window. */
export const ENGAGEMENT_WINDOW_DAYS = 14;

/** Minimum enrolment age (days) before a student is included in scans. */
export const MIN_ENROLMENT_AGE_DAYS = 7;

/**
 * View-type deduplication window: at most one event per
 * (userId, courseId, type, refId) within this many minutes.
 */
export const DEDUP_WINDOW_MINUTES = 10;

// ─── Engagement component weights (must sum to 1.0) ────────────────────────
export const ENGAGEMENT_WEIGHTS = {
  /** Proportion of distinct active days in the 14-day window. */
  activeDays: 0.35,
  /** On-time submission rate for tasks due within the window. */
  onTimeRate: 0.30,
  /** Count of learning actions (views, quiz attempts, flashcard reviews, joins). */
  learningActions: 0.25,
  /** Penalty: recency of last activity (higher days = lower score). */
  recencyPenalty: 0.10,
} as const;

/** Maximum number of learning actions that maps to a full 100 score. */
export const MAX_LEARNING_ACTIONS_FOR_FULL_SCORE = 20;

/**
 * Days-since-last-activity → 0 penalty threshold.
 * If last activity was ≤ this many days ago, recency score = 100.
 * Scales linearly to 0 at RECENCY_ZERO_DAYS.
 */
export const RECENCY_FULL_DAYS = 1;
export const RECENCY_ZERO_DAYS = 14;

// ─── Risk assessment thresholds ────────────────────────────────────────────
/**
 * Engagement score below which a student is considered at-risk.
 * HIGH: below HIGH_ENG, MEDIUM: below MEDIUM_ENG.
 */
export const RISK_HIGH_ENGAGEMENT_THRESHOLD = 35;
export const RISK_MEDIUM_ENGAGEMENT_THRESHOLD = 55;

/** Overdue (unsubmitted, past-due) task counts that trigger risk levels. */
export const RISK_HIGH_OVERDUE_TASKS = 3;
export const RISK_MEDIUM_OVERDUE_TASKS = 1;

/** Days inactive (no ActivityEvent) that trigger risk levels. */
export const RISK_HIGH_INACTIVE_DAYS = 7;
export const RISK_MEDIUM_INACTIVE_DAYS = 4;

/**
 * Grade (percentage 0–100) below which risk is elevated.
 * Only applies when graded items exist.
 */
export const RISK_HIGH_GRADE_THRESHOLD = 65;
export const RISK_MEDIUM_GRADE_THRESHOLD = 75;

/** The app's passing grade. Used in human-readable reason strings. */
export const PASSING_GRADE_PERCENT = 75;

// ─── Risk score weights (used to compute a numeric 0–100 riskScore) ────────
export const RISK_SCORE_WEIGHTS = {
  engagement: 0.30,
  overdueTasks: 0.30,
  inactivity: 0.25,
  grade: 0.15,
} as const;

// ─── Alert spam-prevention ─────────────────────────────────────────────────
/** Re-alert a student who remains HIGH risk only after this many days. */
export const ALERT_REPEAT_HIGH_DAYS = 7;

// ─── Trend ─────────────────────────────────────────────────────────────────
/** Score change (absolute) required to call a trend UP or DOWN vs FLAT. */
export const TREND_DELTA_THRESHOLD = 5;
