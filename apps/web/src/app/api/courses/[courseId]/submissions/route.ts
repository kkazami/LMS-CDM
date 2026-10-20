import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { assertMutationOrigin, AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { requireCourseAccess } from '@/lib/course-access';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { saveSubmission } from '@/lib/academic-records';

export const dynamic = 'force-dynamic';
interface RouteContext { params: Promise<{ courseId: string }> }
export async function GET(request: Request, context: RouteContext) {
  try {
    const denial = await denyLegacyApi(request, 'GET courses/[courseId]/submissions/route.ts');
    if (denial) return denial;
    const session = await getSessionFromRequest(request);
    if (!session) throw new AccessError(401, 'Not authenticated.');
    const { courseId } = await context.params;
    await requireCourseAccess(session.user, courseId);
    const syllabusItemId = new URL(request.url).searchParams.get('syllabusItemId');
    if (!syllabusItemId || syllabusItemId.length > 200) throw new AccessError(400, 'syllabusItemId is required.');
    if (!await db.syllabusItem.findFirst({ where: { id: syllabusItemId, courseId } })) throw new AccessError(404, 'Assignment not found.');
    const attachments = { select: { id: true, type: true, url: true, fileName: true } } as const;
    if (canonicalRole(session.user.role) !== 'STUDENT') {
      const submissions = await db.studentSubmission.findMany({ where: { syllabusItemId }, include: {
        student: { select: { id: true, name: true, email: true, studentNumber: true, avatarUrl: true } }, attachments,
      }, orderBy: { submittedAt: 'desc' } });
      return NextResponse.json({ submissions });
    }
    const submission = await db.studentSubmission.findUnique({ where: { syllabusItemId_studentId: { syllabusItemId, studentId: session.user.id } }, include: { attachments } });
    return NextResponse.json({ submission });
  } catch (error) { return accountErrorResponse(error); }
}
export async function POST(request: Request, context: RouteContext) {
  try {
    const denial = await denyLegacyApi(request, 'POST courses/[courseId]/submissions/route.ts');
    if (denial) return denial;
    const session = await getSessionFromRequest(request);
    if (!session) throw new AccessError(401, 'Not authenticated.');
    assertMutationOrigin(request);
    const { courseId } = await context.params;
    return NextResponse.json(await saveSubmission(session.user, courseId, await request.json(), request.headers.get('idempotency-key')));
  } catch (error) { return accountErrorResponse(error); }
}
