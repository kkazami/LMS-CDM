/**
 * Shared (client + server safe) types for Mock Interview AI evaluation.
 * Pure types and constants only: no server imports here.
 */

export const AI_CRITERION_IDS = [
  "relevance",
  "clarity",
  "completeness",
  "practicality",
  "communication",
] as const;

export type AiCriterionId = (typeof AI_CRITERION_IDS)[number];

export type AiRating = "Excellent" | "Good" | "Fair" | "Needs Improvement";

export const AI_ANSWER_STATUSES = ["ANSWERED", "PARTIAL", "NOT_AN_ANSWER"] as const;

export type AiAnswerStatus = (typeof AI_ANSWER_STATUSES)[number];

export interface AiCriterionResult {
  id: AiCriterionId;
  met: boolean;
  /** Rubric level 0..4 (0 = not attempted, 1 = weak, 2 = developing, 3 = solid/met, 4 = strong). */
  level?: number;
  reason: string;
}

export interface MockInterviewAiEvaluation {
  score: number;
  rating: AiRating;
  answerStatus?: AiAnswerStatus;
  summary?: string;
  questionInsight?: string;
  nextStep?: string;
  answerOutline?: string[];
  criteria: AiCriterionResult[];
  strengths: string[];
  recommendations: string[];
  improvedSentence: string;
}

/** Evaluation limits shared by the UI (display/validation hints) and the server (enforcement). */
export const AI_MIN_WORDS = 15;
export const AI_MAX_CHARS = 1500;
export const AI_DAILY_LIMIT = 10;
export const AI_COOLDOWN_SECONDS = 5;
/** Score at or above which an AI-evaluated answer meets the passing standard. */
export const AI_PROGRESS_THRESHOLD = 60;

export function ratingForScore(score: number): AiRating {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= AI_PROGRESS_THRESHOLD) return "Fair";
  return "Needs Improvement";
}

/**
 * Deterministic server-side score calculation from the 5 criteria levels (0..4 each, max 20)
 * with status-based ceilings so non-answers and partial answers cannot pass.
 */
export function computeScoreFromCriteria(
  criteria: ReadonlyArray<{ level?: number; met?: boolean }>,
  answerStatus: AiAnswerStatus = "ANSWERED"
): number {
  if (answerStatus === "NOT_AN_ANSWER") {
    return 10;
  }
  const totalLevel = criteria.reduce((acc, c) => {
    const lvl = typeof c.level === "number" ? Math.max(0, Math.min(4, Math.round(c.level))) : c.met ? 3 : 1;
    return acc + lvl;
  }, 0);
  const rawScore = Math.round((totalLevel / 20) * 100);
  if (answerStatus === "PARTIAL") {
    return Math.min(rawScore, 59);
  }
  return Math.max(0, Math.min(100, rawScore));
}

/** Response of POST /api/mock-interview/applicant with action "evaluate". */
export interface AiEvaluateResponse {
  success: true;
  attemptId: string;
  evaluation: MockInterviewAiEvaluation | null;
  remainingToday: number;
  reused?: boolean;
  message?: string;
}

/** Checklist keys used by Applicant Mode (mirrors ApplicantSelfAssessmentChecklist). */
export interface AiDerivedChecklist {
  answersQuestion: boolean;
  includesExample: boolean;
  demonstratesCompetency: boolean;
  professionalLanguage: boolean;
  specificDetailed: boolean;
}

const CRITERION_TO_CHECKLIST: Record<AiCriterionId, keyof AiDerivedChecklist> = {
  relevance: "answersQuestion",
  practicality: "includesExample",
  clarity: "demonstratesCompetency",
  communication: "professionalLanguage",
  completeness: "specificDetailed",
};

/**
 * Maps an AI evaluation to the five-item checklist. A passing score (>= threshold) counts as
 * full completion, otherwise each checklist item mirrors its matching AI criterion.
 */
export function checklistFromEvaluation(evaluation: MockInterviewAiEvaluation): AiDerivedChecklist {
  const passed = evaluation.score >= AI_PROGRESS_THRESHOLD;
  const checklist: AiDerivedChecklist = {
    answersQuestion: passed,
    includesExample: passed,
    demonstratesCompetency: passed,
    professionalLanguage: passed,
    specificDetailed: passed,
  };
  if (!passed) {
    for (const c of evaluation.criteria) checklist[CRITERION_TO_CHECKLIST[c.id]] = c.met;
  }
  return checklist;
}
