/**
 * CodeLab Problem Bank — Index
 *
 * Aggregates all per-language problem modules into a single PROBLEM_BANK
 * array and exposes typed lookup helpers.
 *
 * 30 problems total:
 *   Python      6  (L1, L2, L11, L12, L21, L22)
 *   C++         6  (L3, L4, L13, L14, L23, L24)
 *   C#          6  (L5, L6, L15, L16, L25, L26)
 *   Java        6  (L7, L8, L17, L18, L27, L28)
 *   JavaScript  3  (L9, L19, L29)
 *   SQL         3  (L10, L20, L30)
 */

import type {
  CodeLabProblem,
  DifficultyTier,
  ProblemLanguage,
  ProblemLevel,
} from "./types";

import { pythonProblems } from "./python";
import { cppProblems } from "./cpp";
import { csharpProblems } from "./csharp";
import { javaProblems } from "./java";
import { javascriptProblems } from "./javascript";
import { sqlProblems } from "./sql";

// ─── Aggregated bank ────────────────────────────────────────────

/** All 30 CodeLab problems, sorted by level. */
export const PROBLEM_BANK: CodeLabProblem[] = [
  ...pythonProblems,
  ...cppProblems,
  ...csharpProblems,
  ...javaProblems,
  ...javascriptProblems,
  ...sqlProblems,
].sort((a, b) => a.level - b.level);

// ─── Lookup helpers ─────────────────────────────────────────────

/** Find a single problem by its unique slug id. */
export function getProblemById(id: string): CodeLabProblem | undefined {
  return PROBLEM_BANK.find((p) => p.id === id);
}

/** Return all problems for a given language. */
export function getProblemsByLanguage(lang: ProblemLanguage): CodeLabProblem[] {
  return PROBLEM_BANK.filter((p) => p.language === lang);
}

/** Return all problems for a given difficulty tier. */
export function getProblemsByTier(tier: DifficultyTier): CodeLabProblem[] {
  return PROBLEM_BANK.filter((p) => p.tier === tier);
}

/** Return the single problem at a given numeric level (1–30). */
export function getProblemByLevel(level: ProblemLevel): CodeLabProblem | undefined {
  return PROBLEM_BANK.find((p) => p.level === level);
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

/** Returns lightweight serializable problem summaries safe for client component props */
export function getProblemSummaries(): import("./types").CodeLabProblemSummary[] {
  return PROBLEM_BANK.map((p) => ({
    id: p.id,
    title: p.title,
    language: p.language,
    level: p.level,
    tier: p.tier,
    languageId: p.languageId,
    tags: p.tags,
  }));
}

// Re-export types for convenience
export type {
  CodeLabProblem,
  CodeLabProblemSummary,
  DifficultyTier,
  ProblemLanguage,
  ProblemLevel,
} from "./types";
export { levelToTier, PROBLEM_LANGUAGE_IDS } from "./types";
