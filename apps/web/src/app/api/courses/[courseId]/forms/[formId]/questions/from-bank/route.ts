import { requireFormAccess } from '@/lib/forms/access';
import { accountErrorResponse, AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
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

    const role = canonicalRole(session.user.role);
    if (role !== "INSTRUCTOR" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const { courseId, formId } = await context.params;
    await requireFormAccess(session.user, courseId, formId, true);
    const body = await request.json();
    if (body.sectionId && !await db.formSection.findFirst({ where: { id: body.sectionId, formId } })) throw new AccessError(400, 'Section does not belong to this form.');
    if (body.showIfQuestionId && !await db.formQuestion.findFirst({ where: { id: body.showIfQuestionId, formId } })) throw new AccessError(400, 'Conditional question does not belong to this form.');
    if (body.points !== undefined && (typeof body.points !== 'number' || !Number.isFinite(body.points) || body.points < 0)) throw new AccessError(400, 'Question points must be a non-negative number.');

    const { bankItemIds, sectionId } = body as { bankItemIds: string[]; sectionId?: string };

    if (!Array.isArray(bankItemIds) || bankItemIds.length === 0) {
      return NextResponse.json({ message: "bankItemIds array is required." }, { status: 400 });
    }

    const bankItems = await db.questionBankItem.findMany({
      where: { id: { in: bankItemIds }, OR: [{ createdBy: session.user.id }, { courseId }] },
    });

    if (bankItems.length !== new Set(bankItemIds).size) throw new AccessError(403, 'Question bank items are unavailable.');
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
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("QUESTIONS_FROM_BANK_ERROR", error);
    return NextResponse.json({ message: "Failed to import questions from bank." }, { status: 500 });
  }
}
