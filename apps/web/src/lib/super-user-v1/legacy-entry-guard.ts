import { getSession } from '@/lib/auth-session';
import { getSessionFromRequest } from '@/lib/api-auth';
import { canonicalRole } from './capabilities';
import { AccessError } from './actor';
import { errorResponse, assertMutationOrigin } from './actor';
import { db } from '@/lib/db';
import { administratorInstitute, administratorCourse, administratorTarget } from '@/lib/administrator-scope';
import { checkAdministratorScope, type AdministratorScope } from '@/lib/administrator-scope';
import { notFound, redirect } from 'next/navigation';
import { mutationOriginAllowed } from '@/lib/request-security';
const legacy = (role: unknown) => ['ADMIN','INSTRUCTOR','STUDENT'].includes(canonicalRole(role));
/** Dedicated roles never inherit legacy authority through permission strings. */
export async function denyLegacyApi(request: Request, _operation: string): Promise<Response | null> {
  if (!mutationOriginAllowed(request)) return Response.json({ error: 'Forbidden request origin.' }, { status: 403 });
  const session = await getSessionFromRequest(request);
  if (!session) return null;
  if (canonicalRole(session.user.role) === 'ADMIN') {
    try {
      assertMutationOrigin(request);
      const actor = session.user;
      const url = new URL(request.url);
      const institute = await administratorInstitute(actor);
      for (const key of ['institute', 'instituteCode']) {
        for (const code of url.searchParams.getAll(key)) await administratorInstitute(actor, code);
      }
      if (url.pathname === '/api/admin/permissions' && !['GET', 'HEAD'].includes(request.method)) throw new AccessError(403, 'Global permission administration is unavailable to institute Administrators.');
      const course = /^\/api\/courses\/([^/]+)(?:\/|$)/.exec(url.pathname);
      if (course) await administratorCourse(actor, decodeURIComponent(course[1]));
      const target = /^\/api\/admin\/users\/([^/]+)(?:\/|$)/.exec(url.pathname);
      if (target && target[1] !== 'bulk') await administratorTarget(actor, decodeURIComponent(target[1]));
      const json = request.headers.get('content-type')?.includes('application/json') && !['GET', 'HEAD'].includes(request.method)
        ? await request.clone().json() : null;
      const input = json && typeof json === 'object' && !Array.isArray(json) ? json : {};
      for (const code of [input.institute, input.instituteCode]) if (code !== undefined) {
        if (typeof code !== 'string') throw new AccessError(400, 'Invalid institute.');
        await administratorInstitute(actor, code);
      }
      if (input.instituteId !== undefined && input.instituteId !== institute.id) throw new AccessError(403, 'Forbidden institute.');
      for (const id of [url.searchParams.get('courseId'), input.courseId]) if (id) {
        if (typeof id !== 'string') throw new AccessError(400, 'Invalid course.');
        await administratorCourse(actor, id);
      }
      for (const id of [url.searchParams.get('syllabusItemId'), input.syllabusItemId]) if (id) {
        if (typeof id !== 'string') throw new AccessError(400, 'Invalid activity.');
        const item = await db.syllabusItem.findUnique({ where: { id }, select: { courseId: true } });
        if (!item) throw new AccessError(404, 'Activity not found.');
        await administratorCourse(actor, item.courseId);
      }
      // The authenticated actor, never a submitted actorId, owns an admin request.
      if (input.actorId !== undefined && input.actorId !== actor.id) throw new AccessError(403, 'Forbidden actor.');
      for (const id of [input.studentId, input.instructorId]) if (id) {
        if (typeof id !== 'string') throw new AccessError(400, 'Invalid account.');
        await administratorTarget(actor, id);
      }
      const ruleId = input.ruleId ?? url.searchParams.get('ruleId');
      if (ruleId && url.pathname === '/api/gamification/incentives') {
        if (typeof ruleId !== 'string') throw new AccessError(400, 'Invalid rule.');
        const rule = await db.gradeIncentiveRule.findUnique({ where: { id: ruleId }, select: { courseId: true } });
        if (!rule) throw new AccessError(404, 'Rule not found.');
        await administratorCourse(actor, rule.courseId);
      }
      if (input.submissionId && url.pathname === '/api/codelab/instructor/reject') {
        if (typeof input.submissionId !== 'string') throw new AccessError(400, 'Invalid submission.');
        const submission = await db.activitySubmission.findUnique({ where: { id: input.submissionId }, select: { studentId: true, template: { select: { syllabusItemId: true } } } });
        if (!submission) throw new AccessError(404, 'Submission not found.');
        await administratorTarget(actor, submission.studentId);
        if (submission.template.syllabusItemId) {
          const item = await db.syllabusItem.findUnique({ where: { id: submission.template.syllabusItemId }, select: { courseId: true } });
          if (!item) throw new AccessError(404, 'Activity not found.');
          await administratorCourse(actor, item.courseId);
        }
      }
      return null;
    } catch (error) { return errorResponse(error); }
  }
  if (legacy(session.user.role)) return null;
  return Response.json({error:{code:'FORBIDDEN',message:'Forbidden.'}},{status:403});
}
export async function requireLegacyActor(_operation: string, scope?: AdministratorScope | (() => AdministratorScope)) {
  const session=await getSession();
  const page = _operation.endsWith('/page.tsx');
  if (!session && page) redirect('/login');
  if(!session) throw new AccessError(401,'Authentication required.');
  if (!legacy(session.user.role) && page) notFound();
  if(!legacy(session.user.role)) throw new AccessError(403,'Forbidden.');
  if (canonicalRole(session.user.role) === 'ADMIN') {
    try { await checkAdministratorScope(session.user, typeof scope === 'function' ? scope() : scope ?? {}); }
    catch (error) {
      if (page && error instanceof AccessError && [403,404].includes(error.status)) notFound();
      throw error;
    }
  }
  return session.user;
}
