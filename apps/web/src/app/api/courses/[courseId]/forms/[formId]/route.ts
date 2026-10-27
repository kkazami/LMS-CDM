import { lockFormForWrite } from '@/lib/forms/mutations';
import { parseFormSettings, checkFormSchedule } from '@/lib/forms/settings';
import { publicForm, studentQuestionConfig } from '@/lib/forms/availability';
import { requireFormAccess } from '@/lib/forms/access';
import { accountErrorResponse, AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import type { FormData, FormQuestionData } from "@/types/forms";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "GET courses/[courseId]/forms/[formId]/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const { courseId, formId } = await context.params;
    await requireFormAccess(session.user, courseId, formId, false);
    const form = await db.form.findUnique({
      where: { id: formId },
      include: {
        sections: {
          orderBy: { position: "asc" },
        },
        questions: {
          orderBy: { position: "asc" },
        },
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!form || form.courseId !== courseId) {
      return NextResponse.json({ message: "Form not found." }, { status: 404 });
    }

    const role = canonicalRole(session.user.role);
    const isInstructor = role === "INSTRUCTOR" || role === "ADMIN";

    const canReadQuestions = isInstructor || !form.passwordHash || Boolean(await db.formAttempt.findFirst({ where: { formId, userId: session.user.id }, select: { id: true } }));

    // Parse question configs from JSON string
    const parsedQuestions: FormQuestionData[] = form.questions.map((q) => {
      let cfg = {};
      try {
        cfg = JSON.parse(q.config || "{}");
      } catch {
        cfg = {};
      }

      if (!isInstructor) cfg = studentQuestionConfig(q.config);

      return {
        ...q,
        questionType: q.questionType as FormQuestionData["questionType"],
        config: cfg,
      };
    });

    const parsedForm: FormData = {
      ...publicForm(form),
      formType: form.formType as FormData["formType"],
      status: form.status as FormData["status"],
      scoreToKeep: form.scoreToKeep as FormData["scoreToKeep"],
      hasPassword: Boolean(form.passwordHash),
      questions: canReadQuestions ? parsedQuestions : [],
      sections: canReadQuestions ? form.sections : [],
    };

    return NextResponse.json({ form: parsedForm });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("FORM_GET_ERROR", error);
    return NextResponse.json({ message: "Failed to fetch form." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "PATCH courses/[courseId]/forms/[formId]/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = canonicalRole(session.user.role);
    if (role !== "INSTRUCTOR" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const { courseId, formId } = await context.params;
    await requireFormAccess(session.user, courseId, formId, true);
    const existing = await db.form.findUnique({
      where: { id: formId },
      include: { course: true },
    });

    if (!existing || existing.courseId !== courseId) {
      return NextResponse.json({ message: "Form not found." }, { status: 404 });
    }

    const body = parseFormSettings(await request.json());
    checkFormSchedule({ opensAt: body.opensAt === undefined ? existing.opensAt : body.opensAt, closesAt: body.closesAt === undefined ? existing.closesAt : body.closesAt });
    const updateData: Record<string, unknown> = {};

    const allowedFields = [
      "title",
      "description",
      "formType",
      "timeLimitMins",
      "maxAttempts",
      "scoreToKeep",
      "shuffleQuestions",
      "shuffleOptions",
      "showScoreAfter",
      "showAnswersAfter",
      "showFeedbackAfter",
      "isProctored",
      "disableCopyPaste",
      "detectTabSwitch",
      "lockBrowser",
      "passingScore",
      "themeColor",
      "headerImageUrl",
      "confirmationMessage",
    ];

    allowedFields.forEach((field) => {
      if (body[field as keyof typeof body] !== undefined) {
        updateData[field] = body[field as keyof typeof body];
      }
    });

    if (body.opensAt !== undefined) {
      updateData.opensAt = body.opensAt ? new Date(body.opensAt) : null;
    }
    if (body.closesAt !== undefined) {
      updateData.closesAt = body.closesAt ? new Date(body.closesAt) : null;
    }

    // Password handling
    if (body.password !== undefined) {
      if (body.password && body.password.trim().length > 0) {
        const { hash } = await import("bcryptjs");
        updateData.passwordHash = await hash(body.password.trim(), 10);
      } else {
        updateData.passwordHash = null;
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const current = await lockFormForWrite(tx, session.user, courseId, formId);
      checkFormSchedule({ opensAt: body.opensAt === undefined ? current.opensAt : body.opensAt, closesAt: body.closesAt === undefined ? current.closesAt : body.closesAt });
      const started = await tx.formAttempt.count({ where: { formId } });
      if (started && ((body.formType && body.formType !== current.formType) || (body.opensAt && body.opensAt > new Date()))) throw new AccessError(409, 'Students have started this assessment. Keep its category and start date; create a new assessment to change them.');
      const form = await tx.form.update({
        where: { id: formId },
        data: updateData,
      });

      // Keep backing SyllabusItem title, description, and settings synced
      {
        await tx.syllabusItem.update({
          where: { id: form.syllabusItemId },
          data: {
            type: form.formType,
            title: form.title,
            description: form.description,
            dueDate: form.closesAt,
            enableIntegrityMonitoring: form.isProctored || form.detectTabSwitch,
            requireFullscreen: form.lockBrowser,
          },
        });
      }

      // Re-project completed scores immediately when the retention or visibility policy changes.
      if (started && (body.scoreToKeep !== undefined || body.maxAttempts !== undefined || body.showScoreAfter !== undefined)) {
        const item = await tx.syllabusItem.findUniqueOrThrow({ where: { id: form.syllabusItemId }, select: { maxPoints: true } });
        const attempts = await tx.formAttempt.findMany({ where: { formId, status: { in: ['SUBMITTED', 'TIMED_OUT'] }, rawScore: { not: null }, totalPoints: { not: null } }, select: { userId: true, rawScore: true, totalPoints: true }, orderBy: { attemptNumber: 'asc' } });
        const byStudent = new Map<string, number[]>();
        for (const attempt of attempts) {
          const scores = byStudent.get(attempt.userId) ?? [];
          scores.push(attempt.totalPoints! > 0 ? Math.max(0, Math.min(item.maxPoints ?? attempt.totalPoints!, attempt.rawScore! / attempt.totalPoints! * (item.maxPoints ?? attempt.totalPoints!))) : 0);
          byStudent.set(attempt.userId, scores);
        }
        for (const [studentId, scores] of byStudent) {
          const score = form.scoreToKeep === 'AVERAGE' ? scores.reduce((a, b) => a + b, 0) / scores.length : form.scoreToKeep === 'LATEST' ? scores[scores.length - 1] : Math.max(...scores);
          await tx.studentSubmission.updateMany({ where: { syllabusItemId: form.syllabusItemId, studentId }, data: { grade: Math.round(score * 100) / 100, isReturned: form.showScoreAfter } });
        }
      }
      return form;
    });

    return NextResponse.json({ success: true, form: publicForm(updated) });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("FORM_PATCH_ERROR", error);
    return NextResponse.json({ message: "Failed to update form." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "DELETE courses/[courseId]/forms/[formId]/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = canonicalRole(session.user.role);
    if (role !== "INSTRUCTOR" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const { courseId, formId } = await context.params;
    await requireFormAccess(session.user, courseId, formId, true);
    const form = await db.form.findUnique({
      where: { id: formId },
    });

    if (!form || form.courseId !== courseId) {
      return NextResponse.json({ message: "Form not found." }, { status: 404 });
    }

    // Delete backing syllabusItem (cascades to Form)
    await db.$transaction(async tx => {
      await lockFormForWrite(tx, session.user, courseId, formId);
      if (await tx.formAttempt.count({ where: { formId } })) throw new AccessError(409, 'Students have started this assessment. Close it instead to preserve their work and grades.');
      await tx.syllabusItem.delete({ where: { id: form.syllabusItemId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("FORM_DELETE_ERROR", error);
    return NextResponse.json({ message: "Failed to delete form." }, { status: 500 });
  }
}
