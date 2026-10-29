const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');

test('multipart body is bounded by actual streamed bytes, not only Content-Length', async () => {
  const api = await load();
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(api.LAB_MAX_BYTES + 64 * 1024 + 1)); controller.close(); } });
  const request = new Request('https://lms.example.invalid/upload', { method: 'POST', body, duplex: 'half', headers: { 'content-type': 'multipart/form-data; boundary=lab' } });
  assert.equal(request.headers.get('content-length'), null);
  await assert.rejects(() => api.boundedUploadBody(request, api.LAB_MAX_BYTES), error => error.status === 413);
});

test('multipart boundary overhead allows a file at the exact raw-file cap', async () => {
  const api = await load();
  const form = new FormData();
  form.set('file', new File([new Uint8Array(api.LAB_MAX_BYTES)], 'screenshot.png', { type: 'image/png' }));
  const data = await api.boundedUploadBody(new Request('https://lms.example.invalid/upload', { method: 'POST', body: form }), api.LAB_MAX_BYTES);
  assert.equal(data.get('file').size, api.LAB_MAX_BYTES);
});

test('malicious file declarations do not bypass content verification', async () => {
  const api = await load();
  for (const [bytes, name, mime] of [
    [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'safe.png', 'image/png'],
    [Buffer.from('<script>alert(1)</script>'), 'answer.txt', 'text/plain'],
    [Buffer.from([0, 1, 2, 3]), 'answer.txt', 'text/plain'],
  ]) await assert.rejects(() => api.verifiedFileType(bytes, name, mime), error => error.status === 400);
});

test('correction deadline overrides original due date and expires read/write permission', async () => {
  const api = await load();
  const now = new Date('2026-10-25T12:00:00Z');
  const original = new Date('2026-10-24T12:00:00Z');
  assert.doesNotThrow(() => api.ensureWritable({ status: 'NEEDS_REVISION', revisionDueAt: new Date('2026-11-01T12:00:00Z') }, original, now));
  assert.throws(() => api.ensureWritable({ status: 'NEEDS_REVISION', revisionDueAt: original }, original, now), error => error.status === 409);
  for (const status of ['SUBMITTED', 'GRADED']) {
    assert.throws(() => api.ensureWritable({ status, revisionDueAt: new Date('2026-11-01T12:00:00Z') }, null, now), error => error.status === 409);
  }
});
