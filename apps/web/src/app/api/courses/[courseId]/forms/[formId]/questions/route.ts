import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "POST courses/[courseId]/forms/[formId]/questions/route.ts");
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

    const { courseId, formId } = await context.params;
    const form = await db.form.findUnique({
      where: { id: formId },
      select: { id: true, courseId: true },
    });

    if (!form || form.courseId !== courseId) {
      return NextResponse.json({ message: "Form not found." }, { status: 404 });
    }

    const body = await request.json();
    const {
      sectionId,
      bankItemId,
      questionType = "MULTIPLE_CHOICE",
      prompt = "",
      description = null,
      mediaUrl = null,
      mediaType = null,
      position,
      isRequired = true,
      points = 1,
      partialCredit = false,
      config = {},
      showIfQuestionId = null,
      showIfAnswer = null,
      minLength = null,
      maxLength = null,
    } = body;

    // Calculate position if not provided
    let finalPos = position;
    if (finalPos === undefined || finalPos === null) {
      const lastQ = await db.formQuestion.findFirst({
        where: { formId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      finalPos = (lastQ?.position ?? -1) + 1;
    }

    const question = await db.formQuestion.create({
      data: {
        formId,
        sectionId: sectionId || null,
        bankItemId: bankItemId || null,
        questionType,
        prompt: (prompt ?? "").trim(),
        description: description ? description.trim() : null,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        position: finalPos,
        isRequired: Boolean(isRequired),
        points: questionType === "SECTION_HEADER" ? 0 : Number(points) || 1,
        partialCredit: Boolean(partialCredit),
        config: typeof config === "string" ? config : JSON.stringify(config),
        showIfQuestionId: showIfQuestionId || null,
        showIfAnswer: showIfAnswer ? String(showIfAnswer) : null,
        minLength: minLength ? Number(minLength) : null,
        maxLength: maxLength ? Number(maxLength) : null,
      },
    });

    return NextResponse.json({
      success: true,
      question: {
        ...question,
        config: typeof config === "object" ? config : JSON.parse(question.config || "{}"),
      },
    });
  } catch (error) {
    console.error("QUESTION_POST_ERROR", error);
    return NextResponse.json({ message: "Failed to create question." }, { status: 500 });
  }
}
