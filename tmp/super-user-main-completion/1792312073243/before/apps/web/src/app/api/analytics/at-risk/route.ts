import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import { calculateRiskLevel, type StudentActivityData } from "@/lib/risk-scoring";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/at-risk?courseId=...
 * Computes real at-risk metrics per (student, course) pair.
 * Each student enrollment in a course produces a separate risk assessment card.
 */
export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const role = (session.user.role as string).toUpperCase();
    if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const now = new Date();

    // Resolve target course IDs
    let courseIds: string[] = [];
    if (courseId && courseId !== "all") {
      courseIds = [courseId];
    } else {
      const taughtCourses = await db.course.findMany({
        where: role === "ADMIN" ? {} : { instructorId: session.user.id },
        select: { id: true },
      });
      courseIds = taughtCourses.map((c) => c.id);
    }

    if (courseIds.length === 0) {
      return NextResponse.json({ atRiskStudents: [] });
    }

    // 1. Fetch APPROVED enrollments for target courses
    const enrollments = await db.enrollment.findMany({
      where: {
        courseId: { in: courseIds },
        status: "APPROVED",
        course: { isArchived: false },
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
    });

    // 2. Fetch all syllabus items for these courses
    const syllabusItems = await db.syllabusItem.findMany({
      where: {
        courseId: { in: courseIds },
      },
      select: {
        id: true,
        title: true,
        type: true,
        dueDate: true,
        maxPoints: true,
        courseId: true,
      },
    });

    // 3. Fetch submissions for these items
    const submissions = await db.studentSubmission.findMany({
      where: {
        syllabusItem: {
          courseId: { in: courseIds },
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
    });

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

    console.log(`[AT_RISK_API] Evaluated ${studentRiskResults.length} student-course pairs across ${courseIds.length} course(s).`);

    return NextResponse.json({
      atRiskStudents: studentRiskResults,
    });
  } catch (error) {
    console.error("AT_RISK_STUDENTS_API_ERROR", error);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
