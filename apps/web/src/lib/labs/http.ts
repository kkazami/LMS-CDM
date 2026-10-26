import { z } from 'zod';
import { getSessionFromRequest } from '@/lib/api-auth';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { AccessError } from '@/lib/super-user-v1/actor';
import { boundedUploadBody, withUploadSlot } from '@/lib/private-upload';
import { fileResponse } from '@/lib/academic-structure/assets';
import { persistentLimit } from '@/lib/roster/rate-limit';
import { LAB_MAX_BYTES, idSchema } from './schema';
import { requireIcs, requireStudent, attemptAccess, ensureWritable } from './access';
import * as service from './service';

const headers = { 'Cache-Control': 'private, no-store' };
async function jsonBody(request: Request): Promise<unknown> {
  const max = 512 * 1024;
  if (Number(request.headers.get('content-length') ?? 0) > max) throw new AccessError(413, 'Request is too large.');
  if (!request.headers.get('content-type')?.includes('application/json') || !request.body) throw new AccessError(400, 'Expected JSON.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new AccessError(413, 'Request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function handleLabRequest(request: Request, route: { courseId?: string; path?: string[] }) {
  try {
    const denial = await denyLegacyApi(request, `${request.method} guided-practical-labs`);
    if (denial) return denial;
    const session = await getSessionFromRequest(request);
    if (!session) throw new AccessError(401, 'Authentication required.');
    const actor = session.user;
    await requireIcs(actor);
    const parts = route.path ?? [];
    if (parts.length > 8 || parts.some(p => !idSchema.safeParse(p).success)) throw new AccessError(400, 'Invalid route.');
    if (route.courseId) idSchema.parse(route.courseId);
    if (!['GET', 'HEAD'].includes(request.method)) await persistentLimit(`labs:${actor.id}`, 120, 60000);
    const method = request.method;
    let result: unknown;
    if (!route.courseId) {
      if (parts[0] === 'evidence' && parts.length === 2 && method === 'GET') return fileResponse(await service.readLabEvidence(actor, parts[1]), new URL(request.url).searchParams.get('inline') === '1');
      if (parts[0] !== 'templates') throw new AccessError(404, 'Not found.');
      if (parts.length === 1 && method === 'GET') result = await service.listTemplates(actor);
      else if (parts.length === 1 && method === 'POST') result = await service.createTemplate(actor, await jsonBody(request));
      else if (parts.length === 2 && method === 'GET') result = await service.getTemplate(actor, parts[1]);
      else if (parts.length === 2 && method === 'PATCH') result = await service.saveTemplate(actor, parts[1], await jsonBody(request));
      else if (parts.length === 3 && parts[2] === 'publish' && method === 'POST') result = await service.publishTemplate(actor, parts[1], await jsonBody(request));
      else if (parts.length === 3 && parts[2] === 'draft' && method === 'POST') result = await service.draftTemplate(actor, parts[1]);
      else throw new AccessError(404, 'Not found.');
    } else {
      const courseId = route.courseId;
      const assignmentId = parts[0];
      if (!parts.length && method === 'GET') result = await service.listAssignments(actor, courseId);
      else if (!parts.length && method === 'POST') result = await service.createAssignment(actor, courseId, await jsonBody(request));
      else if (parts.length === 1 && method === 'GET') {
        const query = new URL(request.url).searchParams;
        const page = z.coerce.number().int().min(1).max(100000).parse(query.get('page') ?? '1');
        const studentId = query.has('studentId') ? idSchema.parse(query.get('studentId')) : undefined;
        result = await service.getAssignment(actor, courseId, assignmentId, page, studentId);
      }
      else if (parts.length === 1 && method === 'PATCH') result = await service.patchAssignment(actor, courseId, assignmentId, await jsonBody(request));
      else if (parts[1] === 'attempts') {
        const attemptId = parts[2];
        if (parts.length === 2 && method === 'POST') result = await service.openAttempt(actor, courseId, assignmentId);
        else if (parts.length === 3 && method === 'GET') result = await service.getAttempt(actor, courseId, assignmentId, attemptId);
        else if (parts.length === 4 && method === 'POST' && parts[3] === 'submit') result = await service.submitAttempt(actor, courseId, assignmentId, attemptId, await jsonBody(request));
        else if (parts.length === 4 && method === 'POST' && parts[3] === 'review') result = await service.reviewAttempt(actor, courseId, assignmentId, attemptId, await jsonBody(request));
        else if (parts.length === 4 && method === 'POST' && parts[3] === 'reopen') result = await service.reopenAttempt(actor, courseId, assignmentId, attemptId, await jsonBody(request));
        else if (parts[3] === 'responses' && parts.length === 5 && method === 'PATCH') {
          const attempt = await service.saveResponse(actor, courseId, assignmentId, attemptId, parts[4], await jsonBody(request));
          result = attempt.responses.find(r => r.stepId === parts[4]);
        }
        else if (parts[3] === 'responses' && parts[5] === 'evidence' && parts.length === 6 && method === 'POST') {
          requireStudent(actor);
          const context = await attemptAccess(actor, courseId, assignmentId, attemptId, true);
          ensureWritable(context.attempt, context.assignment.syllabusItem.dueDate);
          if (!context.assignment.version.steps.some(s => s.id === parts[4] && s.type === 'EVIDENCE_UPLOAD')) throw new AccessError(404, 'Evidence step not found.');
          await persistentLimit(`upload:${actor.id}`, 20, 60000);
          result = await withUploadSlot(async () => {
            const data = await boundedUploadBody(request, LAB_MAX_BYTES);
            const file = data.get('file');
            if (!(file instanceof File) || [...data.values()].filter(v => v instanceof File).length !== 1 || [...data.keys()].some(k => !['file', 'expectedRevision', 'replaceEvidenceId'].includes(k))) throw new AccessError(400, 'Provide exactly one evidence file.');
            const revision = String(data.get('expectedRevision') ?? '');
            if (!/^\d{1,9}$/.test(revision)) throw new AccessError(400, 'Invalid response revision.');
            const replace = data.get('replaceEvidenceId');
            const replaceId = replace === null || replace === '' ? undefined : idSchema.parse(replace);
            const attempt = await service.uploadEvidence(actor, courseId, assignmentId, attemptId, parts[4], file, Number(revision), replaceId, true);
            return attempt.responses.find(r => r.stepId === parts[4]);
          });
        } else throw new AccessError(404, 'Not found.');
      } else throw new AccessError(404, 'Not found.');
    }
    return Response.json({ data: result }, { headers });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ message: error.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ').slice(0, 1000) }, { status: 400, headers });
    if (error instanceof SyntaxError) return Response.json({ message: 'Invalid JSON.' }, { status: 400, headers });
    return Response.json({ message: error instanceof AccessError ? error.message : 'Practical lab unavailable. Try again later.' }, { status: error instanceof AccessError ? error.status : 503, headers });
  }
}
