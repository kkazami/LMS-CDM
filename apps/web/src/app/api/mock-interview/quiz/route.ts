import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireMockInterviewStudent,
  sameOriginViolation,
  denied,
} from "@/lib/mock-interview/access";
import { PREDEFINED_QUIZ_QUESTIONS } from "@/lib/mock-interview/content-bank";
import { ensureMockInterviewTablesAndContent } from "@/lib/mock-interview/server-db";

/**
 * GET: Returns quiz questions with answer choices, but STRIPS OUT correctAnswer
 * and explanation to protect the integrity of the quiz prior to submission.
 */
export async function GET(request: Request) {
  const access = await requireMockInterviewStudent(request);
  if (!access.ok) return denied(access);

  const safeQuestions = PREDEFINED_QUIZ_QUESTIONS.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    choices: q.choices,
    category: q.category,
    difficulty: q.difficulty,
    pointValue: q.pointValue,
  }));

  return NextResponse.json({ questions: safeQuestions });
}

/**
 * POST: Server-side official score calculation and submission validation.
 */
export async function POST(request: Request) {
  const violation = sameOriginViolation(request);
  if (violation) return violation;

  const access = await requireMockInterviewStudent(request);
  if (!access.ok) return denied(access);

  try {
    const body = await request.json();
    const answers: Record<string, number> = body.answers || {};

    let score = 0;
    const maxScore = PREDEFINED_QUIZ_QUESTIONS.length * 10;
    let correctCount = 0;

    const detailedResults = PREDEFINED_QUIZ_QUESTIONS.map((q) => {
      const selected = answers[q.id] ?? -1;
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) {
        score += q.pointValue;
        correctCount += 1;
      }
      return {
        questionId: q.id,
        questionText: q.questionText,
        selectedChoice: selected,
        correctChoice: q.correctAnswer ?? 0,
        isCorrect,
        explanation: q.explanation ?? "",
        choices: q.choices,
      };
    });

    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    let attemptRecord;
    try {
      attemptRecord = await db.mockInterviewQuizAttempt.create({
        data: {
          studentId: access.userId,
          score,
          maxScore,
          percentage,
          totalQuestions: PREDEFINED_QUIZ_QUESTIONS.length,
          correctAnswers: correctCount,
          userAnswers: answers,
        },
      });
    } catch (createErr) {
      console.warn("Retrying quiz attempt save after ensure:", createErr);
      await ensureMockInterviewTablesAndContent();
      attemptRecord = await db.mockInterviewQuizAttempt.create({
        data: {
          studentId: access.userId,
          score,
          maxScore,
          percentage,
          totalQuestions: PREDEFINED_QUIZ_QUESTIONS.length,
          correctAnswers: correctCount,
          userAnswers: answers,
        },
      });
    }

    return NextResponse.json({
      success: true,
      attemptId: attemptRecord.id,
      score,
      maxScore,
      percentage,
      correctCount,
      totalQuestions: PREDEFINED_QUIZ_QUESTIONS.length,
      detailedResults,
    });
  } catch (err) {
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
