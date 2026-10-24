import { evaluateQuestionVisibility } from '@/lib/forms/conditional-logic';
import { formIsOpen } from '@/lib/forms/availability';
import { requireFormAccess } from '@/lib/forms/access';
import { accountErrorResponse, AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getSessionFromRequest } from "@/lib/api-auth";
import { gradeAnswer } from "@/lib/forms/auto-grader";
import { syncAttemptScoreToGradebook } from "@/lib/forms/gradebook-sync";
import type { QuestionConfig, QuestionType } from "@/types/forms";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string; attemptId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "POST courses/[courseId]/forms/[formId]/attempts/[attemptId]/submit/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const { courseId, formId, attemptId } = await context.params;
    await requireFormAccess(session.user, courseId, formId, false);
    const body = await request.json().catch(() => ({}));
    const clientTabSwitches = typeof body.tabSwitchCount === "number" ? body.tabSwitchCount : 0;
    const clientCopyPastes = typeof body.copyPasteCount === "number" ? body.copyPasteCount : 0;

    const result = await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(['form-attempt', attemptId])}, 0))`;
    const attempt = await tx.formAttempt.findUnique({
      where: { id: attemptId },
      include: {
        form: {
          include: {
            questions: { orderBy: { position: "asc" } },
          },
        },
        answers: true,
      },
    });

    if (!attempt || attempt.formId !== formId || attempt.form.courseId !== courseId) {
      throw new AccessError(404, "Attempt not found.");
    }

    if (attempt.userId !== session.user.id) {
      throw new AccessError(403, "Access denied.");
    }

    if (attempt.status === "SUBMITTED" || attempt.status === "TIMED_OUT" && attempt.rawScore !== null || attempt.status === "ABANDONED") {
      throw new AccessError(409, "Attempt has already been submitted or closed.");
    }

    const decode = (value: string | null) => { try { return value ? JSON.parse(value) : null; } catch { return null; } };
    const visibleQuestions = evaluateQuestionVisibility(attempt.form.questions.map(question => ({ ...question, questionType: question.questionType as QuestionType, config: decode(question.config) || {} })), Object.fromEntries(attempt.answers.map(answer => [answer.questionId, { answerText: answer.answerText, answerNumber: answer.answerNumber, answerOptions: decode(answer.answerOptions) }]))).filter(question => question.isVisible);
    const questionsMap = new Map<string, (typeof attempt.form.questions)[0]>();
    const visibleIds = new Set(visibleQuestions.map(question => question.id));
    attempt.form.questions.filter(question => visibleIds.has(question.id)).forEach(question => questionsMap.set(question.id, question));

    let totalEarned = 0;
    let totalPossible = 0;

    const gradingUpdates = [];

    for (const ans of attempt.answers) {
      const q = questionsMap.get(ans.questionId);
      if (!q || q.questionType === "SECTION_HEADER") continue;

      let cfg: QuestionConfig = {};
      try {
        cfg = JSON.parse(q.config || "{}");
      } catch {}

      let optArray: string[] | null = null;
      let rankingArray: string[] | null = null;
      let matrixMap: Record<string, string> | null = null;

      try {
        if (ans.answerOptions) optArray = JSON.parse(ans.answerOptions);
      } catch {}
      try {
        if (ans.answerRanking) rankingArray = JSON.parse(ans.answerRanking);
      } catch {}
      try {
        if (ans.answerMatrix) matrixMap = JSON.parse(ans.answerMatrix);
      } catch {}

      const grade = gradeAnswer({
        questionType: q.questionType as QuestionType,
        points: q.points,
        partialCredit: q.partialCredit,
        config: cfg,
        answerText: ans.answerText,
        answerOptions: optArray,
        answerNumber: ans.answerNumber,
        answerDate: ans.answerDate,
        answerRanking: rankingArray,
        answerMatrix: matrixMap,
        fileUrl: ans.fileUrl,
      });

      totalEarned += grade.earned;
      totalPossible += q.points;

      gradingUpdates.push(
        tx.formAttemptAnswer.update({
          where: { id: ans.id },
          data: {
            pointsAwarded: grade.earned,
            isCorrect: grade.isCorrect,
            autoGraded: true,
            feedback: grade.feedback,
          },
        })
      );
    }

    // Also account for unanswered questions
    const answeredQuestionIds = new Set(attempt.answers.map((a) => a.questionId));
    for (const q of visibleQuestions) {
      if (q.questionType === "SECTION_HEADER") continue;
      if (!answeredQuestionIds.has(q.id)) {
        totalPossible += q.points;
      }
    }

    const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 10000) / 100 : 0;
    const passed = attempt.form.passingScore !== null ? totalEarned >= attempt.form.passingScore : null;

    const now = new Date();
    const timeSpent = Math.max(0, Math.round((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000));

    // Execute updates in transaction
    await Promise.all([
      ...gradingUpdates,
      tx.formAttempt.update({
        where: { id: attemptId },
        data: {
          status: !formIsOpen(attempt.form, now) || attempt.deadlineAt && now >= attempt.deadlineAt ? "TIMED_OUT" : "SUBMITTED",
          submittedAt: now,
          timeSpentSecs: timeSpent,
          rawScore: totalEarned,
          totalPoints: totalPossible,
          percentage,
          passed,
          tabSwitchCount: Math.max(attempt.tabSwitchCount || 0, clientTabSwitches),
          copyPasteCount: Math.max(attempt.copyPasteCount || 0, clientCopyPastes),
        },
      }),
    ]);

    return { attempt, totalEarned, totalPossible, percentage, passed };
    }, { timeout: 15000 });
    const { attempt, totalEarned, totalPossible, percentage, passed } = result;

    // Sync to gradebook
    await syncAttemptScoreToGradebook({
      formId,
      userId: session.user.id,
      attemptId,
      earnedScore: totalEarned,
      totalPoints: totalPossible,
    });

    return NextResponse.json({
      success: true,
      score: attempt.form.showScoreAfter ? totalEarned : null,
      totalPoints: attempt.form.showScoreAfter ? totalPossible : null,
      percentage: attempt.form.showScoreAfter ? percentage : null,
      passed: attempt.form.showScoreAfter ? passed : null,
      confirmationMessage: attempt.form.confirmationMessage || "Your response has been submitted successfully.",
    });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("ATTEMPT_SUBMIT_ERROR", error);
    return NextResponse.json({ message: "Failed to submit attempt." }, { status: 500 });
  }
}
