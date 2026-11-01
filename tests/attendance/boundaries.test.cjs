const test = require('node:test');
const assert = require('node:assert/strict');
const { compile } = require('../web-quality/compile.cjs');

test('direct attendance API rejects unauthenticated and cross-origin requests', async () => {
  const api = await compile("export { GET, POST } from './apps/web/src/app/api/courses/[courseId]/attendance/route.ts';", { db: {} });
  const context = { params: Promise.resolve({ courseId: 'class' }) };
  assert.equal((await api.GET(new Request('https://lms.invalid/api/courses/class/attendance'), context)).status, 401);
  assert.equal((await api.POST(new Request('https://lms.invalid/api/courses/class/attendance', { method: 'POST', headers: { origin: 'https://evil.invalid', 'content-type': 'application/json' }, body: '{}' }), context)).status, 403);
});
test('attendance JSON boundary limits actual bytes, not a claimed Content-Length', async () => {
  const { attendanceBody } = await compile("export { attendanceBody } from './apps/web/src/lib/attendance/http.ts';", { db: {} });
  await assert.rejects(attendanceBody(new Request('https://lms.invalid', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: 'x'.repeat(32768) }) })), error => error.status === 413);
  await assert.rejects(attendanceBody(new Request('https://lms.invalid', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })), error => error.status === 400);
});
test('class access rejects other institutes, non-owning instructors, pending students and inactive accounts', async () => {
  const { access } = await compile("export { access } from './apps/web/src/lib/attendance/access.ts';", { db: {} });
  const actor = { id: 'student', sessionId: 'session' };
  const mock = ({ role = 'STUDENT', institute = 'ics', enrollment = 'APPROVED', active = true } = {}) => ({
    session: { findUnique: async () => ({ userId: 'student', createdAt: new Date(), lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 60000), user: { id: 'student', role, instituteId: 'ics', isActive: active, activationStatus: 'ACTIVE' } }) },
    course: { findUnique: async () => ({ id: 'class', instituteId: institute, instructorId: 'owner', institute: { code: institute, timezone: 'Asia/Manila', attendancePolicy: null }, attendanceSettings: null }) },
    enrollment: { findUnique: async () => ({ status: enrollment }) },
  });
  assert.equal((await access(mock(), actor, 'class')).role, 'STUDENT');
  for (const variant of [{ institute: 'ibe' }, { role: 'PROFESSOR' }, { enrollment: 'PENDING' }, { active: false }, { role: 'SUPER_USER' }]) await assert.rejects(access(mock(variant), actor, 'class'));
});
test('helper revocation during grant locking cannot leave an authorized helper context', async () => {
  const { access } = await compile("export { access } from './apps/web/src/lib/attendance/access.ts';", { db: {} });
  const tx = {
    session: { findUnique: async () => ({ userId: 'helper', createdAt: new Date(), lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 60000), user: { id: 'helper', role: 'TEACHER', instituteId: 'ics', isActive: true, activationStatus: 'ACTIVE' } }) },
    course: { findUnique: async () => ({ id: 'class', instituteId: 'ics', instructorId: 'owner', institute: { code: 'ics', timezone: 'Asia/Manila', attendancePolicy: { phase: 3, rollout: 'ENABLED' } } }) },
    attendanceGrant: { findUnique: async () => ({ id: 'grant' }) }, $queryRaw: async () => [],
  };
  await assert.rejects(access(tx, { id: 'helper', sessionId: 'session' }, 'class', true), error => error.status === 403);
});
test('shared API client keeps attendance mutations and export on authenticated request machinery', async () => {
  const { attendanceClient } = await compile("export { attendanceClient } from './packages/api-client/src/attendance.ts';", {});
  const calls = []; const client = attendanceClient(async (path, options) => { calls.push({ path, options }); return {}; }, async path => { calls.push({ path }); return 'csv'; });
  await client.mutate('a/b', { action: 'CHECK_IN', sessionId: 's' });
  assert.equal(calls[0].path, '/api/courses/a%2Fb/attendance'); assert.equal(calls[0].options.method, 'POST');
  assert.equal(await client.exportCsv('class', '2026-11-01'), 'csv'); assert.match(calls[1].path, /from=2026-11-01/);
});
