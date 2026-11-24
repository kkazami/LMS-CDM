import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isAiEvaluationEnabled } from "./ai-evaluate";
import type { AiAnswerStatus, MockInterviewAiEvaluation } from "./ai-types";

export interface ApplicantAttemptRow {
  id: string;
  questionId: string;
  writtenAnswer: string;
  checklistAssessment: Prisma.JsonValue;
  feedbackNotes: string | null;
  createdAt: Date;
  aiScore?: number | null;
  aiRating?: string | null;
  aiFeedback?: Prisma.JsonValue | null;
}

const BASE_SELECT = {
  id: true,
  questionId: true,
  writtenAnswer: true,
  checklistAssessment: true,
  feedbackNotes: true,
  createdAt: true,
} as const;

const AI_SELECT = {
  ...BASE_SELECT,
  aiScore: true,
  aiRating: true,
  aiFeedback: true,
} as const;

/**
 * Loads a student's recent Applicant Mode attempts.
 * AI columns are only selected when AI evaluation is enabled, so the existing (non-AI) experience
 * keeps working on a database that has not been migrated yet.
 */
export async function loadApplicantAttempts(studentId: string, take = 30): Promise<ApplicantAttemptRow[]> {
  const args = { where: { studentId }, orderBy: { createdAt: "desc" as const }, take };
  return isAiEvaluationEnabled()
    ? db.mockInterviewApplicantAttempt.findMany({ ...args, select: AI_SELECT })
    : db.mockInterviewApplicantAttempt.findMany({ ...args, select: BASE_SELECT });
}

export function readStoredEvaluation(row: {
  aiScore?: number | null;
  aiRating?: string | null;
  aiFeedback?: Prisma.JsonValue | null;
}): MockInterviewAiEvaluation | null {
  if (
    row.aiScore === null ||
    row.aiScore === undefined ||
    !row.aiFeedback ||
    typeof row.aiFeedback !== "object" ||
    Array.isArray(row.aiFeedback)
  ) {
    return null;
  }
  const feedback = row.aiFeedback as Record<string, unknown>;
  return {
    score: row.aiScore,
    rating: (row.aiRating as MockInterviewAiEvaluation["rating"]) ?? "Fair",
    answerStatus:
      typeof feedback.answerStatus === "string"
        ? (feedback.answerStatus as AiAnswerStatus)
        : undefined,
    summary: typeof feedback.summary === "string" ? feedback.summary : undefined,
    questionInsight: typeof feedback.questionInsight === "string" ? feedback.questionInsight : undefined,
    nextStep: typeof feedback.nextStep === "string" ? feedback.nextStep : undefined,
    answerOutline: Array.isArray(feedback.answerOutline) ? (feedback.answerOutline as string[]) : undefined,
    criteria: (feedback.criteria as MockInterviewAiEvaluation["criteria"]) ?? [],
    strengths: (feedback.strengths as string[]) ?? [],
    recommendations: (feedback.recommendations as string[]) ?? [],
    improvedSentence: typeof feedback.improvedSentence === "string" ? feedback.improvedSentence : "",
  };
}

/** Shape used for `details` of an applicant attempt in the hub and progress responses. */
export function applicantAttemptDetails(a: ApplicantAttemptRow) {
  return {
    writtenAnswer: a.writtenAnswer,
    checklist: a.checklistAssessment,
    notes: a.feedbackNotes,
    questionId: a.questionId,
    aiEvaluation: readStoredEvaluation(a),
  };
}
