const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { load, as, request } = require('./helpers.cjs');

test('course access denies unknown/privileged roles, foreign institutes, unenrolled students and unrelated instructors', async () => {
  let enrolled = false;
  const course = { id: 'course', instituteId: 'ics', instructorId: 'teacher', institute: { code: 'ics' } };
  const api = await load({ course: { findUnique: async () => course }, enrollment: { findUnique: async () => enrolled ? { status: 'APPROVED' } : null } });
  for (const role of ['UNKNOWN', 'SUPER_USER', 'INSTITUTE_ADMIN']) await assert.rejects(api.requireCourseAccess({ id: 'x', role, instituteId: 'ics' }, 'course'), e => e.status === 403);
  await assert.rejects(api.requireCourseAccess({ id: 'teacher', role: 'PROFESSOR', instituteId: 'ibe' }, 'course'), e => e.status === 404);
  await assert.rejects(api.requireCourseAccess({ id: 'other', role: 'TEACHER', instituteId: 'ics' }, 'course'), e => e.status === 403);
  await assert.rejects(api.requireCourseAccess({ id: 's', role: 'STUDENT', instituteId: 'ics' }, 'course'), e => e.status === 403);
  enrolled = true;
  for (const user of [{ id: 's', role: 'STUDENT' }, { id: 'teacher', role: 'TEACHER' }, { id: 'teacher', role: 'PROFESSOR' }, { id: 'admin', role: 'ADMIN' }]) assert.equal((await api.requireCourseAccess({ ...user, instituteId: 'ics' }, 'course')).id, 'course');
  await assert.rejects(api.requireCourseAccess({ id: 's', role: 'STUDENT', instituteId: 'ics' }, 'course', true), e => e.status === 403);
});

test('assignments handler rejects unauthenticated and unrelated course access before querying records', async () => {
  let reads = 0;
  const db = { course: { findUnique: async () => ({ instituteId: 'ics', instructorId: 't', institute: { code: 'ics' } }) },
    enrollment: { findUnique: async () => null }, syllabusItem: { findMany: async () => { reads++; return []; } } };
  const api = await load(db);
  assert.equal((await api.assignments(request('/api/assignments?courseId=c'))).status, 401);
  as({ id: 's', role: 'STUDENT', instituteId: 'ics' });
  assert.equal((await api.assignments(request('/api/assignments?courseId=c'))).status, 403);
  assert.equal(reads, 0);
});

test('material scope cannot be bypassed with a valid course claim, save mode or teacher identity', async () => {
  let saved = 0;
  const db = { attachment: { findUnique: async () => ({ type: 'FILE', syllabusItem: { courseId: 'foreign' } }) }, flashcardDeck: { create: async () => { saved++; } } };
  const api = await load(db);
  as({ id: 's', role: 'STUDENT', instituteId: 'ics' });
  const response = await api.generate(request('/api/flashcards/auto-generate', { attachmentId: 'a', courseId: 'own', save: true, cards: [{ front: 'Front', back: 'Back' }] }));
  assert.equal(response.status, 404); assert.equal(saved, 0);
  assert.equal((await api.generate(request('/api/flashcards/auto-generate', { attachmentId: 'a', courseId: 'own', save: true, cards: 'invalid' }))).status, 400);
  await assert.rejects(api.requireMaterialAttachment({ id: 't', role: 'PROFESSOR', instituteId: 'ics' }, 'a'), e => e.status === 403);
});

test('health does not expose provider/database diagnostics on success or failure', async () => {
  const db = { $queryRaw: async () => [{ connected: 1 }] }, api = await load(db);
  assert.deepEqual(await (await api.health()).json(), { status: 'ok' });
  db.$queryRaw = async () => { throw Error('SYNTHETIC_INTERNAL_DIAGNOSTIC'); };
  const response = await api.health();
  assert.equal(response.status, 503); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { status: 'unavailable' });
});

test('token vault fails closed, supports explicit key rotation, rejects malformed keys and authenticated tampering', async () => {
  const original = { key: process.env.TOKEN_ENCRYPTION_KEY, previous: process.env.TOKEN_ENCRYPTION_PREVIOUS_KEYS };
  const api = await load();
  try {
    delete process.env.TOKEN_ENCRYPTION_KEY; delete process.env.TOKEN_ENCRYPTION_PREVIOUS_KEYS;
    assert.throws(() => api.encryptGithubToken('synthetic-token'));
    process.env.TOKEN_ENCRYPTION_KEY = 'z'.repeat(64); assert.throws(() => api.encryptGithubToken('synthetic-token'));
    const previous = crypto.randomBytes(32).toString('hex'); process.env.TOKEN_ENCRYPTION_KEY = previous;
    const oldCipher = api.encryptGithubToken('synthetic-token');
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    assert.throws(() => api.decryptGithubToken(oldCipher));
    process.env.TOKEN_ENCRYPTION_PREVIOUS_KEYS = JSON.stringify([previous]);
    assert.equal(api.decryptGithubToken(oldCipher), 'synthetic-token');
    const fresh = api.encryptGithubToken(api.decryptGithubToken(oldCipher)); delete process.env.TOKEN_ENCRYPTION_PREVIOUS_KEYS;
    assert.equal(api.decryptGithubToken(fresh), 'synthetic-token');
    const parts = fresh.split(':'); parts[1] = (parts[1][0] === 'a' ? 'b' : 'a') + parts[1].slice(1);
    assert.throws(() => api.decryptGithubToken(parts.join(':')));
  } finally {
    for (const [env, value] of [['TOKEN_ENCRYPTION_KEY', original.key], ['TOKEN_ENCRYPTION_PREVIOUS_KEYS', original.previous]]) if (value === undefined) delete process.env[env]; else process.env[env] = value;
  }
});

test('webhook fails closed without configured secret before reading or writing an event', async () => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET; delete process.env.GITHUB_WEBHOOK_SECRET;
  try { const api = await load(); assert.equal((await api.webhook(request('/api/github/webhooks', {}))).status, 503); }
  finally { if (secret !== undefined) process.env.GITHUB_WEBHOOK_SECRET = secret; }
});

test('signed webhook database errors return a generic response without exposing provider internals', async () => {
  const original = process.env.GITHUB_WEBHOOK_SECRET;
  process.env.GITHUB_WEBHOOK_SECRET = crypto.randomBytes(32).toString('hex');
  try {
    const api = await load({ githubWebhookEvent: { findUnique: async () => { throw Error('SYNTHETIC_PRIVATE_DETAIL'); } } });
    const body = '{}', signature = 'sha256=' + crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET).update(body).digest('hex');
    const response = await api.webhook(request('/api/github/webhooks', {}, { 'x-hub-signature-256': signature }));
    assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: 'Webhook unavailable.' });
  } finally { if (original === undefined) delete process.env.GITHUB_WEBHOOK_SECRET; else process.env.GITHUB_WEBHOOK_SECRET = original; }
});

test('attachment fetch validates destination hosts, public IPs and traversal boundaries', async () => {
  const api = await load();
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '100.64.0.1', '192.168.1.1', '::1', '::ffff:127.0.0.1', 'fc00::1', '2001:db8::1', '2002:7f00:1::']) assert.equal(api.isPublicAddress(address), false);
  assert.equal(api.isPublicAddress('8.8.8.8'), true);
  assert.equal(api.isPublicAddress('2606:4700:4700::1111'), true);
  for (const value of ['http://127.0.0.1/x', 'file:///etc/passwd', 'https://unconfigured.example.test/x', 'https://user:pass@store.public.blob.vercel-storage.com/x', 'https://store.public.blob.vercel-storage.com:444/x']) assert.throws(() => api.attachmentUrl(value));
  assert.equal(api.attachmentUrl('https://store.public.blob.vercel-storage.com/a.pdf').protocol, 'https:');
  await assert.rejects(api.readAttachment('/uploads/../../secret'));
});

test('attachment fetch pins verified DNS, rejects private answers and refuses redirects and oversized streams', async () => {
  const { PassThrough } = require('node:stream');
  const { EventEmitter } = require('node:events');
  let addresses = [{ address: '127.0.0.1', family: 4 }], calls = 0, status = 200, large = false;
  const network = {
    lookup: async () => addresses,
    https: { get(url, options, respond) {
      calls++;
      options.lookup(url.hostname, { all: true }, (error, pinned) => { assert.equal(error, null); assert.deepEqual(pinned, [{ address: '8.8.8.8', family: 4 }]); });
      const response = new PassThrough(); response.statusCode = status; response.headers = {};
      respond(response);
      if (status === 200) queueMicrotask(() => response.end(large ? Buffer.alloc(25 * 1024 * 1024 + 1) : Buffer.from('synthetic file')));
      return new EventEmitter();
    } },
  };
  const api = await load({}, null, network);
  const url = 'https://store.public.blob.vercel-storage.com/a.pdf';
  await assert.rejects(api.readAttachment(url), error => error.status === 400); assert.equal(calls, 0);
  addresses = [{ address: '8.8.8.8', family: 4 }];
  assert.equal((await api.readAttachment(url)).toString(), 'synthetic file');
  status = 302; await assert.rejects(api.readAttachment(url), error => error.status === 400); assert.equal(calls, 2);
  status = 200; large = true; await assert.rejects(api.readAttachment(url), error => error.status === 413);
});
