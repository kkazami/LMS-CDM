import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/courses/[courseId]/grades
 * Fetches student's score breakdown, completion metrics, and instructor feedback notes.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;

    const [gradableItems, studentSubmissions, feedbackComments] = await Promise.all([
      db.syllabusItem.findMany({
        where: {
          courseId,
          type: { not: 'MATERIAL' },
          maxPoints: { not: null },
        },
        select: {
          id: true,
          title: true,
          type: true,
          maxPoints: true,
          dueDate: true,
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
      const score = typeof sub?.grade === 'number' ? sub.grade : null;
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

    let letterGrade = 'N/A';
    if (averagePercentage !== null) {
      if (averagePercentage >= 90) letterGrade = 'A';
      else if (averagePercentage >= 80) letterGrade = 'B';
      else if (averagePercentage >= 70) letterGrade = 'C';
      else if (averagePercentage >= 60) letterGrade = 'D';
      else letterGrade = 'F';
    }

    return NextResponse.json(
      {
        summary: {
          averagePercentage,
          letterGrade,
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
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('COURSE_GRADES_GET_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch course grades.' }, { status: 500 });
  }
}
