const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const fs = require('node:fs');
const vm = require('node:vm');
const { compile } = require('./compile.cjs');
const { webRequire } = require('./helpers.cjs');
const sources = `export * from './apps/web/src/lib/private-upload'; export * from './apps/web/src/lib/request-security'; export * from './apps/web/src/lib/safe-rich-text'; export * from './apps/web/src/lib/gradebook-data';`;
const student = { id: 's', role: 'STUDENT', instituteId: 'ics' };
test('notes retain semantic formatting and safe colors while removing executable HTML, unsafe URLs and CSS', async () => {
  const { safeRichText } = await compile(sources);
  const clean = safeRichText('<p style="color:#aabbcc;position:fixed;background-image:url(https://bad)"><strong>Study</strong><img src=x onerror=alert(1)><script>alert(1)</script><svg onload=alert(2)></svg><a href="javascript:alert(1)">unsafe</a><a href="//bad">relative</a><a href="https://example.test">safe</a></p>');
  assert.match(clean, /<strong>Study<\/strong>/); assert.match(clean, /color:#aabbcc/); assert.match(clean, /href="https:\/\/example.test"/);
  assert.doesNotMatch(clean, /script|onerror|onload|<img|<svg|javascript:|href="\/\/|position:|background-image/);
});
test('mutation protection rejects forged, sibling and opaque origins; explicit bearer clients remain supported', async () => {
  const { mutationOriginAllowed } = await compile(sources);
  const req = headers => new Request('https://lms.test/api/workspace/notes', { method: 'POST', headers });
  for (const headers of [{ origin: 'https://bad.test' }, { origin: 'null' }, { origin: 'https://lms.test', 'sec-fetch-site': 'same-site' }, { origin: 'https://bad.test', 'x-forwarded-host': 'bad.test' }]) assert.equal(mutationOriginAllowed(req(headers)), false);
  assert.equal(mutationOriginAllowed(req({ origin: 'https://lms.test' })), true);
  assert.equal(mutationOriginAllowed(req({ authorization: 'Bearer opaque' })), true);
  const previous = process.env.ALLOWED_ORIGINS; process.env.ALLOWED_ORIGINS = 'https://client.test';
  try { assert.equal(mutationOriginAllowed(req({ origin: 'https://client.test', authorization: 'Bearer opaque' })), true); assert.equal(mutationOriginAllowed(req({ origin: 'https://client.test', authorization: 'Bearer opaque', cookie: 'lumina_session=opaque' })), false); }
  finally { if (previous === undefined) delete process.env.ALLOWED_ORIGINS; else process.env.ALLOWED_ORIGINS = previous; }
});
test('file signature, extension and MIME agree; disguised executables and HTML cannot become images or text', async () => {
  const api = await compile(sources);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
  assert.equal(await api.verifiedFileType(png, 'avatar.png', 'image/png'), 'image/png');
  assert.equal(await api.verifiedFileType(Buffer.from('Name,Score\nA,90'), 'grades.csv', 'text/csv'), 'text/csv');
  for (const [bytes, name, mime] of [[Buffer.from('MZmalware'), 'avatar.png', 'image/png'], [png, 'avatar.pdf', 'application/pdf'], [Buffer.from('<script>alert(1)</script>'), 'notes.txt', 'text/plain'], [Buffer.from([0, 1, 2]), 'notes.txt', 'text/plain']]) await assert.rejects(api.verifiedFileType(bytes, name, mime), error => error.status === 400);
});
test('multipart body is bounded even when Content-Length is absent and upload concurrency never queues unbounded work', async () => {
  const api = await compile(sources);
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(api.UPLOAD_MAX_BYTES + 65537)); controller.close(); } });
  await assert.rejects(api.boundedUploadBody(new Request('https://lms.test/api/upload', { method: 'POST', body: stream, duplex: 'half', headers: { 'content-type': 'multipart/form-data; boundary=synthetic' } })), error => error.status === 413);
  let release; const pending = new Promise(resolve => release = resolve);
  const first = api.withUploadSlot(() => pending), second = api.withUploadSlot(() => pending);
  await assert.rejects(api.withUploadSlot(async () => {}), error => error.status === 503); release(); await Promise.all([first, second]);
  await api.withUploadSlot(async () => {});
});
test('ClamAV protocol sends exact bounded bytes and publishes only an explicit clean verdict', async () => {
  const api = await compile(sources); const oldHost = process.env.CLAMAV_HOST, oldPort = process.env.CLAMAV_PORT;
  delete process.env.CLAMAV_HOST; delete process.env.CLAMAV_PORT;
  await assert.rejects(api.scanUpload(Buffer.from('test')), error => error.status === 503);
  const sockets = new Set(); let verdict = 'stream: OK', received;
  const server = net.createServer(socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); let data = Buffer.alloc(0), command = false, parts = [];
    socket.on('data', bytes => { data = Buffer.concat([data, bytes]); if (!command) { if (data.length < 10) return; assert.equal(data.subarray(0, 10).toString(), 'zINSTREAM\0'); data = data.subarray(10); command = true; }
      while (data.length >= 4) { const length = data.readUInt32BE(); if (data.length < 4 + length) return; data = data.subarray(4); if (!length) { received = Buffer.concat(parts); socket.end(verdict + '\0'); return; } parts.push(data.subarray(0, length)); data = data.subarray(length); }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  process.env.CLAMAV_HOST = '127.0.0.1'; process.env.CLAMAV_PORT = String(server.address().port);
  try {
    const content = Buffer.alloc(130000, 'x'); await api.scanUpload(content); assert.deepEqual(received, content);
    verdict = 'stream: Synthetic-Test-Signature FOUND'; await assert.rejects(api.scanUpload(Buffer.from('synthetic')), error => error.status === 400);
    verdict = 'stream: ERROR'; await assert.rejects(api.scanUpload(Buffer.from('synthetic')), error => error.status === 503);
  } finally { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); if (oldHost === undefined) delete process.env.CLAMAV_HOST; else process.env.CLAMAV_HOST = oldHost; if (oldPort === undefined) delete process.env.CLAMAV_PORT; else process.env.CLAMAV_PORT = oldPort; }
});
test('uploads never persist a clean asset while the mandatory scanner is unconfigured', async () => {
  const oldHost = process.env.CLAMAV_HOST, oldPort = process.env.CLAMAV_PORT;
  delete process.env.CLAMAV_HOST; delete process.env.CLAMAV_PORT;
  let writes = 0;
  try {
    const api = await compile(sources, { db: { $transaction: async () => { writes++; throw new Error('Unexpected persistence'); } } });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
    await assert.rejects(api.savePrivateUpload(student, new File([png], 'clean.png', { type: 'image/png' })), error => error.status === 503);
    assert.equal(writes, 0);
  } finally {
    if (oldHost === undefined) delete process.env.CLAMAV_HOST; else process.env.CLAMAV_HOST = oldHost;
    if (oldPort === undefined) delete process.env.CLAMAV_PORT; else process.env.CLAMAV_PORT = oldPort;
  }
});

test('private files require ownership or persisted resource access, including target groups and draft privacy', async () => {
  let attachment = [], submitted = [], enrollment = { status: 'APPROVED' }, ownerId = 'teacher';
  const state = { db: { $queryRaw: async () => [{ tables: 10, columns: 2 }], labEvidence: { findUnique: async () => null }, privateAsset: { findFirst: async () => ({ id: 'file', ownerId }), findUniqueOrThrow: async () => ({ content: Buffer.from('safe'), mimeType: 'text/plain', fileName: 'notes.txt' }) }, attachment: { findMany: async () => attachment }, submissionAttachment: { findMany: async () => submitted }, user: { findFirst: async () => null }, course: { findMany: async () => [], findUnique: async () => ({ id: 'c', instituteId: 'ics', instructorId: 'teacher' }) }, formAttemptAnswer: { findMany: async () => [] }, enrollment: { findUnique: async () => enrollment } } };
  state.db.labStep = { findMany: async () => [] };
  const api = await compile(sources, state);
  await assert.rejects(api.readPrivateUpload(student, 'file'), error => error.status === 404);
  attachment = [{ syllabusItem: { courseId: 'c', targetGroups: [{ group: { members: [] } }] } }];
  await assert.rejects(api.readPrivateUpload(student, 'file'), error => error.status === 404);
  attachment[0].syllabusItem.targetGroups = []; assert.equal((await api.readPrivateUpload(student, 'file')).name, 'notes.txt');
  enrollment = null; await assert.rejects(api.readPrivateUpload(student, 'file'), error => error.status === 404);
  ownerId = 's'; assert.equal((await api.readPrivateUpload(student, 'file')).name, 'notes.txt');
  await assert.rejects(api.readPrivateUpload({ ...student, role: 'SUPER_USER' }, 'file'), error => error.status === 403);
  await assert.rejects(api.requireOwnedUpload({ privateAsset: { findFirst: async () => null } }, student, '/api/assets/foreign'), error => error.status === 403);
});
test('gradebook reads only the requested students, preserves every assignment and avoids inline file content', async () => {
  let enrollmentQuery, submissionQuery, assignmentCount = 100;
  const db = { $queryRaw: async () => [{ tables: 10, columns: 2 }], course: { findUnique: async () => ({ id: 'c', title: 'Synthetic', code: 'TEST', instituteId: 'ics', instructorId: 't' }) }, enrollment: { count: async () => 400, findMany: async query => { enrollmentQuery = query; return Array.from({ length: 50 }, (_, i) => ({ student: { id: `s${query.skip + i}`, name: `Student ${i}`, email: 'synthetic@example.invalid' } })); } }, syllabusItem: { findMany: async query => Array.from({ length: Math.min(assignmentCount, query.take) }, (_, i) => ({ id: 'a' + i, title: 'Assignment ' + i, type: 'ASSIGNMENT', maxPoints: 100, dueDate: null })) }, gradingPolicy: { findUnique: async () => ({ weights: [{ category: 'ASSIGNMENT', weightPercentage: 100 }] }) }, studentSubmission: { findMany: async query => { submissionQuery = query; return [{ id: 'sub', studentId: query.where.studentId.in[0], syllabusItemId: 'a0', grade: 90, status: 'RETURNED', isReturned: true, submittedAt: new Date(), attachments: [{ id: 'f', type: 'FILE', fileName: 'answer.txt' }] }]; } } };
  db.courseGradebookPolicy = { findUnique: async () => null }; db.classworkGradingPeriod = { findMany: async () => [] };
  const api = await compile(sources, { db }); const data = await api.readGradebook({ id: 't', role: 'PROFESSOR', instituteId: 'ics' }, 'c', 2);
  assert.equal(data.students.length, 50); assert.equal(data.assignments.length, 100); assert.equal(data.pagination.total, 400); assert.equal(data.pagination.totalPages, 8);
  assert.equal(enrollmentQuery.skip, 50); assert.equal(enrollmentQuery.take, 50); assert.equal(submissionQuery.where.studentId.in.length, 50); assert.equal(submissionQuery.where.syllabusItemId.in.length, 100);
  assert.equal(data.grades.s50.a0.grade, 90); assert.equal(data.grades.s50.a0.attachments[0].url, '/api/submission-attachments/f');
  assignmentCount = 201; await assert.rejects(api.readGradebook({ id: 't', role: 'PROFESSOR', instituteId: 'ics' }, 'c'), error => error.status === 422);
  await assert.rejects(api.readGradebook(student, 'c', -1), error => error.status === 400);
});
test('production middleware generates matching fresh nonces and denies API extension bypasses and caching', async () => {
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  try {
    const { middleware } = await compile(`export { middleware } from './apps/web/src/middleware';`);
    const { NextRequest } = webRequire('next/server');
    const request = () => new NextRequest('https://lms.test/login', { headers: { 'x-nonce': 'spoofed' } });
    const first = await middleware(request()), second = await middleware(request());
    const csp = first.headers.get('content-security-policy'); assert.match(csp, /nonce-/); assert.doesNotMatch(csp, /script-src[^;]*unsafe-(?:inline|eval)/);
    assert.notEqual(csp, second.headers.get('content-security-policy')); assert.equal(first.headers.get('cache-control'), 'private, no-store');
    assert.equal(first.headers.get('x-middleware-request-content-security-policy'), csp);
    assert.equal((await middleware(new NextRequest('https://lms.test/api/notes.json', { method: 'POST', headers: { origin: 'https://bad.test' } }))).status, 403);
  } finally { process.env.NODE_ENV = previous; }
});

test('service worker never caches account pages, API responses or legacy uploads, and removes its old private cache', async () => {
  const listeners = {}, deleted = [], writes = []; let response;
  const cache = { match: async () => undefined, put: async request => writes.push(request.url), addAll: async assets => { assert.ok(!assets.includes('/')); } };
  vm.runInNewContext(fs.readFileSync('apps/web/public/sw.js', 'utf8'), { URL, Response, self: { location: { origin: 'https://lms.test' }, clients: { claim() {} }, skipWaiting() {}, addEventListener: (name, callback) => listeners[name] = callback }, caches: { open: async () => cache, keys: async () => ['cdm-lms-v1', 'unrelated-app'], delete: async key => deleted.push(key), match: async () => new Response('Public offline page') }, fetch: async () => new Response('Private grade', { headers: { 'cache-control': 'private, no-store' } }) });
  let pending;
  listeners.install({ waitUntil: promise => pending = promise }); await pending;
  listeners.activate({ waitUntil: promise => pending = promise }); await pending; assert.deepEqual(deleted, ['cdm-lms-v1']);
  for (const pathname of ['/api/courses/course', '/api/announcements', '/uploads/answer.png']) {
    response = undefined; listeners.fetch({ request: { method: 'GET', url: 'https://lms.test' + pathname }, respondWith: promise => response = promise }); assert.equal(response, undefined);
  }
  listeners.fetch({ request: { method: 'GET', url: 'https://lms.test/ics/grades', mode: 'navigate' }, respondWith: promise => response = promise }); await response; assert.deepEqual(writes, []);
});

test('shared API client preserves a complete roster by fetching bounded pages in order', async () => {
  const { createApiClient } = await compile(`export { createApiClient } from './packages/api-client/src/index';`);
  const previous = global.fetch; const calls = [];
  global.fetch = async url => { calls.push(url); const page = Number(new URL(url).searchParams.get('page')); return Response.json({ course: { id: 'c' }, assignments: [{ id: 'a' }], students: [{ id: 's' + page }], grades: { ['s' + page]: { a: { grade: 90 } } }, gradingPolicy: null, pagination: { page, totalPages: 3 } }); };
  try { const data = await createApiClient({ baseUrl: 'https://lms.test' }).courses.getGradebook('c'); assert.deepEqual(data.students.map(s => s.id), ['s1', 's2', 's3']); assert.equal(Object.keys(data.grades).length, 3); assert.deepEqual(calls.map(url => new URL(url).searchParams.get('page')), ['1', '2', '3']); }
  finally { global.fetch = previous; }
});

test('CodeLab bounds provider work across concurrent requests and releases slots after completion', async () => {
  const providerEnv = { JUDGE0_URL: process.env.JUDGE0_URL, JUDGE0_AUTH_TOKEN: process.env.JUDGE0_AUTH_TOKEN };
  process.env.JUDGE0_URL = 'https://runner.example.invalid'; process.env.JUDGE0_AUTH_TOKEN = 'synthetic-token';
  const api = await compile(`export * from './apps/web/src/features/interactive-activities/codelab/utils/judge0-config';`);
  const previous = global.fetch; let release; const gate = new Promise(resolve => release = resolve); let requests = 0;
  global.fetch = async () => { requests++; await gate; return Response.json({ stdout: Buffer.from('safe').toString('base64'), status: { id: 3, description: 'Accepted' } }); };
  try { const pending = Array.from({ length: 4 }, () => api.executeJudge0Submission('synthetic', 54)); await assert.rejects(api.executeJudge0Submission('fifth', 54), error => error instanceof api.CodeRunnerUnavailableError); assert.equal(requests, 4); release(); await Promise.all(pending); await api.executeJudge0Submission('next', 54); assert.equal(requests, 5); }
  finally { release(); global.fetch = previous; for (const [key, value] of Object.entries(providerEnv)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test('authorized historical data-URL files remain downloadable even when recorded as LINK', async () => {
  const attachment = { fileName: 'historical.txt', type: 'LINK', url: 'data:text/plain;base64,' + Buffer.from('Historical synthetic file').toString('base64'), submission: { studentId: 's', status: 'SUBMITTED', syllabusItem: { courseId: 'c' } } };
  const db = { submissionAttachment: { findUnique: async () => attachment }, course: { findUnique: async () => ({ id: 'c', instituteId: 'ics' }) }, enrollment: { findUnique: async () => ({ status: 'APPROVED' }) } };
  const { GET } = await compile(`export { GET } from './apps/web/src/app/api/submission-attachments/[attachmentId]/route';`, { db, session: { user: student } });
  const response = await GET(new Request('https://lms.test/api/submission-attachments/f'), { params: Promise.resolve({ attachmentId: 'f' }) });
  assert.equal(response.status, 200); assert.equal(await response.text(), 'Historical synthetic file'); assert.match(response.headers.get('content-disposition'), /^attachment;/); assert.equal(response.headers.get('cache-control'), 'private, no-store');
});
