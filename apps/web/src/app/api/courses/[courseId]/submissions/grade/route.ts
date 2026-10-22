import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { AccessError, assertMutationOrigin, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { gradeInput, gradeSubmission } from '@/lib/academic-records';

export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    const denial = await denyLegacyApi(request, 'POST courses/[courseId]/submissions/grade/route.ts');
    if (denial) return denial;
    const session = await getSessionFromRequest(request);
    if (!session) throw new AccessError(401, 'Not authenticated.');
    assertMutationOrigin(request);
    const input = gradeInput.safeParse(await request.json());
    if (!input.success) throw new AccessError(400, 'Invalid grade or feedback.');
    const { courseId } = await context.params;
    const { submission } = await gradeSubmission(session.user, input.data.submissionId, input.data.grade, input.data.feedback, courseId);
    return NextResponse.json({ success: true, submission: {
      id: submission.id, syllabusItemId: submission.syllabusItemId, studentId: submission.studentId, studentName: submission.student.name,
      grade: submission.grade, status: submission.status, isReturned: submission.isReturned,
      submittedAt: submission.submittedAt?.toISOString() ?? null, attachments: submission.attachments,
    } });
  } catch (error) { return accountErrorResponse(error); }
}
