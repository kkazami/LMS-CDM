const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { test } = require('node:test');
const Module = require('node:module');
const { hash } = require('bcryptjs');
const { verifyAccountPassword, hashArgonPassword, canRehashLegacyPassword, newPasswordIssue } = require('../../apps/web/src/lib/password-hashing.ts');
const { sessionCookiePolicy, SESSION_COOKIE_NAMES, sessionCookieAttributes, hasSessionCookie } = require('../../apps/web/src/lib/session-cookie.ts');
const { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, sessionExpired, recentlyAuthenticated } = require('../../apps/web/src/lib/session-policy.ts');

test('dual password verifier retains bcrypt and uses salted NFC Argon2id', async t => {
  const legacyText = 'synthetic fixture';
  const bcrypt = await hash(legacyText, 4);
  assert.equal(await verifyAccountPassword(legacyText, bcrypt), true);
  assert.equal(await verifyAccountPassword('different fixture', bcrypt), false);
  const start = performance.now();
  const first = await hashArgonPassword('synthetic é fixture');
  const second = await hashArgonPassword('synthetic é fixture');
  assert.notEqual(first, second);
  assert.equal(await verifyAccountPassword('synthetic e\u0301 fixture', first), true);
  assert.equal(await verifyAccountPassword('different fixture', first), false);
  t.diagnostic(`4 sequential Argon2id jobs in the local fixture: ${Math.round(performance.now() - start)} ms`);
});

test('Argon2id limits native workloads and preserves ambiguous legacy credentials', async () => {
  const bcrypt = await hash('synthetic fixture', 4);
  assert.equal(canRehashLegacyPassword('synthetic fixture', bcrypt), true);
  assert.equal(canRehashLegacyPassword('é'.repeat(36), bcrypt), false);
  assert.equal(canRehashLegacyPassword('e\u0301 fixture', bcrypt), false);
  assert.equal(await verifyAccountPassword('dummy', '$argon2id$invalid'), false);
  assert.throws(() => hashArgonPassword('😀'.repeat(129)), RangeError);
  const jobs = [hashArgonPassword('synthetic first'), hashArgonPassword('synthetic second')];
  await assert.rejects(hashArgonPassword('synthetic third'), /temporarily busy/);
  await Promise.all(jobs);
});

test('candidate new-password policy accepts spaces and Unicode, checks a local digest set and rejects missing policy data', () => {
  const blocked = 'sample forbidden phrase';
  const digests = new Set([createHash('sha256').update(blocked).digest('hex')]);
  assert.equal(newPasswordIssue(blocked, false, digests), 'compromised');
  assert.equal(newPasswordIssue('abcdefgh', true, digests), null);
  assert.equal(newPasswordIssue('abcdefgh', false, digests), 'length');
  assert.equal(newPasswordIssue('å '.repeat(32), false, digests), null);
  assert.throws(() => newPasswordIssue('a different long phrase', false, new Set()), /unavailable/);
});

test('production host-cookie migration has a fixed seven-day reader window', () => {
  const cutover = '2026-11-19T00:00:00.000Z';
  const start = Date.parse(cutover);
  const [modern, legacy] = SESSION_COOKIE_NAMES;
  assert.equal(sessionCookiePolicy({ production: true, cutover, now: start - 1 }).write, legacy);
  assert.deepEqual(sessionCookiePolicy({ production: true, cutover, now: start }), { write: modern, read: [modern, legacy] });
  assert.deepEqual(sessionCookiePolicy({ production: true, cutover, now: start + SESSION_ABSOLUTE_MS }), { write: modern, read: [modern] });
  assert.deepEqual(sessionCookiePolicy({ production: false, cutover, now: start }), { write: legacy, read: [legacy] });
  assert.deepEqual(sessionCookieAttributes(modern), { secure: true, httpOnly: true, sameSite: 'lax', path: '/' });
  assert.equal(hasSessionCookie('other=x; ' + modern + '=dummy'), true);
  assert.equal(hasSessionCookie('other=sample-lumina_session=dummy'), false);
});

test('idle expiration and recent authentication are independent of the absolute session lifetime', () => {
  const now = 1750000000000;
  const time = offset => new Date(now + offset);
  assert.equal(sessionExpired({ createdAt: time(-1000), lastSeenAt: time(-200), expiresAt: time(1000) }, now), false);
  assert.equal(sessionExpired({ createdAt: time(-SESSION_IDLE_MS), lastSeenAt: time(-SESSION_IDLE_MS), expiresAt: time(1000) }, now), true);
  assert.equal(recentlyAuthenticated(time(-300_000), now), false);
  assert.equal(recentlyAuthenticated(time(-299_999), now), true);
});

function withImports(stubs, loadFixture) {
  const load = Module._load;
  Module._load = function (name, ...args) {
    return Object.hasOwn(stubs, name) ? stubs[name] : load.call(this, name, ...args);
  };
  try { return loadFixture(); } finally { Module._load = load; }
}

test('session revocation keeps the account predicate and requires fresh proof for all devices', async () => {
  const actor = { id: 'current', userId: 'student-a', user: { id: 'student-a' }, tokenHash: 'dummy-hash',
    createdAt: new Date(), lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 60_000) };
  const deletes = [];
  const tx = { session: { findFirst: async () => actor, deleteMany: async ({ where }) => { deletes.push(where); return { count: 1 }; } } };
  class AccessError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const { DELETE } = withImports({
    '@/lib/auth-session': { getSession: async () => actor },
    '@/lib/db': { db: { $transaction: async run => run(tx) } },
    '@/lib/super-user-v1/legacy-entry-guard': { denyLegacyApi: async () => null },
    '@/lib/super-user-v1/actor': { AccessError },
    '@/lib/super-user-v1/account-lock': { lockAccounts: async () => {} },
    '@/lib/authenticated-rate-limits': { limitAuthenticatedOperation: async () => {} },
  }, () => require('../../apps/web/src/app/api/auth/sessions/route.ts'));
  const request = query => new Request('https://lms.example.invalid/api/auth/sessions?' + query, { method: 'DELETE' });
  assert.equal((await DELETE(request('id=device-b'))).status, 200);
  assert.deepEqual(deletes[0], { userId: 'student-a', id: 'device-b' });
  actor.createdAt = new Date(Date.now() - 600_000);
  assert.equal((await DELETE(request('all=1'))).status, 403);
  assert.equal(deletes.length, 1);
  actor.createdAt = new Date();
  const result = await DELETE(request('all=1'));
  assert.equal(result.status, 200);
  assert.deepEqual(deletes[1], { userId: 'student-a' });
  assert.equal(result.headers.get('cache-control'), 'private, no-store');
  for (const name of SESSION_COOKIE_NAMES) assert.ok(result.headers.get('set-cookie').includes(name + '='));
});

test('persistent limiter checks bounds, hashes the key, and fails closed', async () => {
  class AccessError extends Error { constructor(status, message) { super(message); this.status = status; } }
  const sql = [];
  let count = 1;
  const { persistentLimit, pruneExpiredRateLimitBatch } = withImports({
    '@/lib/db': { db: { $queryRaw: async (fragments, ...values) => { sql.push([fragments.join('?'), values]); return [{ count }]; },
      $executeRaw: async fragments => { sql.push([fragments.join('?')]); return 1; } } },
    '@/lib/super-user-v1/actor': { AccessError },
  }, () => require('../../apps/web/src/lib/roster/rate-limit.ts'));
  await assert.rejects(persistentLimit('dummy', Number.NaN, 1000), error => error.status === 503);
  assert.equal(sql.length, 0);
  await persistentLimit('dummy', 1, 1000);
  assert.match(sql[0][0], /ON CONFLICT.*DO UPDATE/s);
  assert.equal(sql[0][1][0], createHash('sha256').update('dummy').digest('hex'));
  count = 2;
  await assert.rejects(persistentLimit('dummy', 1, 1000), error => error.status === 429);
  assert.equal(await pruneExpiredRateLimitBatch(), 1);
  assert.match(sql[2][0], /LIMIT 250 FOR UPDATE SKIP LOCKED/);
});
