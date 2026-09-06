import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/courses/[courseId]/classwork
 * Fetches structured syllabus items, attachments, and student's personal submission state.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;

    const [syllabusItems, studentSubmissions] = await Promise.all([
      db.syllabusItem.findMany({
        where: { courseId },
        include: {
          attachments: {
            select: {
              id: true,
              type: true,
              url: true,
              fileName: true,
              fileSize: true,
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      }),
      db.studentSubmission.findMany({
        where: {
          studentId: session.user.id,
          syllabusItem: { courseId },
        },
        include: {
          attachments: {
            select: {
              id: true,
              type: true,
              url: true,
              fileName: true,
            },
          },
        },
      }),
    ]);

    const submissionMap = new Map<string, any>();
    studentSubmissions.forEach((sub) => {
      submissionMap.set(sub.syllabusItemId, {
        id: sub.id,
        status: sub.status,
        grade: sub.grade,
        isReturned: sub.isReturned,
        submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : null,
        attachments: sub.attachments,
      });
    });

    const formattedItems = syllabusItems.map((item) => {
      const submission = submissionMap.get(item.id) || null;
      return {
        id: item.id,
        type: item.type, // "ASSIGNMENT" | "QUIZ" | "MATERIAL" | "EXAM"
        title: item.title,
        description: item.description,
        maxPoints: item.maxPoints,
        dueDate: item.dueDate ? item.dueDate.toISOString() : null,
        orderIndex: item.orderIndex,
        attachments: item.attachments,
        submission,
      };
    });

    // Categorize by section/type
    const assignments = formattedItems.filter((i) => i.type === 'ASSIGNMENT');
    const quizzes = formattedItems.filter((i) => i.type === 'QUIZ');
    const materials = formattedItems.filter((i) => i.type === 'MATERIAL');
    const others = formattedItems.filter((i) => !['ASSIGNMENT', 'QUIZ', 'MATERIAL'].includes(i.type));

    return NextResponse.json(
      {
        items: formattedItems,
        categories: [
          { name: 'Assignments', count: assignments.length, items: assignments },
          { name: 'Quizzes & Assessments', count: quizzes.length, items: quizzes },
          { name: 'Learning Materials', count: materials.length, items: materials },
          ...(others.length > 0 ? [{ name: 'Other Modules', count: others.length, items: others }] : []),
        ],
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('COURSE_CLASSWORK_GET_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch course classwork.' }, { status: 500 });
  }
}
