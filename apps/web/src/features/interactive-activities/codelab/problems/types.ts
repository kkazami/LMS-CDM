/**
 * CodeLab Problem Bank — Type Definitions
 *
 * These types define the structure of every problem in the CodeLab bank.
 * Each problem is self-contained: it carries its own description template,
 * variable definitions, test cases, and a computeExpectedOutput function
 * that the server component uses to generate deterministic answers.
 *
 * The problem bank is a static TypeScript module — no DB queries needed
 * to list problems. DB queries are only used for student submission history.
 */

/** Languages supported by CodeLab problems. */
export type ProblemLanguage = "python" | "cpp" | "csharp" | "java" | "javascript" | "sql";

/** Difficulty tier derived from the numeric level. */
export type DifficultyTier = "easy" | "intermediate" | "hard";

/** Numeric level within tier: Easy = 1–10, Intermediate = 11–20, Hard = 21–30 */
export type ProblemLevel =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30;

/**
 * A variable definition for problem randomization.
 * Used by evaluateVariables(seed, variables) from problem-engine.ts.
 */
export interface ProblemVariable {
  name: string;
  type: "number" | "string";
  min?: number;
  max?: number;
  options?: string[];
}

/**
 * A test case with template placeholders.
 * Templates are resolved server-side using evaluateVariables + substituteTemplate.
 */
export interface ProblemTestCase {
  /** Input template — may contain {{variable}} placeholders */
  inputTemplate: string;
  /** Expected output template — may contain {{variable}} placeholders.
   *  For computed outputs, use a placeholder that computeExpectedOutput resolves. */
  expectedOutputTemplate: string;
  /** If true, not shown to the student (only pass/fail returned) */
  isHidden: boolean;
}

/**
 * A complete CodeLab problem definition.
 * Exported from the per-language modules and aggregated in index.ts.
 */
export interface CodeLabProblem {
  /** Unique slug (e.g. "py-sum-two-numbers") */
  id: string;
  /** Display title */
  title: string;
  /** Primary language this problem is designed for */
  language: ProblemLanguage;
  /** 1–30 */
  level: ProblemLevel;
  /** Derived from level: 1–10=easy, 11–20=intermediate, 21–30=hard */
  tier: DifficultyTier;
  /** Markdown description with {{variable}} placeholders */
  descriptionTemplate: string;
  /** Variables to randomize per student */
  variables: ProblemVariable[];
  /** Judge0 language ID */
  languageId: number;
  /** Public + hidden test cases */
  testCases: ProblemTestCase[];
  /** Tags for filtering (e.g. ["loops", "arrays", "math"]) */
  tags: string[];
  /** Hint to show after 3 failed attempts (no spoilers, just direction) */
  hintTemplate: string;
  /**
   * Computes the expected output for a test case given the evaluated variables.
   * Called server-side — this function contains the "answer key" and never
   * reaches the client.
   *
   * @param vars - The evaluated variables for this student's seed
   * @param testCase - The specific test case being evaluated
   * @returns The expected output string (trimmed)
   */
  computeExpectedOutput: (
    vars: Record<string, string | number>,
    testCase: ProblemTestCase
  ) => string;
}

/**
 * Lightweight serializable problem summary without server-side compute functions.
 * Safe to pass as props from Server Components to Client Components.
 */
export interface CodeLabProblemSummary {
  id: string;
  title: string;
  language: ProblemLanguage;
  level: ProblemLevel;
  tier: DifficultyTier;
  languageId: number;
  tags: string[];
}

/** Maps a numeric level to its difficulty tier. */
export function levelToTier(level: ProblemLevel): DifficultyTier {
  if (level <= 10) return "easy";
  if (level <= 20) return "intermediate";
  return "hard";
}

/** Judge0 language IDs for each problem language. */
export const PROBLEM_LANGUAGE_IDS: Record<ProblemLanguage, number> = {
  python: 71,
  cpp: 54,
  csharp: 51,
  java: 62,
  javascript: 93,
  sql: 82,
};
