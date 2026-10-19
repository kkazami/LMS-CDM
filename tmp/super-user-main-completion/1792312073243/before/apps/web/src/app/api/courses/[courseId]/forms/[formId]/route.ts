import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import type { FormData, FormQuestionData } from "@/types/forms";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const { courseId, formId } = await context.params;
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

    const role = (session.user.role as string).toUpperCase();
    const isInstructor = role === "PROFESSOR" || role === "TEACHER" || role === "ADMIN";

    // Parse question configs from JSON string
    const parsedQuestions: FormQuestionData[] = form.questions.map((q) => {
      let cfg = {};
      try {
        cfg = JSON.parse(q.config || "{}");
      } catch {
        cfg = {};
      }

      // If student is requesting the form and form is not submitted/completed,
      // sanitize isCorrect from options so answers aren't leaked in client payload!
      if (!isInstructor) {
        const options = (cfg as { options?: Array<{ id: string; text: string; isCorrect?: boolean; feedback?: string }> }).options;
        if (Array.isArray(options)) {
          cfg = {
            ...cfg,
            options: options.map((opt) => ({
              id: opt.id,
              text: opt.text,
              imageUrl: (opt as { imageUrl?: string }).imageUrl,
            })),
          };
        }
        // Also strip correct answers for short_answer
        if ((cfg as { shortAnswer?: unknown }).shortAnswer) {
          cfg = {
            ...cfg,
            shortAnswer: {},
          };
        }
      }

      return {
        ...q,
        questionType: q.questionType as FormQuestionData["questionType"],
        config: cfg,
      };
    });

    const parsedForm: FormData = {
      ...form,
      formType: form.formType as FormData["formType"],
      status: form.status as FormData["status"],
      scoreToKeep: form.scoreToKeep as FormData["scoreToKeep"],
      hasPassword: Boolean(form.passwordHash),
      questions: parsedQuestions,
    };

    return NextResponse.json({ form: parsedForm });
  } catch (error) {
    console.error("FORM_GET_ERROR", error);
    return NextResponse.json({ message: "Failed to fetch form." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const { courseId, formId } = await context.params;
    const existing = await db.form.findUnique({
      where: { id: formId },
      include: { course: true },
    });

    if (!existing || existing.courseId !== courseId) {
      return NextResponse.json({ message: "Form not found." }, { status: 404 });
    }

    const body = await request.json();
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
      if (body[field] !== undefined) {
        updateData[field] = body[field];
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
      const form = await tx.form.update({
        where: { id: formId },
        data: updateData,
      });

      // Keep backing SyllabusItem title, description, and settings synced
      if (updateData.title || updateData.description !== undefined || updateData.closesAt !== undefined) {
        await tx.syllabusItem.update({
          where: { id: form.syllabusItemId },
          data: {
            title: form.title,
            description: form.description,
            dueDate: form.closesAt,
            enableIntegrityMonitoring: form.isProctored || form.detectTabSwitch,
            requireFullscreen: form.lockBrowser,
          },
        });
      }

      return form;
    });

    return NextResponse.json({ success: true, form: updated });
  } catch (error) {
    console.error("FORM_PATCH_ERROR", error);
    return NextResponse.json({ message: "Failed to update form." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const { courseId, formId } = await context.params;
    const form = await db.form.findUnique({
      where: { id: formId },
    });

    if (!form || form.courseId !== courseId) {
      return NextResponse.json({ message: "Form not found." }, { status: 404 });
    }

    // Delete backing syllabusItem (cascades to Form)
    await db.syllabusItem.delete({
      where: { id: form.syllabusItemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("FORM_DELETE_ERROR", error);
    return NextResponse.json({ message: "Failed to delete form." }, { status: 500 });
  }
}
