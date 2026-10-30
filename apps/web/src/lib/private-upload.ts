import { labsAvailable } from '@/lib/labs/readiness';
import { connect } from 'node:net';
import { once } from 'node:events';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { db } from '@/lib/db';
import { AccessError } from '@/lib/super-user-v1/actor';
import type { CourseActor } from '@/lib/course-access';
import { requireCourseAccess } from '@/lib/course-access';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';

export const UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
const assetPattern = /^\/api\/assets\/([a-zA-Z0-9-]{1,100})$/;
const types: Record<string, string[]> = {
  'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'], 'image/webp': ['.webp'], 'application/zip': ['.zip'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};
let inFlight = 0;
export async function withUploadSlot<T>(work: () => Promise<T>): Promise<T> {
  if (inFlight >= 2) throw new AccessError(503, 'Uploads are busy. Try again shortly.');
  inFlight++;
  try { return await work(); } finally { inFlight--; }
}
export async function boundedUploadBody(request: Request, fileLimit = UPLOAD_MAX_BYTES, timeoutMs = 30000): Promise<FormData> {
  if (!Number.isSafeInteger(fileLimit) || fileLimit < 1 || fileLimit > UPLOAD_MAX_BYTES) throw new AccessError(400, 'Invalid upload limit.');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 240000) throw new AccessError(400, 'Invalid upload timeout.');
  const max = fileLimit + 64 * 1024;
  const limitMessage = fileLimit === UPLOAD_MAX_BYTES ? 'Maximum file size is 25 MB.' : 'The upload exceeds the lab request limit.';
  if (Number(request.headers.get('content-length') || 0) > max) throw new AccessError(413, limitMessage);
  if (!request.body || !request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw new AccessError(400, 'Expected a file upload.');
  const reader = request.body.getReader();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; void reader.cancel(); }, timeoutMs);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (timedOut) throw new AccessError(408, 'Upload timed out. Try again.');
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new AccessError(413, limitMessage); }
      chunks.push(value);
    }
  } finally { clearTimeout(timeout); reader.releaseLock(); }
  return new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers.get('content-type')! } }).formData();
}
export async function verifiedFileType(bytes: Buffer, name: string, declared: string): Promise<string> {
  if (!bytes.length || bytes.length > UPLOAD_MAX_BYTES) throw new AccessError(413, 'Empty or oversized file.');
  const extension = path.extname(name).toLowerCase();
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(bytes).catch(() => undefined);
  if (detected && types[detected.mime]?.includes(extension) && (declared === detected.mime || detected.mime === 'application/zip' && declared === 'application/x-zip-compressed')) return detected.mime;
  if (!detected && ['.txt', '.csv'].includes(extension) && ['text/plain', 'text/csv', 'application/vnd.ms-excel'].includes(declared)) {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text) && !/<\s*(?:!doctype|html|script|svg|iframe)\b/i.test(text)) return extension === '.csv' ? 'text/csv' : 'text/plain';
    } catch { /* Invalid UTF-8 is not a text file. */ }
  }
  throw new AccessError(400, 'The file contents, extension and type must match a supported document, image, ZIP, TXT or CSV.');
}
/** Scanning is opt-in. When enabled, scanner failures still block uploads. */
export async function scanUpload(bytes: Buffer): Promise<'CLEAN' | 'UNSCANNED'> {
  if (process.env.FILE_SCANNING_ENABLED !== 'true') return 'UNSCANNED';
  const host = process.env.CLAMAV_HOST;
  const port = Number(process.env.CLAMAV_PORT);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) throw new AccessError(503, 'File scanning is unavailable. Contact your administrator.');
  const socket = connect({ host, port });
  socket.setTimeout(10000, () => socket.destroy(new Error('Scanner timeout')));
  const response = new Promise<string>((resolve, reject) => {
    let answer = '';
    socket.on('error', reject);
    socket.on('data', chunk => {
      answer += chunk.toString('utf8');
      if (answer.length > 4096) socket.destroy(new Error('Invalid scanner response'));
      else if (answer.includes('\0') || answer.includes('\n')) resolve(answer.replace(/[\0\r\n]+$/, ''));
    });
    socket.on('end', () => resolve(answer.replace(/[\0\r\n]+$/, '')));
  });
  // Attach rejection handling before connect/write failures to avoid an unhandled rejection.
  void response.catch(() => {});
  try {
    await once(socket, 'connect');
    socket.write('zINSTREAM\0');
    for (let offset = 0; offset < bytes.length; offset += 64 * 1024) {
      const chunk = bytes.subarray(offset, offset + 64 * 1024);
      const header = Buffer.alloc(4); header.writeUInt32BE(chunk.length);
      socket.write(header);
      if (!socket.write(chunk)) await once(socket, 'drain');
    }
    socket.write(Buffer.alloc(4));
    const answer = await response;
    if (/ FOUND$/.test(answer)) throw new AccessError(400, 'The file was rejected by the malware scanner.');
    if (answer !== 'stream: OK') throw new Error('Scanner did not confirm clean content');
    return 'CLEAN';
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError(503, 'File scanning is unavailable. Try again later.');
  } finally { socket.destroy(); }
}
export async function savePrivateUpload(actor: CourseActor, file: File) {
  if (!['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(canonicalRole(actor.role))) throw new AccessError(403, 'Forbidden.');
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = await verifiedFileType(bytes, file.name, file.type);
  const scanStatus = await scanUpload(bytes);
  const id = randomUUID();
  const fileName = path.basename(file.name.replace(/\\/g, '/')).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200) || 'attachment';
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`uploads:${actor.id}`}, 0))`;
    const used = await tx.privateAsset.aggregate({ where: { ownerId: actor.id, instituteId: actor.instituteId }, _sum: { size: true } });
    if ((used._sum.size || 0) + bytes.length > 250 * 1024 * 1024) throw new AccessError(413, 'Your 250 MB upload allowance is full. Contact your administrator.');
    await tx.privateAsset.create({ data: { id, ownerId: actor.id, instituteId: actor.instituteId, fileName, mimeType, size: bytes.length, content: bytes, scanStatus, sha256: createHash('sha256').update(bytes).digest('hex') } });
  });
  return { url: `/api/assets/${id}`, fileName, fileSize: bytes.length };
}
/** Existing public references stay compatible; new private references must belong to the writer. */
export async function requireOwnedUpload(client: Pick<typeof db, 'privateAsset' | 'labEvidence' | '$queryRaw'>, actor: CourseActor, url: string) {
  const id = assetPattern.exec(url)?.[1];
  if (!id) return;
  if (!await client.privateAsset.findFirst({ where: { id, ownerId: actor.id, instituteId: actor.instituteId, scanStatus: { in: ['CLEAN', 'UNSCANNED'] } }, select: { id: true } })) throw new AccessError(403, 'This upload does not belong to you.');
  if (await labsAvailable(client) && await client.labEvidence.findUnique({ where: { assetId: id }, select: { id: true } })) throw new AccessError(409, 'Lab evidence must stay with its lab. Upload a separate file for this item.');
}
export async function readPrivateUpload(actor: CourseActor, id: string) {
  const role = canonicalRole(actor.role);
  if (!['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(role)) throw new AccessError(403, 'Forbidden.');
  // Lab files retain course/enrollment authorization even through the generic asset URL.
  const { authorizeLabAsset } = await import('@/lib/labs/service');
  const labFile = await labsAvailable() ? await authorizeLabAsset(actor, id) : null;
  if (labFile) return labFile;
  const meta = await db.privateAsset.findFirst({ where: { id, instituteId: actor.instituteId, scanStatus: { in: ['CLEAN', 'UNSCANNED'] } }, select: { id: true, ownerId: true } });
  if (!meta) throw new AccessError(404, 'File not found.');
  const url = `/api/assets/${id}`;
  let allowed = meta.ownerId === actor.id;
  if (!allowed) {
    // A URL alone grants no authority: require a persisted, correctly owned resource.
    const [content, submissions, avatar, covers, answers] = await Promise.all([
      db.attachment.findMany({ where: { url, syllabusItem: { course: { instituteId: actor.instituteId } } }, select: { syllabusItemId: true, syllabusItem: { select: { courseId: true, targetGroups: { select: { group: { select: { members: { where: { studentId: actor.id }, select: { studentId: true } } } } } } } } }, take: 101 }),
      db.submissionAttachment.findMany({ where: { url, submission: { studentId: meta.ownerId, status: { in: ['SUBMITTED', 'RETURNED'] }, syllabusItem: { course: { instituteId: actor.instituteId } } } }, select: { submission: { select: { syllabusItem: { select: { courseId: true } } } } }, take: 101 }),
      db.user.findFirst({ where: { id: meta.ownerId, instituteId: actor.instituteId, avatarUrl: url, isActive: true }, select: { id: true } }),
      db.course.findMany({ where: { coverImage: url, instituteId: actor.instituteId }, select: { id: true }, take: 101 }),
      db.formAttemptAnswer.findMany({ where: { fileUrl: url, attempt: { userId: meta.ownerId, status: { not: 'IN_PROGRESS' }, form: { course: { instituteId: actor.instituteId } } } }, select: { attempt: { select: { form: { select: { courseId: true } } } } }, take: 101 }),
    ]);
    if ([content, submissions, covers, answers].some(rows => rows.length > 100)) throw new AccessError(503, 'File references require reconciliation.');
    allowed = Boolean(avatar);
    const candidates = [...content.filter(a => role !== 'STUDENT' || !a.syllabusItem.targetGroups.length || a.syllabusItem.targetGroups.some(t => t.group.members.length)).map(a => a.syllabusItem.courseId), ...covers.map(c => c.id), ...(role === 'STUDENT' ? [] : [...submissions.map(a => a.submission.syllabusItem.courseId), ...answers.map(a => a.attempt.form.courseId)])];
    for (const courseId of new Set(candidates)) {
      try { await requireCourseAccess(actor, courseId); allowed = true; break; }
      catch (error) { if (!(error instanceof AccessError) || ![403, 404].includes(error.status)) throw error; }
    }
  }
  if (!allowed) throw new AccessError(404, 'File not found.');
  const file = await db.privateAsset.findUniqueOrThrow({ where: { id } });
  return { bytes: Buffer.from(file.content), mime: file.mimeType, name: file.fileName };
}
