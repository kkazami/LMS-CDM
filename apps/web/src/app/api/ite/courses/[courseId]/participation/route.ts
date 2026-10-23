import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireIteUser } from "@/lib/ite/ite-eligibility";
import type { RiskLevel } from "@prisma/client";
import type { RiskReason } from "@/lib/ite/risk-service";
import { computeEngagement } from "@/lib/ite/engagement-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/ite/courses/[courseId]/participation
 *
 * Returns per-student participation data for the ITE Participation tab.
 * Restricted to the course instructor (or admin).
 *
 * Response: { students: StudentParticipationRow[], kpis: CourseKpis, computedAt: string | null }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    let eligibility;
    try {
      eligibility = await requireIteUser(request);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      return NextResponse.json({ message: e.message ?? "Forbidden" }, { status: e.status ?? 403 });
    }

    const { userId, role } = eligibility;

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true, institute: { select: { code: true } } },
    });

    if (!course) return NextResponse.json({ message: "Course not found." }, { status: 404 });
    if (course.institute.code.toLowerCase() !== "ite") {
      return NextResponse.json({ message: "ITE-only." }, { status: 403 });
    }

    const isInstructor = course.instructorId === userId;
    const isAdmin = role === "ADMIN";
    if (!isInstructor && !isAdmin) {
      return NextResponse.json({ message: "Instructor access only." }, { status: 403 });
    }

    // ── Fetch enrolled students + their risk assessments ───────
    const enrollments = await db.enrollment.findMany({
      where: { courseId, status: "APPROVED" },
      select: {
        studentId: true,
        createdAt: true,
        student: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { student: { name: "asc" } },
    });

    const riskMap = new Map<string, {
      level: RiskLevel;
      riskScore: number;
      engagementScore: number;
      reasons: RiskReason[];
      computedAt: Date;
    }>();

    const assessments = await db.riskAssessment.findMany({
      where: { courseId, studentId: { in: enrollments.map((e) => e.studentId) } },
    });
    for (const a of assessments) {
      riskMap.set(a.studentId, {
        level: a.level,
        riskScore: a.riskScore,
        engagementScore: a.engagementScore,
        reasons: (a.reasons as unknown as RiskReason[]) ?? [],
        computedAt: a.computedAt,
      });
    }

    // ── Fetch overdue counts ───────────────────────────────────
    const now = new Date();
    const overdueItems = await db.syllabusItem.findMany({
      where: { courseId, type: { not: "MATERIAL" }, dueDate: { lt: now } },
      select: { id: true },
    });

    const submittedMap = new Map<string, Set<string>>();
    if (overdueItems.length > 0) {
      const subs = await db.studentSubmission.findMany({
        where: {
          syllabusItemId: { in: overdueItems.map((i) => i.id) },
          status: { not: "DRAFT" },
          submittedAt: { not: null },
        },
        select: { studentId: true, syllabusItemId: true },
      });
      for (const s of subs) {
        if (!submittedMap.has(s.studentId)) submittedMap.set(s.studentId, new Set());
        submittedMap.get(s.studentId)!.add(s.syllabusItemId);
      }
    }
    const overdueItemIds = new Set(overdueItems.map((i) => i.id));

    // ── Fetch grades ───────────────────────────────────────────
    const gradeMap = new Map<string, number | null>();
    {
      const gradedSubs = await db.studentSubmission.findMany({
        where: {
          grade: { not: null },
          syllabusItem: { courseId, maxPoints: { gt: 0 } },
          studentId: { in: enrollments.map((e) => e.studentId) },
        },
        select: {
          studentId: true,
          grade: true,
          syllabusItem: { select: { maxPoints: true } },
        },
      });
      const totals = new Map<string, { sum: number; count: number }>();
      for (const s of gradedSubs) {
        const pct = ((s.grade ?? 0) / (s.syllabusItem.maxPoints ?? 1)) * 100;
        const existing = totals.get(s.studentId) ?? { sum: 0, count: 0 };
        totals.set(s.studentId, { sum: existing.sum + pct, count: existing.count + 1 });
      }
      for (const [sid, { sum, count }] of totals) {
        gradeMap.set(sid, count > 0 ? Math.round(sum / count) : null);
      }
    }

    const now7DaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── Build rows ─────────────────────────────────────────────
    const students = await Promise.all(enrollments.map(async (e) => {
      const assessment = riskMap.get(e.studentId);
      const submitted = submittedMap.get(e.studentId) ?? new Set();
      const overdueCount = [...overdueItemIds].filter((id) => !submitted.has(id)).length;

      // Get engagement with daily series for trend arrow
      const engagement = await computeEngagement(e.studentId, courseId);

      return {
        studentId: e.studentId,
        name: e.student.name,
        email: e.student.email,
        avatarUrl: e.student.avatarUrl ?? null,
        engagementScore: assessment?.engagementScore ?? engagement.score,
        trend: engagement.trend,
        lastActivityAt: engagement.lastActivityAt?.toISOString() ?? null,
        overdueCount,
        gradeAvg: gradeMap.get(e.studentId) ?? null,
        riskLevel: assessment?.level ?? "LOW",
        riskScore: assessment?.riskScore ?? 0,
        reasons: assessment?.reasons ?? [],
        dailySeries: engagement.dailySeries,
        computedAt: assessment?.computedAt?.toISOString() ?? null,
      };
    }));

    // ── KPIs ───────────────────────────────────────────────────
    const activeThisWeek = students.filter(
      (s) => s.lastActivityAt && new Date(s.lastActivityAt) >= now7DaysAgo
    ).length;
    const avgEngagement = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + s.engagementScore, 0) / students.length)
      : 0;
    const highCount = students.filter((s) => s.riskLevel === "HIGH").length;
    const mediumCount = students.filter((s) => s.riskLevel === "MEDIUM").length;

    const latestComputedAt = assessments.length > 0
      ? assessments.reduce((latest: Date, a: { computedAt: Date }) => a.computedAt > latest ? a.computedAt : latest, assessments[0].computedAt)
      : null;

    const dailyActiveMap = new Map<string, Set<string>>();
    for (const s of students) {
      for (const point of s.dailySeries) {
        if (point.count > 0) {
          if (!dailyActiveMap.has(point.date)) dailyActiveMap.set(point.date, new Set());
          dailyActiveMap.get(point.date)!.add(s.studentId);
        }
      }
    }
    const courseDaily = Array.from(dailyActiveMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, set]) => ({ date, count: set.size }));

    return NextResponse.json({
      students,
      kpis: { activeThisWeek, avgEngagement, highCount, mediumCount },
      courseDaily,
      computedAt: latestComputedAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("[ITE_PARTICIPATION_API_ERROR]", err);
    return NextResponse.json({ message: "Internal error." }, { status: 500 });
  }
}
