import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

/**
 * GET /api/grades?institute=...
 * Returns real enrollment-gated grades and summaries for the authenticated student.
 */
export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET grades/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const studentId = session.user.id;
    const { searchParams } = new URL(request.url);
    const instituteCode = searchParams.get('institute');

    // Resolve optional institute filter
    let instituteId: string | undefined;
    if (instituteCode) {
      const inst = await db.institute.findUnique({
        where: { code: instituteCode.toLowerCase() },
        select: { id: true },
      });
      if (inst) {
        instituteId = inst.id;
      }
    }

    // 1. Fetch student's APPROVED enrollments
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId,
        status: "APPROVED",
        course: {
          ...(instituteId ? { instituteId } : {}),
          isArchived: false,
        },
      },
      select: {
        course: {
          select: {
            id: true,
            title: true,
            code: true,
          },
        },
      },
      orderBy: { displayOrderIndex: "asc" },
    });

    const enrolledCourses = enrollments.map((e) => e.course);
    const courseIds = enrolledCourses.map((c) => c.id);

    if (courseIds.length === 0) {
      return NextResponse.json({
        grades: [],
        summary: [],
        enrolledCourses: [],
      });
    }

    // 2. Fetch GRADED submissions for this student across enrolled courses
    const gradedSubmissions = await db.studentSubmission.findMany({
      where: {
        studentId,
        grade: { not: null },
        status: { in: ["GRADED", "RETURNED"] },
        syllabusItem: {
          courseId: { in: courseIds },
          type: { not: "MATERIAL" }, // Only ASSIGNMENT and QUIZ
          maxPoints: { not: null, gt: 0 },
        },
      },
      include: {
        syllabusItem: {
          select: {
            id: true,
            title: true,
            type: true,
            maxPoints: true,
            dueDate: true,
            courseId: true,
            course: {
              select: {
                id: true,
                title: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 3. Map to standard Grade[] items
    const grades = gradedSubmissions.map((sub) => ({
      id: sub.id,
      value: sub.grade!,
      maxValue: sub.syllabusItem.maxPoints!,
      courseId: sub.syllabusItem.courseId,
      courseName: sub.syllabusItem.course.title,
      courseCode: sub.syllabusItem.course.code,
      assignmentTitle: sub.syllabusItem.title,
      itemType: sub.syllabusItem.type,
      gradedAt: (sub.updatedAt || sub.submittedAt || new Date()).toISOString(),
    }));

    // 4. Compute GradeSummary[] per enrolled course
    const summary = enrolledCourses.map((course) => {
      const courseGrades = grades.filter((g) => g.courseId === course.id);
      const totalPoints = courseGrades.reduce((sum, g) => sum + g.maxValue, 0);
      const earnedPoints = courseGrades.reduce((sum, g) => sum + g.value, 0);
      const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

      return {
        courseId: course.id,
        courseName: course.title,
        courseCode: course.code,
        totalPoints,
        earnedPoints,
        percentage,
        gradeCount: courseGrades.length,
      };
    });

    return NextResponse.json({
      grades,
      summary,
      enrolledCourses,
    });
  } catch (error) {
    console.error('GRADES_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
