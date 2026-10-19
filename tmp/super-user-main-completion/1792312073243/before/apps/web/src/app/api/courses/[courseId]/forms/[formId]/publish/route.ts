import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import { validateFormForPublish } from "@/lib/forms/form-validator";
import { createNotificationsForCourseStudents } from "@/lib/notifications";
import type { FormData, FormQuestionData } from "@/types/forms";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
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
      include: {
        questions: { orderBy: { position: "asc" } },
        course: { select: { id: true, title: true } },
      },
    });

    if (!form || form.courseId !== courseId) {
      return NextResponse.json({ message: "Form not found." }, { status: 404 });
    }

    const parsedQuestions: FormQuestionData[] = form.questions.map((q) => {
      let cfg = {};
      try {
        cfg = JSON.parse(q.config || "{}");
      } catch {
        cfg = {};
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
      questions: parsedQuestions,
    };

    // Validation
    const validation = validateFormForPublish(parsedForm);
    if (!validation.isValid) {
      return NextResponse.json(
        { message: "Form cannot be published yet.", errors: validation.errors },
        { status: 400 }
      );
    }

    // Compute total points
    const totalPoints = form.questions
      .filter((q) => q.questionType !== "SECTION_HEADER")
      .reduce((sum, q) => sum + (q.points || 0), 0);

    const updated = await db.$transaction(async (tx) => {
      const pubForm = await tx.form.update({
        where: { id: formId },
        data: {
          status: "PUBLISHED",
          totalPoints,
        },
      });

      await tx.syllabusItem.update({
        where: { id: form.syllabusItemId },
        data: {
          maxPoints: Math.round(totalPoints),
        },
      });

      return pubForm;
    });

    // Notify enrolled students
    try {
      await createNotificationsForCourseStudents(courseId, {
        type: "CLASSWORK",
        title: `New Assessment: ${form.title}`,
        message: `Your instructor published a new ${form.formType.toLowerCase().replace("_", " ")}: ${form.title}.`,
        link: `/${courseId}/classwork/${form.syllabusItemId}`,
      });
    } catch (notifErr) {
      console.warn("NOTIFY_STUDENTS_FORM_ERROR", notifErr);
    }

    return NextResponse.json({
      success: true,
      status: "PUBLISHED",
      totalPoints,
      form: updated,
    });
  } catch (error) {
    console.error("FORM_PUBLISH_ERROR", error);
    return NextResponse.json({ message: "Failed to publish form." }, { status: 500 });
  }
}
