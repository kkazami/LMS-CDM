import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import { syncAttemptScoreToGradebook } from "@/lib/forms/gradebook-sync";
import type { FormAttemptAnswerData, FormQuestionData } from "@/types/forms";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string; attemptId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "GET courses/[courseId]/forms/[formId]/responses/[attemptId]/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const { courseId, formId, attemptId } = await context.params;
    const attempt = await db.formAttempt.findUnique({
      where: { id: attemptId },
      include: {
        form: {
          include: {
            questions: { orderBy: { position: "asc" } },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentNumber: true,
            avatarUrl: true,
          },
        },
        answers: true,
      },
    });

    if (!attempt || attempt.formId !== formId || attempt.form.courseId !== courseId) {
      return NextResponse.json({ message: "Attempt not found." }, { status: 404 });
    }

    const answersMap = new Map<string, (typeof attempt.answers)[0]>();
    attempt.answers.forEach((a) => answersMap.set(a.questionId, a));

    const questionsWithAnswers = attempt.form.questions.map((q) => {
      let cfg = {};
      try {
        cfg = JSON.parse(q.config || "{}");
      } catch {}

      const ans = answersMap.get(q.id);
      let optArray: string[] | null = null;
      let rankingArray: string[] | null = null;
      let matrixMap: Record<string, string> | null = null;

      if (ans) {
        try {
          if (ans.answerOptions) optArray = JSON.parse(ans.answerOptions);
        } catch {}
        try {
          if (ans.answerRanking) rankingArray = JSON.parse(ans.answerRanking);
        } catch {}
        try {
          if (ans.answerMatrix) matrixMap = JSON.parse(ans.answerMatrix);
        } catch {}
      }

      return {
        ...q,
        questionType: q.questionType as FormQuestionData["questionType"],
        config: cfg,
        answer: ans
          ? ({
              ...ans,
              answerOptions: optArray,
              answerRanking: rankingArray,
              answerMatrix: matrixMap,
            } as FormAttemptAnswerData)
          : null,
      };
    });

    return NextResponse.json({
      attempt: {
        ...attempt,
        questionsWithAnswers,
      },
    });
  } catch (error) {
    console.error("RESPONSE_DETAIL_GET_ERROR", error);
    return NextResponse.json({ message: "Failed to fetch response detail." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "PATCH courses/[courseId]/forms/[formId]/responses/[attemptId]/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const { courseId, formId, attemptId } = await context.params;
    const body = await request.json();
    const { answerId, pointsAwarded, feedback } = body as {
      answerId: string;
      pointsAwarded: number;
      feedback?: string;
    };

    if (!answerId || pointsAwarded === undefined) {
      return NextResponse.json({ message: "answerId and pointsAwarded are required." }, { status: 400 });
    }

    const answer = await db.formAttemptAnswer.findUnique({
      where: { id: answerId },
      include: {
        attempt: {
          include: {
            form: true,
          },
        },
        question: true,
      },
    });

    if (!answer || answer.attemptId !== attemptId || answer.attempt.formId !== formId) {
      return NextResponse.json({ message: "Answer record not found." }, { status: 404 });
    }

    const maxPts = answer.question.points;
    const clampedPts = Math.max(0, Math.min(Number(pointsAwarded), maxPts));

    // Update answer
    await db.formAttemptAnswer.update({
      where: { id: answerId },
      data: {
        pointsAwarded: clampedPts,
        isCorrect: clampedPts > 0,
        instructorGraded: true,
        feedback: feedback !== undefined ? feedback : answer.feedback,
      },
    });

    // Re-sum all answers for this attempt
    const allAnswers = await db.formAttemptAnswer.findMany({
      where: { attemptId },
    });

    const newRawScore = allAnswers.reduce((sum, a) => sum + (a.pointsAwarded || 0), 0);
    const totalPossible = answer.attempt.totalPoints || answer.attempt.form.totalPoints || 1;
    const percentage = Math.round((newRawScore / totalPossible) * 10000) / 100;
    const passed = answer.attempt.form.passingScore ? newRawScore >= answer.attempt.form.passingScore : null;

    await db.formAttempt.update({
      where: { id: attemptId },
      data: {
        rawScore: newRawScore,
        percentage,
        passed,
      },
    });

    // Re-sync to gradebook
    await syncAttemptScoreToGradebook({
      formId,
      userId: answer.attempt.userId,
      attemptId,
      earnedScore: newRawScore,
      totalPoints: totalPossible,
    });

    return NextResponse.json({
      success: true,
      newScore: newRawScore,
      percentage,
      passed,
    });
  } catch (error) {
    console.error("MANUAL_GRADING_PATCH_ERROR", error);
    return NextResponse.json({ message: "Failed to update manual grade." }, { status: 500 });
  }
}
