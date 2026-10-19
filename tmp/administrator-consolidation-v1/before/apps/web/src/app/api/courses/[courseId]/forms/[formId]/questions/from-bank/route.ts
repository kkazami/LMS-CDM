import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "POST courses/[courseId]/forms/[formId]/questions/from-bank/route.ts");
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
    const body = await request.json();
    const { bankItemIds, sectionId } = body as { bankItemIds: string[]; sectionId?: string };

    if (!Array.isArray(bankItemIds) || bankItemIds.length === 0) {
      return NextResponse.json({ message: "bankItemIds array is required." }, { status: 400 });
    }

    const bankItems = await db.questionBankItem.findMany({
      where: { id: { in: bankItemIds } },
    });

    const lastQ = await db.formQuestion.findFirst({
      where: { formId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    let startPos = (lastQ?.position ?? -1) + 1;

    const created = await db.$transaction(async (tx) => {
      const results = [];
      for (const item of bankItems) {
        const q = await tx.formQuestion.create({
          data: {
            formId,
            sectionId: sectionId || null,
            bankItemId: item.id,
            questionType: item.questionType,
            prompt: item.prompt,
            config: item.config,
            points: item.points,
            position: startPos++,
            isRequired: true,
          },
        });

        // Increment timesUsed in bank
        await tx.questionBankItem.update({
          where: { id: item.id },
          data: { timesUsed: { increment: 1 } },
        });

        results.push(q);
      }
      return results;
    });

    return NextResponse.json({ success: true, count: created.length, questions: created });
  } catch (error) {
    console.error("QUESTIONS_FROM_BANK_ERROR", error);
    return NextResponse.json({ message: "Failed to import questions from bank." }, { status: 500 });
  }
}
