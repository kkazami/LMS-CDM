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
    const attempts = await db.formAttempt.findMany({
      where: {
        formId,
        userId: session.user.id,
      },
      orderBy: { attemptNumber: "desc" },
    });

    return NextResponse.json({ attempts });
  } catch (error) {
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
    const form = await db.form.findUnique({
      where: { id: formId },
      include: {
        sections: { orderBy: { position: "asc" } },
        questions: { orderBy: { position: "asc" } },
      },
    });

    if (!form || form.courseId !== courseId) {
      return NextResponse.json({ message: "Form not found." }, { status: 404 });
    }

    if (form.status !== "PUBLISHED") {
      return NextResponse.json(
        { message: form.status === "CLOSED" ? "This form is closed." : "This form is not yet published." },
        { status: 403 }
      );
    }

    const now = new Date();
    if (form.opensAt && now < new Date(form.opensAt)) {
      return NextResponse.json(
        { message: `This form opens on ${new Date(form.opensAt).toLocaleString()}` },
        { status: 403 }
      );
    }

    if (form.closesAt && now > new Date(form.closesAt)) {
      return NextResponse.json({ message: "The deadline for this form has passed." }, { status: 403 });
    }

    const role = (session.user.role as string).toUpperCase();
    const isStudent = role === "STUDENT";

    // Verify enrollment for students
    if (isStudent) {
      const enrollment = await db.enrollment.findUnique({
        where: {
          courseId_studentId: { courseId, studentId: session.user.id },
        },
      });

      if (!enrollment || enrollment.status !== "APPROVED") {
        return NextResponse.json({ message: "You are not enrolled in this course." }, { status: 403 });
      }
    }

    // Password check if protected
    const body = await request.json().catch(() => ({}));
    if (form.passwordHash) {
      const password = body.password || "";
      const { compare } = await import("bcryptjs");
      const isMatch = await compare(password, form.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ message: "Invalid form password." }, { status: 401 });
      }
    }

    // Check if an in-progress attempt already exists
    const activeAttempt = await db.formAttempt.findFirst({
      where: {
        formId,
        userId: session.user.id,
        status: "IN_PROGRESS",
      },
    });

    if (activeAttempt) {
      // Check if expired
      if (activeAttempt.deadlineAt && new Date() > new Date(activeAttempt.deadlineAt)) {
        await db.formAttempt.update({
          where: { id: activeAttempt.id },
          data: { status: "TIMED_OUT", submittedAt: new Date() },
        });
      } else {
        // Return existing active attempt
        return NextResponse.json({
          attempt: activeAttempt,
          attemptId: activeAttempt.id,
          deadlineAt: activeAttempt.deadlineAt,
        });
      }
    }

    // Count previous completed attempts
    const previousCount = await db.formAttempt.count({
      where: { formId, userId: session.user.id },
    });

    if (previousCount >= form.maxAttempts) {
      return NextResponse.json(
        { message: `You have reached the maximum attempt limit (${form.maxAttempts}) for this form.` },
        { status: 403 }
      );
    }

    const attemptNumber = previousCount + 1;
    const deadlineAt = form.timeLimitMins
      ? new Date(Date.now() + form.timeLimitMins * 60 * 1000)
      : null;

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    const userAgent = request.headers.get("user-agent") || null;

    const attempt = await db.formAttempt.create({
      data: {
        formId,
        userId: session.user.id,
        attemptNumber,
        status: "IN_PROGRESS",
        deadlineAt,
        ipAddress: ip,
        userAgent,
      },
    });

    // Prepare questions for student view
    const rawQuestions: FormQuestionData[] = form.questions.map((q) => {
      let cfg = {};
      try {
        cfg = JSON.parse(q.config || "{}");
      } catch {
        cfg = {};
      }

      // Sanitize isCorrect so students can't inspect answer keys in DevTools
      const options = (cfg as { options?: Array<{ id: string; text: string; imageUrl?: string }> }).options;
      if (Array.isArray(options)) {
        cfg = {
          ...cfg,
          options: options.map((opt) => ({
            id: opt.id,
            text: opt.text,
            imageUrl: opt.imageUrl,
          })),
        };
      }
      if ((cfg as { shortAnswer?: unknown }).shortAnswer) {
        cfg = {
          ...cfg,
          shortAnswer: {},
        };
      }

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
    console.error("ATTEMPT_START_ERROR", error);
    return NextResponse.json({ message: "Failed to start form attempt." }, { status: 500 });
  }
}
