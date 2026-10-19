import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "POST courses/[courseId]/forms/[formId]/sections/route.ts");
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
    const { title = "Untitled Section", description = null } = body;

    const lastSection = await db.formSection.findFirst({
      where: { formId },
      orderBy: { pageNumber: "desc" },
    });

    const pageNumber = (lastSection?.pageNumber ?? 1) + 1;
    const position = (lastSection?.position ?? 0) + 1;

    const section = await db.formSection.create({
      data: {
        formId,
        title,
        description,
        position,
        pageNumber,
      },
    });

    return NextResponse.json({ success: true, section });
  } catch (error) {
    console.error("SECTION_POST_ERROR", error);
    return NextResponse.json({ message: "Failed to create section." }, { status: 500 });
  }
}
