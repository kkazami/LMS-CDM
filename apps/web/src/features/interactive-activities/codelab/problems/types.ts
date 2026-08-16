/**
 * CodeLab Problem Bank — Type Definitions (v2)
 *
 * Architecture: 8 language tracks × 30 levels each = 240 problems.
 * Each track is independent. Level N is locked until Level N-1 is passed (score ≥ 60).
 */

/** All supported language tracks. */
export type ProblemLanguage =
  | "python"
  | "cpp"
  | "csharp"
  | "java"
  | "javascript"
  | "sql"
  | "html"
  | "css";

/** Learning stage — replaces "difficulty tier". Friendlier, less intimidating. */
export type LearningStage = "basics" | "building-up" | "getting-good";

/** 1–30 per language track. Each track has its own 1–30 sequence. */
export type ProblemLevel =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30;

/**
 * Execution method determines how the student's code is run.
 * - "judge0": submitted to Judge0, stdin/stdout tested
 * - "html-preview": rendered in an iframe srcdoc
 * - "css-preview": injected into an HTML template in an iframe srcdoc
 */
export type ExecutionMethod = "judge0" | "html-preview" | "css-preview";

/** Variable definition for seeded randomization. */
export interface ProblemVariable {
  name: string;
  type: "number" | "string";
  min?: number;
  max?: number;
  options?: string[];
}

/** A single test case. For judge0 tracks, uses stdin/stdout. For HTML/CSS, uses visual check criteria. */
export interface ProblemTestCase {
  /** Human-readable description of what this test checks. */
  label: string;
  /**
   * For judge0: the stdin input (may have {{variable}} placeholders).
   * For html-preview / css-preview: not used (set to "").
   */
  inputTemplate: string;
  /**
   * For judge0: expected stdout (may have {{variable}} placeholders).
   * For html-preview: a CSS selector that must exist in the rendered iframe DOM.
   *   e.g. "h1" means there must be an <h1> element in the output.
   * For css-preview: a CSS property check string.
   *   e.g. "body:background-color:rgb(255, 0, 0)" means body's background-color must be rgb(255, 0, 0).
   */
  expectedOutputTemplate: string;
  /** If true, pass/fail only — no details shown to student. */
  isHidden: boolean;
}

/** Full problem definition. */
export interface CodeLabProblem {
  /** Unique slug. Pattern: "{lang}-level-{N}" e.g. "python-level-1" */
  id: string;
  /** Display title. Short and clear. */
  title: string;
  /** Which language track this belongs to. */
  language: ProblemLanguage;
  /** 1–30 within the language track. */
  level: ProblemLevel;
  /** Derived from level: 1-10=basics, 11-20=building-up, 21-30=getting-good */
  stage: LearningStage;
  /** How to execute and verify the student's code. */
  executionMethod: ExecutionMethod;
  /**
   * Judge0 language ID.
   * For html/css tracks: 0 (not used).
   */
  languageId: number;
  /**
   * Markdown description. Must begin with a "## What You'll Learn" section.
   * Then a "## Your Task" section. Then examples. Keep it short and friendly.
   * May contain {{variable}} placeholders.
   */
  descriptionTemplate: string;
  /** Variables randomized per student using evaluateVariables(seed, variables). */
  variables: ProblemVariable[];
  /** Test cases. For HTML/CSS tracks, see ProblemTestCase.expectedOutputTemplate docs. */
  testCases: ProblemTestCase[];
  /** Topic tags. */
  tags: string[];
  /**
   * Educational hint — single fallback hint string.
   */
  hintTemplate?: string;
  /**
   * 3-Tier Progressive Hints:
   *   [0]: Tier 1 — Direction & Logic (unlocked at >= 3 failed attempts)
   *   [1]: Tier 2 — Code Scaffold / Structure (unlocked at >= 5 failed attempts)
   *   [2]: Tier 3 — Step-by-Step Solution Breakdown (unlocked at >= 7 failed attempts)
   */
  hints?: string[];
  /**
   * For HTML/CSS tracks only: the full HTML template shown to the student
   * in the problem description as a reference/starting point.
   * For CSS track: the HTML that the student's CSS will be applied to.
   */
  htmlTemplate?: string;
  /**
   * Server-side expected output computation for judge0 tracks.
   * Called in the page.tsx server component — never reaches the client.
   */
  computeExpectedOutput: (
    vars: Record<string, string | number>,
    testCase: ProblemTestCase
  ) => string;
}

/** Serializable summary safe for client component props. */
export interface CodeLabProblemSummary {
  id: string;
  title: string;
  language: ProblemLanguage;
  level: ProblemLevel;
  stage: LearningStage;
  executionMethod: ExecutionMethod;
  languageId: number;
  tags: string[];
}

/** A student's progress record for a single language track. */
export interface TrackProgress {
  language: ProblemLanguage;
  /** The highest level the student has passed (score ≥ 60). 0 = none passed yet. */
  highestPassedLevel: number;
  /** Map of level → best score. */
  scores: Record<number, number>;
}

/** Maps a numeric level to its learning stage. */
export function levelToStage(level: ProblemLevel): LearningStage {
  if (level <= 10) return "basics";
  if (level <= 20) return "building-up";
  return "getting-good";
}

/** Friendly display names for stages. */
export const STAGE_LABELS: Record<LearningStage, string> = {
  basics: "Basics",
  "building-up": "Building Up",
  "getting-good": "Getting Good",
};

/** Friendly display names for languages. */
export const LANGUAGE_LABELS: Record<ProblemLanguage, string> = {
  python: "Python",
  cpp: "C++",
  csharp: "C#",
  java: "Java",
  javascript: "JavaScript",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
};

/** Judge0 language IDs. HTML and CSS use 0 (iframe preview, not Judge0). */
export const PROBLEM_LANGUAGE_IDS: Record<ProblemLanguage, number> = {
  python: 71,
  cpp: 54,
  csharp: 51,
  java: 62,
  javascript: 93,
  sql: 82,
  html: 0,
  css: 0,
};

/** Whether a level is unlocked given the student's highest passed level. */
export function isLevelUnlocked(level: ProblemLevel, highestPassedLevel: number): boolean {
  return level === 1 || level <= highestPassedLevel + 1;
}
