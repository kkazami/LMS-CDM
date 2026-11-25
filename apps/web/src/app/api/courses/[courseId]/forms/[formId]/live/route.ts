import { requireFormAccess } from "@/lib/forms/access";
import { getFormLiveMonitorSnapshot } from "@/lib/forms/live-monitor";
import { getSessionFromRequest } from "@/lib/api-auth";
import { AccessError, accountErrorResponse } from "@/lib/super-user-v1/actor";
import { canonicalRole } from "@/lib/super-user-v1/capabilities";
import { denyLegacyApi } from "@/lib/super-user-v1/legacy-entry-guard";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(
    request,
    "GET courses/[courseId]/forms/[formId]/live/route.ts"
  );
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

    const snapshot = await getFormLiveMonitorSnapshot(courseId, formId);
    if (!snapshot) {
      return NextResponse.json({ message: "Form not found." }, { status: 404 });
    }

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("FORM_LIVE_MONITOR_GET_ERROR", error);
    return NextResponse.json(
      { message: "Failed to fetch live form monitor snapshot." },
      { status: 500 }
    );
  }
}
