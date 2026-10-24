import { formIsOpen } from '@/lib/forms/availability';
import { requireFormAccess } from '@/lib/forms/access';
import { accountErrorResponse, AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { requireOwnedUpload } from '@/lib/private-upload';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string; attemptId: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "PUT courses/[courseId]/forms/[formId]/attempts/[attemptId]/answers/route.ts");
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
      include: { form: true },
    });

    if (!attempt || attempt.formId !== formId || attempt.form.courseId !== courseId) {
      return NextResponse.json({ message: "Attempt not found." }, { status: 404 });
    }

    if (attempt.userId !== session.user.id) {
      return NextResponse.json({ message: "Access denied." }, { status: 403 });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ message: "This attempt is already submitted or closed." }, { status: 400 });
    }

    if (!formIsOpen(attempt.form) || attempt.deadlineAt && new Date() >= attempt.deadlineAt) throw new AccessError(403, 'Time expired for this attempt. Submit your saved answers.');

    const body = await request.json();
    const {
      questionId,
      answerText,
      answerOptions,
      answerNumber,
      answerDate,
      answerRanking,
      answerMatrix,
      fileUrl,
      fileName,
      fileSizeBytes,
    } = body;

    if (!questionId) {
      return NextResponse.json({ message: "questionId is required." }, { status: 400 });
    }

    if (!await db.formQuestion.findFirst({ where: { id: questionId, formId } })) throw new AccessError(400, 'Question does not belong to this form.');
    if (fileUrl) await requireOwnedUpload(db, session.user, String(fileUrl));
    // Prepare serializable storage values
    const stringifiedOptions = Array.isArray(answerOptions) ? JSON.stringify(answerOptions) : null;
    const stringifiedRanking = Array.isArray(answerRanking) ? JSON.stringify(answerRanking) : null;
    const stringifiedMatrix = typeof answerMatrix === "object" && answerMatrix !== null ? JSON.stringify(answerMatrix) : null;
    const parsedDate = answerDate ? new Date(answerDate) : null;

    const answer = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(['form-attempt', attemptId])}, 0))`;
      const current = await tx.formAttempt.findUniqueOrThrow({ where: { id: attemptId }, include: { form: true } });
      if (current.status !== 'IN_PROGRESS' || !formIsOpen(current.form) || current.deadlineAt && new Date() >= current.deadlineAt) throw new AccessError(403, 'This attempt is closed for answers.');
      return tx.formAttemptAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      create: {
        attemptId,
        questionId,
        answerText: answerText !== undefined ? String(answerText) : null,
        answerOptions: stringifiedOptions,
        answerNumber: answerNumber !== undefined && answerNumber !== null ? Number(answerNumber) : null,
        answerDate: parsedDate,
        answerRanking: stringifiedRanking,
        answerMatrix: stringifiedMatrix,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSizeBytes: fileSizeBytes ? Number(fileSizeBytes) : null,
        answeredAt: new Date(),
      },
      update: {
        answerText: answerText !== undefined ? String(answerText) : null,
        answerOptions: stringifiedOptions,
        answerNumber: answerNumber !== undefined && answerNumber !== null ? Number(answerNumber) : null,
        answerDate: parsedDate,
        answerRanking: stringifiedRanking,
        answerMatrix: stringifiedMatrix,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSizeBytes: fileSizeBytes ? Number(fileSizeBytes) : null,
        answeredAt: new Date(),
      },
    });

    });

    return NextResponse.json({ saved: true, answerId: answer.id });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("AUTOSAVE_PUT_ERROR", error);
    return NextResponse.json({ message: "Failed to save answer." }, { status: 500 });
  }
}
