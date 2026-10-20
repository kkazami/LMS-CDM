import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import { calculateRiskLevel, type StudentActivityData } from "@/lib/risk-scoring";
import { AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole } from "@/lib/super-user-v1/capabilities";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/at-risk?courseId=...
 * Computes real at-risk metrics per (student, course) pair.
 * Each student enrollment in a course produces a separate risk assessment card.
 */
export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET analytics/at-risk/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const role = canonicalRole(session.user.role);
    if (role !== "INSTRUCTOR" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const now = new Date();

    const courseScope = {
      instituteId: session.user.instituteId,
      isArchived: false,
      ...(role === "ADMIN" ? {} : { instructorId: session.user.id }),
      ...(courseId && courseId !== "all" ? { id: courseId } : {}),
    };

    const page = Number(searchParams.get('page') || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000) throw new AccessError(400, 'Invalid page.');
    const where = { status: 'APPROVED', course: courseScope };
    const [enrollments, total] = await Promise.all([
      db.enrollment.findMany({ where, select: { student: { select: { id: true, name: true, email: true, avatarUrl: true } }, course: { select: { id: true, title: true, code: true } } }, orderBy: [{ student: { name: 'asc' } }, { id: 'asc' }], skip: (page - 1) * 50, take: 50 }),
      db.enrollment.count({ where }),
    ]);
    const syllabusItems = await db.syllabusItem.findMany({ where: { courseId: { in: [...new Set(enrollments.map(e => e.course.id))] }, course: courseScope }, select: { id: true, title: true, type: true, dueDate: true, maxPoints: true, courseId: true }, take: 2001 });
    if (syllabusItems.length > 2000) throw new AccessError(422, 'This view exceeds 2,000 activities. Select a course to narrow the analysis.');
    const submissions = await db.studentSubmission.findMany({ where: { studentId: { in: enrollments.map(e => e.student.id) }, syllabusItemId: { in: syllabusItems.map(i => i.id) } }, select: { id: true, syllabusItemId: true, studentId: true, status: true, grade: true, submittedAt: true, updatedAt: true } });
    // Submission lookup map: [studentId][syllabusItemId] -> submission
    const submissionMap = new Map<string, Map<string, typeof submissions[0]>>();
    for (const sub of submissions) {
      if (!submissionMap.has(sub.studentId)) {
        submissionMap.set(sub.studentId, new Map());
      }
      submissionMap.get(sub.studentId)!.set(sub.syllabusItemId, sub);
    }

    // Syllabus items grouped by course
    const itemsByCourse = new Map<string, typeof syllabusItems>();
    for (const item of syllabusItems) {
      if (!itemsByCourse.has(item.courseId)) {
        itemsByCourse.set(item.courseId, []);
      }
      itemsByCourse.get(item.courseId)!.push(item);
    }

    // 4. Compute risk score per (student, course) pair separately
    const studentRiskResults = enrollments.map((e) => {
      const student = e.student;
      const course = e.course;
      const courseItems = itemsByCourse.get(course.id) || [];
      const studentSubs = submissionMap.get(student.id) || new Map();

      const missedAssignments: StudentActivityData["missedAssignments"] = [];
      const gradedSubmissions: StudentActivityData["gradedSubmissions"] = [];
      const incompleteModules: StudentActivityData["incompleteModules"] = [];
      let totalGradePercentSum = 0;
      let gradedCount = 0;
      let lastActive: Date | null = null;

      for (const item of courseItems) {
        const sub = studentSubs.get(item.id);

        if (sub?.submittedAt) {
          if (!lastActive || sub.submittedAt > lastActive) lastActive = sub.submittedAt;
        }
        if (sub?.updatedAt) {
          if (!lastActive || sub.updatedAt > lastActive) lastActive = sub.updatedAt;
        }

        // Graded items
        if (sub?.grade !== null && sub?.grade !== undefined && item.maxPoints && item.maxPoints > 0) {
          const percent = (sub.grade / item.maxPoints) * 100;
          totalGradePercentSum += percent;
          gradedCount++;
          gradedSubmissions.push({
            id: item.id,
            title: item.title,
            score: sub.grade,
            maxPoints: item.maxPoints,
          });
        }

        // Missed assignments (past due date & no submitted work)
        if (item.type !== "MATERIAL" && item.dueDate && new Date(item.dueDate) < now) {
          if (!sub || sub.status === "DRAFT" || !sub.submittedAt) {
            missedAssignments.push({
              id: item.id,
              title: item.title,
              dueDate: item.dueDate.toISOString(),
            });
          }
        }

        // Incomplete modules (MATERIAL items not submitted/completed)
        if (item.type === "MATERIAL") {
          if (!sub || sub.status !== "SUBMITTED") {
            incompleteModules.push({
              id: item.id,
              title: item.title,
              type: item.type,
            });
          }
        }
      }

      const gradeAverage = gradedCount > 0 ? totalGradePercentSum / gradedCount : null;
      const daysInactive = lastActive
        ? Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const activityData: StudentActivityData = {
        studentId: student.id,
        studentName: student.name,
        email: student.email,
        avatarUrl: student.avatarUrl,
        missedAssignments,
        gradedSubmissions,
        gradeAverage,
        lastActiveDate: lastActive ? lastActive.toISOString() : null,
        daysInactive,
        incompleteModules,
      };

      const riskResult = calculateRiskLevel(activityData);

      // Composite unique ID for this (student, course) pair
      const compositeId = `${student.id}-${course.id}`;

      return {
        ...riskResult,
        id: compositeId,
        studentId: student.id,
        courseId: course.id,
        courseTitle: course.title,
        courseCode: course.code,
      };
    });

    // Sort by riskScore descending (High risk first)
    studentRiskResults.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({
      atRiskStudents: studentRiskResults,
      pagination: { page, total, totalPages: Math.max(1, Math.ceil(total / 50)), pageSize: 50 },
    });
  } catch (error) {
    console.error("AT_RISK_STUDENTS_API_ERROR", error);
    return NextResponse.json({ message: error instanceof AccessError ? error.message : "Something went wrong." }, { status: error instanceof AccessError ? error.status : 500 });
  }
}
