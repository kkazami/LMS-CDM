import { formIsOpen, formDeadline, studentQuestionConfig } from '@/lib/forms/availability';
import { requireFormAccess } from '@/lib/forms/access';
import { accountErrorResponse, AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import { shuffleQuestionsAndOptions } from "@/lib/forms/shuffle";
import type { FormQuestionData } from "@/types/forms";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "GET courses/[courseId]/forms/[formId]/attempts/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const { courseId, formId } = await context.params;
    await requireFormAccess(session.user, courseId, formId, false);
    const form = await db.form.findUniqueOrThrow({ where: { id: formId } });
    const attempts = await db.formAttempt.findMany({
      where: {
        formId,
        userId: session.user.id,
      },
      orderBy: { attemptNumber: "desc" },
    });

    return NextResponse.json({ attempts: attempts.map(attempt => session.user.role.toUpperCase() === 'STUDENT' && !form.showScoreAfter ? { ...attempt, rawScore: null, percentage: null, passed: null } : attempt) });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("ATTEMPTS_GET_ERROR", error);
    return NextResponse.json({ message: "Failed to fetch attempts." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "POST courses/[courseId]/forms/[formId]/attempts/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const { courseId, formId } = await context.params;
    await requireFormAccess(session.user, courseId, formId);
    const body = await request.json().catch(() => ({}));
    const result = await db.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(['form-start', formId, session.user.id])}, 0))`;
      await requireFormAccess(session.user, courseId, formId, false, tx);
      const form = await tx.form.findUniqueOrThrow({ where: { id: formId }, include: { sections: { orderBy: { position: 'asc' } }, questions: { orderBy: { position: 'asc' } } } });
      const now = new Date();
      if (!formIsOpen(form, now)) throw new AccessError(403, 'This form is not open for responses.');
      if (form.passwordHash) {
        const { compare } = await import('bcryptjs');
        if (typeof body.password !== 'string' || !await compare(body.password, form.passwordHash)) throw new AccessError(401, 'Invalid form password.');
      }
      const active = await tx.formAttempt.findFirst({ where: { formId, userId: session.user.id, status: 'IN_PROGRESS' }, include: { answers: true } });
      if (active) return { form, attempt: active };
      const previousCount = await tx.formAttempt.count({ where: { formId, userId: session.user.id } });
      if (previousCount >= form.maxAttempts) throw new AccessError(403, `You have reached the maximum attempt limit (${form.maxAttempts}) for this form.`);
      const attempt = await tx.formAttempt.create({ data: { formId, userId: session.user.id, attemptNumber: previousCount + 1, status: 'IN_PROGRESS', deadlineAt: formDeadline(form, now), ipAddress: request.headers.get('x-forwarded-for'), userAgent: request.headers.get('user-agent') } });
      return { form, attempt };
    });
    const { form, attempt } = result;
    // Prepare questions for student view
    const rawQuestions: FormQuestionData[] = form.questions.map((q) => {
      let cfg = {};
      try {
        cfg = JSON.parse(q.config || "{}");
      } catch {
        cfg = {};
      }

      cfg = studentQuestionConfig(q.config);

      return {
        ...q,
        questionType: q.questionType as FormQuestionData["questionType"],
        config: cfg,
      };
    });

    // Shuffle if enabled
    const processedQuestions = shuffleQuestionsAndOptions(
      rawQuestions,
      attempt.id,
      form.shuffleQuestions,
      form.shuffleOptions
    );

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      deadlineAt: attempt.deadlineAt,
      sections: form.sections,
      questions: processedQuestions,
    });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("ATTEMPT_START_ERROR", error);
    return NextResponse.json({ message: "Failed to start form attempt." }, { status: 500 });
  }
}
