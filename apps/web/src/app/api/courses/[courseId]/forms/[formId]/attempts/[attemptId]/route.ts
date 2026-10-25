import { publicForm } from '@/lib/forms/availability';
import { requireFormAccess } from '@/lib/forms/access';
import { accountErrorResponse, AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getSessionFromRequest } from "@/lib/api-auth";
import type { FormAttemptAnswerData } from "@/types/forms";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string; attemptId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "GET courses/[courseId]/forms/[formId]/attempts/[attemptId]/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const { courseId, formId, attemptId } = await context.params;
    await requireFormAccess(session.user, courseId, formId, false);
    const attempt = await db.formAttempt.findUnique({
      where: { id: attemptId },
      include: {
        form: true,
        answers: true,
      },
    });

    if (!attempt || attempt.formId !== formId || attempt.form.courseId !== courseId) {
      return NextResponse.json({ message: "Attempt not found." }, { status: 404 });
    }

    const role = canonicalRole(session.user.role);
    const isOwner = attempt.userId === session.user.id;
    const isInstructor = role === "INSTRUCTOR" || role === "ADMIN";

    if (!isOwner && !isInstructor) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    // Parse answers data
    const parsedAnswers: FormAttemptAnswerData[] = attempt.answers.map((ans) => {
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

      return {
        id: ans.id,
        attemptId: ans.attemptId,
        questionId: ans.questionId,
        answerText: ans.answerText,
        answerOptions: optArray,
        answerNumber: ans.answerNumber,
        answerDate: ans.answerDate,
        answerRanking: rankingArray,
        answerMatrix: matrixMap,
        fileUrl: ans.fileUrl,
        fileName: ans.fileName,
        fileSizeBytes: ans.fileSizeBytes,
        isCorrect: isInstructor || attempt.form.showAnswersAfter ? ans.isCorrect : null,
        pointsAwarded: isInstructor || attempt.form.showScoreAfter ? ans.pointsAwarded : null,
        autoGraded: ans.autoGraded,
        instructorGraded: ans.instructorGraded,
        feedback: isInstructor || attempt.form.showFeedbackAfter ? ans.feedback : null,
        answeredAt: ans.answeredAt,
      };
    });

    return NextResponse.json({
      attempt: {
        ...attempt,
        form: publicForm(attempt.form),
        ...(!isInstructor && !attempt.form.showScoreAfter ? { rawScore: null, percentage: null, passed: null } : {}),
        answers: parsedAnswers,
      },
    });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("ATTEMPT_DETAIL_GET_ERROR", error);
    return NextResponse.json({ message: "Failed to fetch attempt." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "PATCH courses/[courseId]/forms/[formId]/attempts/[attemptId]/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const { courseId, formId, attemptId } = await context.params;
    await requireFormAccess(session.user, courseId, formId, false);
    const body = await request.json().catch(() => ({}));
    const { action, tabSwitchCount, copyPasteCount } = body as {
      action?: "TAB_SWITCH" | "COPY_PASTE";
      tabSwitchCount?: number;
      copyPasteCount?: number;
    };

    const attempt = await db.formAttempt.findUnique({
      where: { id: attemptId },
      include: { form: true },
    });

    if (!attempt || attempt.formId !== formId || attempt.form.courseId !== courseId) {
      return NextResponse.json({ message: "Attempt not found." }, { status: 404 });
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    const nextTabSwitchCount =
      typeof tabSwitchCount === "number"
        ? Math.max(attempt.tabSwitchCount || 0, tabSwitchCount)
        : action === "TAB_SWITCH"
        ? (attempt.tabSwitchCount || 0) + 1
        : undefined;

    const nextCopyPasteCount =
      typeof copyPasteCount === "number"
        ? Math.max(attempt.copyPasteCount || 0, copyPasteCount)
        : action === "COPY_PASTE"
        ? (attempt.copyPasteCount || 0) + 1
        : undefined;

    const updated = await db.formAttempt.update({
      where: { id: attemptId },
      data: {
        ...(nextTabSwitchCount !== undefined ? { tabSwitchCount: nextTabSwitchCount } : {}),
        ...(nextCopyPasteCount !== undefined ? { copyPasteCount: nextCopyPasteCount } : {}),
      },
      select: {
        tabSwitchCount: true,
        copyPasteCount: true,
      },
    });

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("ATTEMPT_INTEGRITY_PATCH_ERROR", error);
    return NextResponse.json({ message: "Failed to update attempt integrity." }, { status: 500 });
  }
}

