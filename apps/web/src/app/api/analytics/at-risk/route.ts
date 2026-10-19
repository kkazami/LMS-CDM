import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import { calculateRiskLevel, type StudentActivityData } from "@/lib/risk-scoring";
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

    // Fetch independent metrics together, with the same course access filter.
    const [enrollments, syllabusItems, submissions] = await Promise.all([
      db.enrollment.findMany({
        where: {
          status: "APPROVED",
          course: courseScope,
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              code: true,
            },
          },
        },
        orderBy: { student: { name: "asc" } },
      }),

      db.syllabusItem.findMany({
        where: {
          course: courseScope,
        },
        select: {
          id: true,
          title: true,
          type: true,
          dueDate: true,
          maxPoints: true,
          courseId: true,
        },
      }),

      db.studentSubmission.findMany({
        where: {
          syllabusItem: {
            course: courseScope,
          },
        },
        select: {
          id: true,
          syllabusItemId: true,
          studentId: true,
          status: true,
          grade: true,
          submittedAt: true,
          updatedAt: true,
        },
      }),
    ]);

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
    });
  } catch (error) {
    console.error("AT_RISK_STUDENTS_API_ERROR", error);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
