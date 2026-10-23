import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireIteUser } from "@/lib/ite/ite-eligibility";
import { computeRisk } from "@/lib/ite/risk-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/ite/courses/[courseId]/risk/recalculate
 *
 * On-demand risk recalculation for the instructor of a specific ITE course.
 * Does NOT send any alert notifications.
 *
 * Auth: ITE user + must be the course instructor.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    // ── Auth & ITE guard ───────────────────────────────────────
    let eligibility;
    try {
      eligibility = await requireIteUser(request);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      return NextResponse.json({ message: e.message ?? "Forbidden" }, { status: e.status ?? 403 });
    }

    const { userId, role } = eligibility;

    // ── Resolve course + verify ownership ─────────────────────
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true, institute: { select: { code: true } } },
    });

    if (!course) {
      return NextResponse.json({ message: "Course not found." }, { status: 404 });
    }
    if (course.institute.code.toLowerCase() !== "ite") {
      return NextResponse.json({ message: "This feature is ITE-only." }, { status: 403 });
    }

    const isInstructor = course.instructorId === userId;
    const isAdmin = role === "ADMIN";
    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ message: "Only the course instructor may recalculate risk." }, { status: 403 });
    }

    // ── Fetch APPROVED enrollments ─────────────────────────────
    const enrollments = await db.enrollment.findMany({
      where: { courseId, status: "APPROVED" },
      select: { studentId: true },
    });

    let recalculated = 0;
    let skipped = 0;

    for (const enrollment of enrollments) {
      const result = await computeRisk(enrollment.studentId, courseId);
      if (result.skipped) {
        skipped++;
      } else {
        recalculated++;
      }
    }

    return NextResponse.json({ recalculated, skipped, message: "Risk assessment updated." });
  } catch (err) {
    console.error("[RISK_RECALCULATE_ERROR]", err);
    return NextResponse.json({ message: "Internal error." }, { status: 500 });
  }
}
