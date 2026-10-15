import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireIteUser } from "@/lib/ite/ite-eligibility";
import { ITE_INSTITUTE_CODE } from "@/lib/ite/engagement-config";

export const dynamic = "force-dynamic";

/**
 * GET /api/ite/instructor/at-risk-summary
 *
 * Returns HIGH-risk students across all ITE courses taught by the caller.
 * Restricted to instructors (or admins) in ITE.
 *
 * Response: { entries: AtRiskEntry[] }
 */
export async function GET(request: Request) {
  try {
    let eligibility;
    try {
      eligibility = await requireIteUser(request);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      return NextResponse.json({ message: e.message ?? "Forbidden" }, { status: e.status ?? 403 });
    }

    const { userId, role } = eligibility;
    const isInstructor = role === "INSTRUCTOR";
    const isAdmin = role === "ADMIN";

    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const iteInstitute = await db.institute.findFirst({
      where: { code: ITE_INSTITUTE_CODE },
      select: { id: true },
    });

    if (!iteInstitute) {
      return NextResponse.json({ entries: [] });
    }

    // Resolve active ITE courses taught by instructor (or all if admin)
    const courses = await db.course.findMany({
      where: {
        instituteId: iteInstitute.id,
        isArchived: false,
        ...(isAdmin ? {} : { instructorId: userId }),
      },
      select: { id: true, title: true },
    });

    const courseIds = courses.map((c) => c.id);
    if (courseIds.length === 0) {
      return NextResponse.json({ entries: [] });
    }

    const courseTitleMap = new Map<string, string>(courses.map((c) => [c.id, c.title]));

    const assessments = await db.riskAssessment.findMany({
      where: {
        courseId: { in: courseIds },
        level: "HIGH",
      },
      select: {
        studentId: true,
        courseId: true,
        reasons: true,
        student: { select: { id: true, name: true } },
      },
      orderBy: { computedAt: "desc" },
    });

    const entries = assessments.map((a) => ({
      studentId: a.studentId,
      name: a.student.name,
      courseTitle: courseTitleMap.get(a.courseId) ?? "Unknown Course",
      courseId: a.courseId,
      riskLevel: "HIGH" as const,
      reasons: (a.reasons as { detail: string }[]) ?? [],
    }));

    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[ITE_INSTRUCTOR_AT_RISK_SUMMARY_ERROR]", err);
    return NextResponse.json({ message: "Internal error." }, { status: 500 });
  }
}
