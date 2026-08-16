/**
 * CodeLab Problem Bank — Index (v2)
 *
 * Aggregates all 8 independent language tracks (30 levels each = 240 problems):
 *   - Python:     Levels 1–30
 *   - C++:        Levels 1–30
 *   - C#:         Levels 1–30
 *   - Java:       Levels 1–30
 *   - JavaScript: Levels 1–30
 *   - SQL:        Levels 1–30
 *   - HTML:       Levels 1–30
 *   - CSS:        Levels 1–30
 */

import type {
  CodeLabProblem,
  CodeLabProblemSummary,
  LearningStage,
  ProblemLanguage,
  ProblemLevel,
} from "./types";

import { pythonProblems } from "./python";
import { cppProblems } from "./cpp";
import { csharpProblems } from "./csharp";
import { javaProblems } from "./java";
import { javascriptProblems } from "./javascript";
import { sqlProblems } from "./sql";
import { htmlProblems } from "./html";
import { cssProblems } from "./css";

// ─── Aggregated bank ────────────────────────────────────────────

/** All 240 CodeLab problems. */
export const PROBLEM_BANK: CodeLabProblem[] = [
  ...pythonProblems,
  ...cppProblems,
  ...csharpProblems,
  ...javaProblems,
  ...javascriptProblems,
  ...sqlProblems,
  ...htmlProblems,
  ...cssProblems,
];

// ─── Lookup helpers ─────────────────────────────────────────────

/** Find a single problem by its unique slug id (e.g. "python-level-1"). */
export function getProblemById(id: string): CodeLabProblem | undefined {
  return PROBLEM_BANK.find((p) => p.id === id);
}

/** Return all 30 problems for a given language track. */
export function getProblemsByLanguage(lang: ProblemLanguage): CodeLabProblem[] {
  return PROBLEM_BANK.filter((p) => p.language === lang);
}

/** Return a problem by language + level (the unique key in v2). */
export function getProblemByLanguageAndLevel(
  lang: ProblemLanguage,
  level: ProblemLevel
): CodeLabProblem | undefined {
  return PROBLEM_BANK.find((p) => p.language === lang && p.level === level);
}

/** Return the ordered list of levels (1–30) for a given language track. */
export function getTrackLevels(lang: ProblemLanguage): CodeLabProblem[] {
  return PROBLEM_BANK.filter((p) => p.language === lang).sort((a, b) => a.level - b.level);
}

/** Return problems matching any of the given tags. */
export function getProblemsByTags(tags: string[]): CodeLabProblem[] {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  return PROBLEM_BANK.filter((p) =>
    p.tags.some((t) => tagSet.has(t.toLowerCase()))
  );
}

/** All distinct tags across the problem bank, sorted alphabetically. */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const p of PROBLEM_BANK) {
    for (const t of p.tags) {
      tags.add(t);
    }
  }
  return [...tags].sort();
}

/** Returns lightweight serializable problem summaries safe for client component props. */
export function getProblemSummaries(): CodeLabProblemSummary[] {
  return PROBLEM_BANK.map((p) => ({
    id: p.id,
    title: p.title,
    language: p.language,
    level: p.level,
    stage: p.stage,
    executionMethod: p.executionMethod,
    languageId: p.languageId,
    tags: p.tags,
  }));
}

// Re-export types for convenience
export type {
  CodeLabProblem,
  CodeLabProblemSummary,
  LearningStage,
  ProblemLanguage,
  ProblemLevel,
  ExecutionMethod,
  TrackProgress,
} from "./types";
export {
  levelToStage,
  STAGE_LABELS,
  LANGUAGE_LABELS,
  PROBLEM_LANGUAGE_IDS,
  isLevelUnlocked,
} from "./types";
