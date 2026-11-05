import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  requireMockInterviewStudent,
  sameOriginViolation,
  denied,
} from "@/lib/mock-interview/access";
import { PREDEFINED_QUESTIONS } from "@/lib/mock-interview/content-bank";
import { ensureMockInterviewTablesAndContent } from "@/lib/mock-interview/server-db";
import { readStoredEvaluation } from "@/lib/mock-interview/attempts";
import { validateAnswer, AI_MAX_CHARS } from "@/lib/mock-interview/ai-limits";
import {
  evaluateApplicantAnswer,
  isAiEvaluationEnabled,
  isAiProviderConfigured,
} from "@/lib/mock-interview/ai-evaluate";
import {
  getRemainingToday,
  releaseAiEvaluation,
  reserveAiEvaluation,
} from "@/lib/mock-interview/ai-usage";
import {
  checklistFromEvaluation,
  type AiEvaluateResponse,
} from "@/lib/mock-interview/ai-types";

export const dynamic = "force-dynamic";
// AI evaluation can take up to ~20 s (Gemini, then Groq fallback).
export const maxDuration = 30;

const MAX_BODY_BYTES = 16 * 1024;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

const checklistSchema = z
  .object({
    answersQuestion: z.boolean().default(false),
    includesExample: z.boolean().default(false),
    demonstratesCompetency: z.boolean().default(false),
    professionalLanguage: z.boolean().default(false),
    specificDetailed: z.boolean().default(false),
  })
  .default({
    answersQuestion: false,
    includesExample: false,
    demonstratesCompetency: false,
    professionalLanguage: false,
    specificDetailed: false,
  });

const bodySchema = z.object({
  action: z.enum(["evaluate", "save"]).default("save"),
  questionId: z.string().trim().min(1).max(100),
  writtenAnswer: z.string().min(1),
  checklist: checklistSchema,
  notes: z.string().trim().max(500).nullish(),
  attemptId: z.string().trim().min(1).max(100).nullish(),
});

function json(body: Record<string, unknown>, status = 200, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers });
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

type AttemptCreateData = {
  studentId: string;
  questionId: string;
  writtenAnswer: string;
  checklistAssessment: Prisma.InputJsonValue;
  feedbackNotes: string | null;
  aiScore?: number;
  aiRating?: string;
  aiFeedback?: Prisma.InputJsonValue;
  aiProvider?: string;
};

/** Creates an attempt; on first failure, runs the existing idempotent table/content bootstrap and retries once. */
async function createAttempt(data: AttemptCreateData): Promise<string> {
  try {
    const row = await db.mockInterviewApplicantAttempt.create({ data, select: { id: true } });
    return row.id;
  } catch (err) {
    console.warn("Retrying applicant attempt save after ensure:", err instanceof Error ? err.message : "unknown");
    await ensureMockInterviewTablesAndContent();
    const row = await db.mockInterviewApplicantAttempt.create({ data, select: { id: true } });
    return row.id;
  }
}

export async function POST(request: Request) {
  const violation = sameOriginViolation(request);
  if (violation) return violation;

  const access = await requireMockInterviewStudent(request);
  if (!access.ok) return denied(access);

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return json({ message: "Request is too large." }, 413);
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return json({ message: "Invalid request body." }, 400);
  }

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return json({ message: "questionId and writtenAnswer are required." }, 400);
  }
  const body = parsed.data;
  const studentId = access.userId;
  const notes = body.notes ? body.notes : null;

  if (body.action === "evaluate") {
    return handleEvaluate({ studentId, questionId: body.questionId, writtenAnswer: body.writtenAnswer, notes });
  }

  return handleSave({
    studentId,
    questionId: body.questionId,
    writtenAnswer: body.writtenAnswer.trim(),
    checklist: body.checklist,
    notes,
    attemptId: body.attemptId ?? null,
  });
}

// ---------------------------------------------------------------------------
// action: "save" (existing self-assessment flow; also finalizes an AI-evaluated attempt)
// ---------------------------------------------------------------------------

async function handleSave({
  studentId,
  questionId,
  writtenAnswer,
  checklist,
  notes,
  attemptId,
}: {
  studentId: string;
  questionId: string;
  writtenAnswer: string;
  checklist: z.infer<typeof checklistSchema>;
  notes: string | null;
  attemptId: string | null;
}) {
  if (writtenAnswer.length > AI_MAX_CHARS) {
    return json({ message: `Answer must be ${AI_MAX_CHARS} characters or fewer.` }, 400);
  }

  try {
    if (attemptId) {
      // Finalize an attempt created by an AI evaluation. Ownership is enforced in the query.
      const existing = await db.mockInterviewApplicantAttempt.findFirst({
        where: { id: attemptId, studentId },
        select: { id: true, aiScore: true },
      });
      if (!existing) return json({ message: "Attempt not found." }, 404);

      await db.mockInterviewApplicantAttempt.updateMany({
        where: { id: attemptId, studentId },
        data:
          existing.aiScore !== null
            ? { feedbackNotes: notes } // AI-evaluated: checklist stays AI-derived, notes only
            : { feedbackNotes: notes, checklistAssessment: toJson(checklist) },
      });
      return json({ success: true, attemptId });
    }

    const id = await createAttempt({
      studentId,
      questionId,
      writtenAnswer,
      checklistAssessment: toJson(checklist),
      feedbackNotes: notes,
    });
    return json({ success: true, attemptId: id });
  } catch (err) {
    console.error("Failed to save applicant attempt:", err instanceof Error ? err.message : "unknown");
    return json({ message: "Failed to persist attempt." }, 500);
  }
}

// ---------------------------------------------------------------------------
// action: "evaluate"
// ---------------------------------------------------------------------------

async function handleEvaluate({
  studentId,
  questionId,
  writtenAnswer,
  notes,
}: {
  studentId: string;
  questionId: string;
  writtenAnswer: string;
  notes: string | null;
}) {
  // 1. Cheap, free checks first (no database, no AI).
  const validation = validateAnswer(writtenAnswer);
  if (!validation.ok) {
    return json({ message: validation.message, code: validation.code }, 400);
  }
  const answer = validation.answer;

  const question = PREDEFINED_QUESTIONS.find((q) => q.id === questionId);
  if (!question) return json({ message: "Question not found." }, 404);

  if (!isAiEvaluationEnabled() || !isAiProviderConfigured()) {
    return json(
      { message: "AI evaluation is not available right now. You can still use the self-assessment checklist.", code: "AI_UNAVAILABLE" },
      503
    );
  }

  try {
    // 2. Duplicate protection: identical answer already evaluated recently returns the stored result for free.
    const existing = await db.mockInterviewApplicantAttempt.findFirst({
      where: {
        studentId,
        questionId,
        writtenAnswer: answer,
        aiScore: { not: null },
        createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, aiScore: true, aiRating: true, aiFeedback: true },
    });
    if (existing) {
      const stored = readStoredEvaluation(existing);
      if (stored) {
        const response: AiEvaluateResponse = {
          success: true,
          attemptId: existing.id,
          evaluation: stored,
          remainingToday: await getRemainingToday(studentId),
          reused: true,
        };
        return NextResponse.json(response);
      }
    }

    // 3. Atomic quota + cooldown reservation (database transaction closes before the AI call).
    const reservation = await reserveAiEvaluation(studentId);
    if (!reservation.ok) {
      const d = reservation.decision;
      return json(
        {
          message:
            d.reason === "DAILY_LIMIT_EXCEEDED"
              ? "You have used all your AI evaluations for today. Try again tomorrow."
              : `Please wait ${d.retryAfterSeconds} second${d.retryAfterSeconds === 1 ? "" : "s"} before evaluating again.`,
          code: d.reason,
          remainingToday: d.remainingToday,
          retryAfterSeconds: d.retryAfterSeconds,
          resetAt: d.resetAt,
        },
        429,
        { "Retry-After": String(d.retryAfterSeconds) }
      );
    }

    // 4. External AI call (no database transaction open).
    const outcome = await evaluateApplicantAnswer({ question, answer });

    if (!outcome.ok || !outcome.evaluation) {
      // Do not charge the student for a provider failure; keep their answer.
      await releaseAiEvaluation(reservation.requestId, studentId).catch(() => undefined);
      const attemptId = await createAttempt({
        studentId,
        questionId,
        writtenAnswer: answer,
        checklistAssessment: toJson({}),
        feedbackNotes: notes,
      });
      const response: AiEvaluateResponse = {
        success: true,
        attemptId,
        evaluation: null,
        remainingToday: reservation.remainingToday + 1,
        message: "The AI coach is busy right now. Your answer was kept; please use the self-assessment checklist or try again shortly.",
      };
      return NextResponse.json(response);
    }

    // 5. Persist the answer and the evaluation together.
    const evaluation = outcome.evaluation;
    const attemptId = await createAttempt({
      studentId,
      questionId,
      writtenAnswer: answer,
      checklistAssessment: toJson(checklistFromEvaluation(evaluation)),
      feedbackNotes: notes,
      aiScore: evaluation.score,
      aiRating: evaluation.rating,
      aiFeedback: toJson({
        answerStatus: evaluation.answerStatus,
        summary: evaluation.summary,
        questionInsight: evaluation.questionInsight,
        nextStep: evaluation.nextStep,
        answerOutline: evaluation.answerOutline,
        criteria: evaluation.criteria,
        strengths: evaluation.strengths,
        recommendations: evaluation.recommendations,
        improvedSentence: evaluation.improvedSentence,
      }),
      aiProvider: outcome.provider,
    });

    const response: AiEvaluateResponse = {
      success: true,
      attemptId,
      evaluation,
      remainingToday: reservation.remainingToday,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("Mock interview AI evaluation failed:", err instanceof Error ? err.message : "unknown");
    return json({ message: "Something went wrong while evaluating your answer. Please try again." }, 500);
  }
}
