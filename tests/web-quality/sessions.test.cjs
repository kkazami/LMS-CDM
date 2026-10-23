const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { compile } = require('./compile.cjs');
const authSource = `export * from './apps/web/src/lib/auth-session'; export * from './apps/web/src/lib/session-policy';`;
const hash = token => createHash('sha256').update(token).digest('hex');
const token = 'A'.repeat(43), second = 'B'.repeat(43);
function fixture() {
  const now = Date.now();
  const rows = [{ id: 'internalSessionId12345', tokenHash: hash(token), userId: 'student', createdAt: new Date(now - 600000), lastSeenAt: new Date(now - 120000), expiresAt: new Date(now + 86400000), user: { id: 'student', role: 'STUDENT', instituteId: 'ics', isActive: true, activationStatus: 'ACTIVE' } }];
  const calls = { updates: 0, deletes: 0 };
  const state = { realAuth: true, rows, calls, headers: new Headers(), cookies: { get: () => ({ value: token }), delete() {}, set() {} }, db: { enrollment: { findFirst: async () => ({ id: 'approved-own-institute-enrollment' }) }, session: {
    findFirst: async ({ where }) => rows.find(row => row.tokenHash === where.tokenHash) || null,
    delete: async ({ where }) => { calls.deletes++; const index = rows.findIndex(row => row.id === where.id); if (index >= 0) rows.splice(index, 1); },
    updateMany: async ({ where, data }) => { calls.updates++; const row = rows.find(r => r.id === where.id); if (!row) return { count: 0 }; row.lastSeenAt = data.lastSeenAt; return { count: 1 }; },
  } } };
  return state;
}
test('idle and absolute deadlines expire exactly at their boundaries; refresh cannot move the absolute cap', async () => {
  const api = await compile(authSource, fixture()); const now = Date.now();
  const row = { createdAt: new Date(now - 7 * 86400000), lastSeenAt: new Date(now), expiresAt: new Date(now + 30 * 86400000) };
  assert.equal(api.sessionExpired(row, now), true);
  row.createdAt = new Date(now - 1000); row.lastSeenAt = new Date(now - 30 * 60000);
  assert.equal(api.sessionExpired(row, now), true); row.lastSeenAt = new Date(now - 30 * 60000 + 1); assert.equal(api.sessionExpired(row, now), false);
  assert.equal(api.sessionDeadline(row).getTime(), row.createdAt.getTime() + api.SESSION_ABSOLUTE_MS);
});
test('real validator uses token hashes, rejects internal IDs and inactive, expired or revoked identities', async () => {
  const state = fixture(), api = await compile(authSource, state);
  assert.equal(await api.validateSessionToken(state.rows[0].id), null);
  assert.equal((await api.validateSessionToken(token)).userId, 'student'); assert.equal(state.calls.updates, 1);
  await api.validateSessionToken(token); assert.equal(state.calls.updates, 1);
  state.rows[0].lastSeenAt = new Date(Date.now() - 1800001); assert.equal(await api.validateSessionToken(token), null); assert.equal(state.calls.deletes, 1);
  assert.equal(await api.validateSessionToken(token), null);
});

test('existing sessions expose the current ICS name even when the roster contains an older name', async () => {
  const state = fixture();
  state.rows[0].user.institute = { code: 'ics', name: 'Legacy institute name' };
  const api = await compile(authSource, state);
  assert.equal((await api.validateSessionToken(token)).user.institute.name, 'Institute of Computing Studies');
});

test('deactivated accounts and an idle-touch revocation race cannot obtain a valid session', async () => {
  const state = fixture(), api = await compile(authSource, state); state.rows[0].user.isActive = false;
  assert.equal(await api.validateSessionToken(token), null); assert.equal(state.calls.deletes, 1);
  const race = fixture(); race.db.session.updateMany = async () => ({ count: 0 });
  assert.equal(await (await compile(authSource, race)).validateSessionToken(token), null);
});
test('cookie identity wins over bearer and remains pinned while revoked credentials cannot fall through', async () => {
  const state = fixture(); state.rows.push({ ...state.rows[0], id: 'otherSession', userId: 'other', tokenHash: hash(second), user: { ...state.rows[0].user, id: 'other' } });
  state.headers.set('authorization', 'Bearer ' + second);
  const api = await compile(authSource, state);
  assert.equal((await api.getSession()).userId, 'student');
  state.rows.splice(0, 1); assert.equal(await api.getSession(), null);
  state.headers = new Headers({ authorization: 'Bearer ' + second }); state.cookies.get = () => undefined;
  assert.equal((await api.getSession()).userId, 'other');
});
test('background polling validates expiry without extending idle activity', async () => {
  const state = fixture(), api = await compile(authSource, state);
  assert.ok(await api.getSession(new Request('https://lms.test/api/gamification/heartbeat'))); assert.equal(state.calls.updates, 0);
  state.headers = new Headers();
  assert.ok(await api.getSession(new Request('https://lms.test/api/courses'))); assert.equal(state.calls.updates, 1);
});

test('foreground editor activity renews idle time while passive heartbeat and refresh do not', async () => {
  const state = fixture(), api = await compile(authSource, state);
  for (const request of [new Request('https://lms.test/api/auth/refresh', { method: 'POST' }), new Request('https://lms.test/api/gamification/heartbeat', { method: 'POST' })]) {
    state.headers = new Headers(); assert.ok(await api.getSession(request)); assert.equal(state.calls.updates, 0);
  }
  state.headers = new Headers();
  assert.ok(await api.getSession(new Request('https://lms.test/api/gamification/heartbeat', { method: 'POST', headers: { 'x-lms-user-active': '1' } })));
  assert.equal(state.calls.updates, 1);
});
test('refresh returns the existing capped expiry and performs no expiry extension', async () => {
  const session = fixture().rows[0]; session.expiresAt = new Date(Date.now() + 30 * 86400000);
  const api = await compile(`export { POST } from './apps/web/src/app/api/auth/refresh/route';`, { session });
  const response = await api.POST(new Request('https://lms.test/api/auth/refresh', { method: 'POST' }));
  assert.equal(response.status, 200);
  assert.equal(new Date((await response.json()).expiresAt).getTime(), session.createdAt.getTime() + 7 * 86400000);
});
