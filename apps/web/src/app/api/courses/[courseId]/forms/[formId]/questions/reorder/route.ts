import { requireFormAccess } from '@/lib/forms/access';
import { editFormDefinition } from '@/lib/forms/mutations';
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
  const ceilingDenial = await denyLegacyApi(request, "POST courses/[courseId]/forms/[formId]/questions/reorder/route.ts");
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
    const { orderedIds } = body as { orderedIds: string[] };

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ message: "orderedIds array is required." }, { status: 400 });
    }

    await editFormDefinition(session.user, courseId, formId, async tx => {
    const ids = await tx.formQuestion.findMany({ where: { formId }, select: { id: true } });
    if (new Set(orderedIds).size !== orderedIds.length || orderedIds.length !== ids.length || ids.some(question => !orderedIds.includes(question.id))) throw new AccessError(400, 'Provide each question in this form exactly once.');
    await Promise.all(
      orderedIds.map((id, index) =>
        tx.formQuestion.update({
          where: { id, formId },
          data: { position: index },
        })
      )
    );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("QUESTIONS_REORDER_ERROR", error);
    return NextResponse.json({ message: "Failed to reorder questions." }, { status: 500 });
  }
}
