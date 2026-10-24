import { requireFormAccess } from '@/lib/forms/access';
import { accountErrorResponse, AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string; questionId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "PATCH courses/[courseId]/forms/[formId]/questions/[questionId]/route.ts");
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

    const { courseId, formId, questionId } = await context.params;
    await requireFormAccess(session.user, courseId, formId, true);
    const question = await db.formQuestion.findUnique({
      where: { id: questionId },
      include: { form: true },
    });

    if (!question || question.formId !== formId || question.form.courseId !== courseId) {
      return NextResponse.json({ message: "Question not found." }, { status: 404 });
    }

    const body = await request.json();
    if (body.sectionId && !await db.formSection.findFirst({ where: { id: body.sectionId, formId } })) throw new AccessError(400, 'Section does not belong to this form.');
    if (body.showIfQuestionId && !await db.formQuestion.findFirst({ where: { id: body.showIfQuestionId, formId } })) throw new AccessError(400, 'Conditional question does not belong to this form.');
    if (body.points !== undefined && (typeof body.points !== 'number' || !Number.isFinite(body.points) || body.points < 0)) throw new AccessError(400, 'Question points must be a non-negative number.');

    const updateData: Record<string, unknown> = {};

    const fields = [
      "prompt",
      "description",
      "questionType",
      "mediaUrl",
      "mediaType",
      "position",
      "isRequired",
      "points",
      "partialCredit",
      "sectionId",
      "showIfQuestionId",
      "showIfAnswer",
      "minLength",
      "maxLength",
    ];

    fields.forEach((f) => {
      if (body[f] !== undefined) {
        updateData[f] = body[f];
      }
    });

    if (body.config !== undefined) {
      updateData.config =
        typeof body.config === "string" ? body.config : JSON.stringify(body.config);
    }

    if (updateData.questionType === "SECTION_HEADER") {
      updateData.points = 0;
    }

    const updated = await db.formQuestion.update({
      where: { id: questionId },
      data: updateData,
    });

    let parsedConfig = {};
    try {
      parsedConfig = JSON.parse(updated.config || "{}");
    } catch {
      parsedConfig = {};
    }

    return NextResponse.json({
      success: true,
      question: {
        ...updated,
        config: parsedConfig,
      },
    });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("QUESTION_PATCH_ERROR", error);
    return NextResponse.json({ message: "Failed to update question." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "DELETE courses/[courseId]/forms/[formId]/questions/[questionId]/route.ts");
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

    const { courseId, formId, questionId } = await context.params;
    await requireFormAccess(session.user, courseId, formId, true);
    const question = await db.formQuestion.findUnique({
      where: { id: questionId },
      include: { form: true },
    });

    if (!question || question.formId !== formId || question.form.courseId !== courseId) {
      return NextResponse.json({ message: "Question not found." }, { status: 404 });
    }

    await db.formQuestion.delete({
      where: { id: questionId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("QUESTION_DELETE_ERROR", error);
    return NextResponse.json({ message: "Failed to delete question." }, { status: 500 });
  }
}
