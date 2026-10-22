import { db } from '@/lib/db';
import { getSession } from '@/lib/auth-session';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { requireCourseAccess } from '@/lib/course-access';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { AccessError } from '@/lib/super-user-v1/actor';
import { readAttachment } from '@/lib/attachment-content';
import { readPrivateUpload } from '@/lib/private-upload';
import { fileResponse } from '@/lib/academic-structure/assets';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ attachmentId: string }> }) {
  const denial = await denyLegacyApi(request, 'GET submission-attachments');
  if (denial) return denial;
  try {
    const session = await getSession(request);
    if (!session) throw new AccessError(401, 'Unauthorized');
    const a = await db.submissionAttachment.findUnique({ where: { id: (await context.params).attachmentId }, include: { submission: { include: { syllabusItem: { select: { courseId: true } } } } } });
    if (!a) throw new AccessError(404, 'File not found.');
    await requireCourseAccess(session.user, a.submission.syllabusItem.courseId);
    if (canonicalRole(session.user.role) === 'STUDENT' && a.submission.studentId !== session.user.id || a.submission.studentId !== session.user.id && !['SUBMITTED', 'RETURNED'].includes(a.submission.status)) throw new AccessError(404, 'File not found.');
    const privateId = /^\/api\/assets\/([a-zA-Z0-9-]+)$/.exec(a.url)?.[1];
    if (privateId) return fileResponse(await readPrivateUpload(session.user, privateId), true);
    if (a.type === 'LINK' && !a.url.startsWith('data:')) {
      const target = new URL(a.url);
      if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) throw new AccessError(400, 'Invalid link.');
      return new Response(null, { status: 302, headers: { Location: target.toString(), 'Cache-Control': 'private, no-store' } });
    }
    return fileResponse({ bytes: await readAttachment(a.url), mime: 'application/octet-stream', name: a.fileName });
  } catch (error) { return Response.json({ error: error instanceof AccessError ? error.message : 'File unavailable.' }, { status: error instanceof AccessError ? error.status : 503 }); }
}
