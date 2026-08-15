import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch courses the student is enrolled in
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId: session.user.id,
        status: "ACTIVE",
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
      },
    });

    const courses = enrollments.map((e) => ({
      id: e.course.id,
      title: e.course.title,
      code: e.course.code,
    }));

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("GET_ENROLLED_COURSES_ERROR", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
