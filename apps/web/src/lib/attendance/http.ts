import { getSessionFromRequest } from '@/lib/api-auth';
import { mutationOriginAllowed } from '@/lib/request-security';
import { persistentLimit } from '@/lib/roster/rate-limit';
import { AccessError } from '@/lib/super-user-v1/actor';
import type { AttendanceActor } from './access';

export const privateHeaders = { 'Cache-Control': 'private, no-store' };
export async function attendanceActor(request: Request): Promise<AttendanceActor> {
  if (!mutationOriginAllowed(request)) throw new AccessError(403, 'Forbidden request origin.');
  const session = await getSessionFromRequest(request);
  if (!session) throw new AccessError(401, 'Please sign in.');
  await persistentLimit(`attendance:${session.user.id}:${request.method}`, request.method === 'GET' ? 180 : 60, 60000);
  return { id: session.user.id, sessionId: session.id };
}
export async function attendanceBody(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json') || !request.body) throw new AccessError(400, 'Expected JSON.');
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > 32768) { await reader.cancel(); throw new AccessError(413, 'Attendance request is too large.'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new AccessError(400, 'Invalid JSON.'); }
}
export function attendanceError(error: unknown): Response {
  if (error instanceof AccessError) return Response.json({ message: error.message }, { status: error.status, headers: privateHeaders });
  // ORM errors can contain parameters and connection details; never return or log the raw error.
  return Response.json({ message: 'Attendance is unavailable. Confirm the attendance migration and server configuration, then retry.' }, { status: 503, headers: privateHeaders });
}
