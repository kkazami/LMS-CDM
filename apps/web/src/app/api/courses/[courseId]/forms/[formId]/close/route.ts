import { publicForm } from '@/lib/forms/availability';
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
  const ceilingDenial = await denyLegacyApi(request, "POST courses/[courseId]/forms/[formId]/close/route.ts");
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

    const updated = await db.form.update({
      where: { id: formId },
      data: { status: "CLOSED" },
    });

    return NextResponse.json({ success: true, status: "CLOSED", form: publicForm(updated) });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("FORM_CLOSE_ERROR", error);
    return NextResponse.json({ message: "Failed to close form." }, { status: 500 });
  }
}
