import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkIteEligibilityFromRequest } from "@/lib/ite/ite-eligibility";
import { computeEngagement } from "@/lib/ite/engagement-service";
import type { RiskReason } from "@/lib/ite/risk-service";
import type { RiskLevel } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/ite/students/my-participation
 *
 * Returns the current student's participation data across all their ITE courses.
 * Each student sees ONLY their own data.
 *
 * Response: { courses: StudentCourseParticipation[] }
 */
export async function GET(request: Request) {
  try {
    let eligibility;
    try {
      eligibility = await checkIteEligibilityFromRequest(request);
    } catch {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    if (!eligibility) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }
    if (!eligibility.eligible) {
      return NextResponse.json({ message: "ITE students only." }, { status: 403 });
    }

    const { userId, role } = eligibility;

    // Students only — instructors/admins use the instructor route
    if (role !== "STUDENT") {
      return NextResponse.json({ message: "Students only." }, { status: 403 });
    }

    // Fetch all APPROVED ITE course enrollments for this student
    const iteInstitute = await db.institute.findFirst({
      where: { code: "ite" },
      select: { id: true },
    });
    if (!iteInstitute) {
      return NextResponse.json({ courses: [] });
    }

    const enrollments = await db.enrollment.findMany({
      where: {
        studentId: userId,
        status: "APPROVED",
        course: { instituteId: iteInstitute.id, isArchived: false },
      },
      select: {
        courseId: true,
        course: { select: { id: true, title: true, code: true } },
      },
    });

    const courses = await Promise.all(
      enrollments.map(async ({ course }) => {
        const [engagement, assessment] = await Promise.all([
          computeEngagement(userId, course.id),
          db.riskAssessment.findUnique({
            where: { studentId_courseId: { studentId: userId, courseId: course.id } },
            select: {
              level: true,
              reasons: true,
              engagementScore: true,
              computedAt: true,
            },
          }),
        ]);

        // On-time rate from engagement components
        const onTimeRate =
          engagement.components.onTimeRate !== "insufficient_data"
            ? engagement.components.onTimeRate
            : null;

        const riskLevel: RiskLevel = assessment?.level ?? "LOW";
        const reasons = (assessment?.reasons as unknown as RiskReason[]) ?? [];

        return {
          courseId: course.id,
          courseTitle: course.title,
          courseCode: course.code,
          engagementScore: engagement.score,
          trend: engagement.trend,
          dailySeries: engagement.dailySeries,
          onTimeRate,
          riskLevel,
          reasons,
          lastActivityAt: engagement.lastActivityAt?.toISOString() ?? null,
          hasEnoughData: engagement.dailySeries.some((d: { count: number }) => d.count > 0),
        };
      })
    );

    return NextResponse.json({ courses });
  } catch (err) {
    console.error("[ITE_MY_PARTICIPATION_ERROR]", err);
    return NextResponse.json({ message: "Internal error." }, { status: 500 });
  }
}
