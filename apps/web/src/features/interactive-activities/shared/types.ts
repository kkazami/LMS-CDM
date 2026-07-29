/**
 * Interactive Activities — Shared Type Definitions
 *
 * These interfaces define the contract between activity modules (pc-build, arduino,
 * server-rack, logic-gate, codelab) and the shared submission/grading infrastructure.
 *
 * Every activity module produces an ActivitySubmission; every instructor creates
 * activities via ActivityTemplate. These shapes are also mirrored in the Prisma
 * schema (as DB models) and validated at the API boundary via Zod schemas in schemas.ts.
 *
 * IMPORTANT: If you modify these types, update the corresponding Zod schema in
 * schemas.ts AND the Prisma model in prisma/schema.prisma to stay in sync.
 */

/** All supported activity types in the feature suite. */
export const ACTIVITY_TYPES = [
  "pc-build",
  "arduino",
  "server-rack",
  "logic-gate",
  "codelab",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/**
 * Submission payload emitted by every activity module.
 *
 * This is what gets POSTed to /api/activities/submit after a student completes
 * (or times out of) an activity. It must be gradeable without a human opening
 * the 3D scene — score, stateCheck, and errorLog together provide enough info.
 */
export interface ActivitySubmission {
  /** The student's user ID (from the LMS session). */
  studentId: string;

  /** The assignment/template ID this submission is for. */
  assignmentId: string;

  /** Which activity module produced this submission. */
  activityType: ActivityType;

  /**
   * Deterministic seed used for randomization.
   * Allows the grading system to reproduce the exact problem variant
   * the student saw, without needing to store the full 3D scene state.
   */
  variantSeed: string;

  /** ISO 8601 timestamp when the student started the activity. */
  startedAt: string;

  /** Wall-clock seconds from start to submission. */
  completionTimeSeconds: number;

  /** Number of attempts (resets/retries) the student made. */
  attempts: number;

  /**
   * Activity-specific key-value pairs that capture the student's final state.
   * For pc-build: which components are in which slots, cable connections, etc.
   * For codelab: language (string), testPassCount (number), and optionally stringified testResults.
   * Keys are activity-defined; values are primitives for easy JSON serialization.
   */
  stateCheck: Record<string, boolean | number | string>;

  /** Computed score, 0–100. */
  score: number;

  /** Maximum possible score (always 100 for normalized scoring). */
  maxScore: number;

  /** Whether the student met the passing threshold. */
  passed: boolean;

  /**
   * Student-visible diagnostic hints — e.g. "RAM not seated in slot A1",
   * "Test case 3 failed: expected 42, got 41". Never raw stack traces.
   */
  errorLog?: string[];
}

/** Difficulty levels for activity templates. */
export type ActivityDifficulty = 1 | 2 | 3;

/**
 * Instructor-defined template that drives activity randomization.
 *
 * Each template defines a "problem shape" — the variables get substituted
 * per-student using the variantSeed to create unique but reproducible instances.
 */
export interface ActivityTemplate {
  /** Unique template identifier. */
  templateId: string;

  /** Which activity module this template is for. */
  activityType: ActivityType;

  /** The course this template belongs to. */
  courseId: string;

  /** Difficulty tier: 1 = introductory, 2 = intermediate, 3 = advanced. */
  difficulty: ActivityDifficulty;

  /**
   * Placeholder variables that get substituted per-student.
   * Shape depends on activityType — e.g. for pc-build:
   *   { targetCPU: "Intel i5-12400", requiredRAM: "16GB DDR4", ... }
   */
  variables: Record<string, unknown>;

  /**
   * Pool of faults for troubleshooting-mode activities.
   * The system picks N faults from this pool based on difficulty.
   * E.g. ["loose_sata_cable", "wrong_ram_slot", "missing_standoff"]
   */
  faultPool?: string[];

  /**
   * Hidden test cases for CodeLab activities only.
   * Students see some test cases; these are additional ones used for grading.
   */
  hiddenTestCases?: unknown[];

  /** ID of the instructor who created this template. */
  createdBy: string;
}

/**
 * Metadata for a 3D model asset in the system.
 * Used by the asset pipeline to track available models and their versions.
 */
export interface ActivityAssetMeta {
  /** Unique asset identifier. */
  assetId: string;

  /** Filesystem/CDN path relative to public/models/. */
  path: string;

  /** Human-readable name for the asset. */
  name: string;

  /** Semantic version string (e.g. "1.0.0"). */
  version: string;

  /** Whether this asset has been Draco-compressed. */
  isDracoCompressed: boolean;

  /** Which activity types use this asset. */
  activityTypes: ActivityType[];
}

/**
 * Tracks an in-progress activity attempt.
 * Created when a student starts an activity, updated on submission or timeout.
 */
export interface ActivitySessionState {
  /** Session identifier. */
  sessionId: string;

  /** Student's user ID. */
  studentId: string;

  /** Template being attempted. */
  templateId: string;

  /** The seed used for this attempt's randomization. */
  variantSeed: string;

  /** When the attempt started (ISO 8601). */
  startedAt: string;

  /** Current status of the attempt. */
  status: "in_progress" | "submitted" | "timed_out" | "abandoned";
}
