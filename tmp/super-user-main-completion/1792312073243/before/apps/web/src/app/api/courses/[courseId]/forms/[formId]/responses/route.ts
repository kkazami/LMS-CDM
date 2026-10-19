import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
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
    const url = new URL(request.url);
    const search = url.searchParams.get("q") || "";
    const sort = url.searchParams.get("sort") || "date_desc";

    const attempts = await db.formAttempt.findMany({
      where: {
        formId,
        form: { courseId },
        status: { in: ["SUBMITTED", "TIMED_OUT"] },
        ...(search
          ? {
              user: {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { studentNumber: { contains: search, mode: "insensitive" } },
                ],
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            studentNumber: true,
            avatarUrl: true,
          },
        },
      },
      orderBy:
        sort === "score_desc"
          ? { percentage: "desc" }
          : sort === "score_asc"
          ? { percentage: "asc" }
          : sort === "name_asc"
          ? { user: { name: "asc" } }
          : { submittedAt: "desc" },
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("RESPONSES_GET_ERROR", error);
    return NextResponse.json({ message: "Failed to fetch responses." }, { status: 500 });
  }
}
