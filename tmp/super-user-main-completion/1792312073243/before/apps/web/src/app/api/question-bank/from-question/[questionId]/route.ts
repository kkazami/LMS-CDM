import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ questionId: string }>;
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

    const { questionId } = await context.params;
    const question = await db.formQuestion.findUnique({
      where: { id: questionId },
      include: { form: true },
    });

    if (!question) {
      return NextResponse.json({ message: "Question not found." }, { status: 404 });
    }

    const bankItem = await db.questionBankItem.create({
      data: {
        courseId: question.form.courseId,
        createdBy: session.user.id,
        questionType: question.questionType,
        prompt: question.prompt,
        config: question.config,
        points: question.points,
        tags: JSON.stringify([question.form.formType]),
        timesUsed: 1,
      },
    });

    // Link question to bank item
    await db.formQuestion.update({
      where: { id: questionId },
      data: { bankItemId: bankItem.id },
    });

    return NextResponse.json({ success: true, bankItem });
  } catch (error) {
    console.error("SAVE_QUESTION_TO_BANK_ERROR", error);
    return NextResponse.json({ message: "Failed to save question to bank." }, { status: 500 });
  }
}
