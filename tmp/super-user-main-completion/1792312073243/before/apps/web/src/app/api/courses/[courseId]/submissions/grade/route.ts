import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { grantExp } from '@/lib/gamification/grant-exp';
import { awardBadgeIfEarned } from '@/lib/gamification/badge-checker';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * POST /api/courses/[courseId]/submissions/grade
 * Evaluates and returns a student submission with score, feedback, EXP incentives, and notification.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== 'PROFESSOR' && role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ message: 'Instructors only.' }, { status: 403 });
    }

    const { courseId } = await context.params;
    const body = await request.json();
    const { submissionId, grade: rawGrade, feedback } = body;

    if (!submissionId || rawGrade === undefined || rawGrade === null) {
      return NextResponse.json({ message: 'submissionId and grade are required.' }, { status: 400 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true, code: true, instituteId: true },
    });

    if (!course) {
      return NextResponse.json({ message: 'Course not found.' }, { status: 404 });
    }

    if (role !== 'ADMIN' && course.instructorId !== session.user.id) {
      return NextResponse.json({ message: 'You are not the instructor for this course.' }, { status: 403 });
    }

    const existingSubmission = await db.studentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        syllabusItem: {
          select: {
            id: true,
            title: true,
            type: true,
            maxPoints: true,
            courseId: true,
          },
        },
      },
    });

    if (!existingSubmission || existingSubmission.syllabusItem.courseId !== courseId) {
      return NextResponse.json({ message: 'Submission not found in this course.' }, { status: 404 });
    }

    let grade = Math.max(0, Number(rawGrade));
    const maxPoints = existingSubmission.syllabusItem.maxPoints;
    if (maxPoints !== null && maxPoints !== undefined) {
      grade = Math.min(maxPoints, grade);
    }

    // Update submission status to RETURNED
    const updatedSubmission = await db.studentSubmission.update({
      where: { id: submissionId },
      data: {
        grade,
        status: 'RETURNED',
        isReturned: true,
      },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
        attachments: true,
      },
    });

    // Save private feedback comment if provided
    if (feedback && typeof feedback === 'string' && feedback.trim().length > 0) {
      await db.privateComment.create({
        data: {
          courseId,
          senderId: session.user.id,
          recipientId: existingSubmission.studentId,
          content: feedback.trim(),
        },
      });
    }

    // Evaluate Grade Incentive Rules for bonus EXP
    try {
      const courseRules = await db.gradeIncentiveRule.findMany({
        where: { courseId, isActive: true },
      });

      for (const rule of courseRules) {
        if (grade >= rule.gradeMin) {
          await grantExp({
            userId: existingSubmission.studentId,
            amount: rule.bonusExp,
            reason: `Grade Incentive: ${rule.label} (${grade} pts in ${course.code})`,
            source: 'grade_incentive',
            courseId,
          });
        }
      }

      if (maxPoints && grade >= maxPoints) {
        await awardBadgeIfEarned(existingSubmission.studentId, 'perfect-score');
      }
    } catch (incentiveErr) {
      console.error('GRADE_INCENTIVE_ERROR', incentiveErr);
    }

    // Dispatch in-app notification to the student
    const itemTypeLabel = existingSubmission.syllabusItem.type === 'QUIZ' ? 'Quiz' : 'Assignment';
    const scoreDisplay = maxPoints ? `${grade}/${maxPoints}` : `${grade}`;
    await createNotification({
      userId: existingSubmission.studentId,
      type: 'GRADE',
      title: `${itemTypeLabel} Graded: ${existingSubmission.syllabusItem.title}`,
      message: `Your instructor returned a score of ${scoreDisplay} for ${existingSubmission.syllabusItem.title}.`,
      link: `/${courseId}/grades`,
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: updatedSubmission.id,
        syllabusItemId: updatedSubmission.syllabusItemId,
        studentId: updatedSubmission.studentId,
        studentName: updatedSubmission.student.name,
        grade: updatedSubmission.grade,
        status: updatedSubmission.status,
        isReturned: updatedSubmission.isReturned,
        submittedAt: updatedSubmission.submittedAt?.toISOString() || null,
        attachments: updatedSubmission.attachments,
      },
    });
  } catch (error) {
    console.error('GRADE_SUBMISSION_POST_ERROR', error);
    return NextResponse.json({ message: 'Failed to grade submission.' }, { status: 500 });
  }
}
