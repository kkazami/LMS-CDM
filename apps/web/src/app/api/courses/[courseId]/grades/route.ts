import { visibleSyllabusForms } from '@/lib/forms/availability';
import { requireCourseAccess } from '@/lib/course-access';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { percentToGradePoint, formatGradePoint, getGradeRemark } from '@/lib/grading/ph-scale';

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/courses/[courseId]/grades
 * Fetches student's score breakdown, completion metrics, and instructor feedback notes.
 */
export async function GET(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "GET courses/[courseId]/grades/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;
    await requireCourseAccess(session.user, courseId);

    const [gradableItems, studentSubmissions, feedbackComments] = await Promise.all([
      db.syllabusItem.findMany({
        where: {
          courseId,
          type: { not: 'MATERIAL' },
          maxPoints: { not: null },
          ...(session.user.role.toUpperCase() === 'STUDENT' ? visibleSyllabusForms(undefined, session.user.id) : {}),
        },
        select: {
          id: true,
          title: true,
          type: true,
          maxPoints: true,
          dueDate: true,
          form: { select: { showScoreAfter: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      db.studentSubmission.findMany({
        where: {
          studentId: session.user.id,
          syllabusItem: { courseId },
        },
        select: {
          id: true,
          syllabusItemId: true,
          status: true,
          grade: true,
          isReturned: true,
          submittedAt: true,
        },
      }),
      db.privateComment.findMany({
        where: {
          courseId,
          recipientId: session.user.id,
        },
        include: {
          sender: {
            select: { name: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const subMap = new Map<string, any>();
    studentSubmissions.forEach((sub) => {
      subMap.set(sub.syllabusItemId, sub);
    });

    let totalPossiblePoints = 0;
    let totalEarnedPoints = 0;
    let completedCount = 0;
    let gradedCount = 0;
    let missingCount = 0;

    const items = gradableItems.map((item) => {
      const sub = subMap.get(item.id);
      const maxPts = item.maxPoints || 100;
      const score = item.form?.showScoreAfter === false ? null : typeof sub?.grade === 'number' ? sub.grade : null;
      const isSubmitted = sub?.status === 'SUBMITTED' || sub?.status === 'GRADED';
      const isPastDue = item.dueDate ? new Date(item.dueDate) < new Date() : false;

      if (score !== null) {
        totalEarnedPoints += score;
        totalPossiblePoints += maxPts;
        gradedCount++;
        completedCount++;
      } else if (isSubmitted) {
        completedCount++;
      } else if (isPastDue) {
        missingCount++;
      }

      return {
        id: item.id,
        title: item.title,
        type: item.type,
        maxPoints: maxPts,
        score,
        status: score !== null ? 'GRADED' : isSubmitted ? 'SUBMITTED' : isPastDue ? 'MISSING' : 'ASSIGNED',
        dueDate: item.dueDate ? item.dueDate.toISOString() : null,
      };
    });

    const averagePercentage =
      totalPossiblePoints > 0
        ? Math.round((totalEarnedPoints / totalPossiblePoints) * 100)
        : null;

    const gradePoint = averagePercentage !== null ? percentToGradePoint(averagePercentage) : null;
    const gradePointFormatted = gradePoint !== null ? formatGradePoint(gradePoint) : 'N/A';
    const remark = gradePoint !== null ? getGradeRemark(gradePoint) : 'N/A';

    return NextResponse.json(
      {
        summary: {
          averagePercentage,
          gradePoint,
          gradePointFormatted,
          remark,
          totalEarnedPoints,
          totalPossiblePoints,
          totalItems: gradableItems.length,
          completedCount,
          gradedCount,
          missingCount,
        },
        items,
        feedback: feedbackComments.map((f) => ({
          id: f.id,
          content: f.content,
          senderName: f.sender.name,
          senderAvatar: f.sender.avatarUrl,
          createdAt: f.createdAt.toISOString(),
        })),
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error('COURSE_GRADES_GET_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch course grades.' }, { status: 500 });
  }
}
