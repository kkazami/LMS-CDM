const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const Module = require('node:module');
const { test } = require('node:test');
const { NextResponse } = Module.createRequire(require.resolve('../../apps/web/package.json'))('next/server');
const { hashArgonPassword, verifyAccountPassword } = require('../../apps/web/src/lib/password-hashing.ts');
const { sessionCookiePolicy, sessionCookieAttributes } = require('../../apps/web/src/lib/session-cookie.ts');
const { sessionExpired, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } = require('../../apps/web/src/lib/session-policy.ts');

function provisioningFixture() {
  const state = { pilot: true, transactions: 0, audit: [], creates: [], limits: [], auditUnavailable: false };
  const tx = {
    user: { create: async ({ data }) => {
      state.creates.push(data);
      return { id: 'instructor', role: data.role, permissions: data.permissions, createdAt: new Date() };
    } },
    auditLog: { create: async ({ data }) => {
      if (state.auditUnavailable) throw new Error('Synthetic internal failure');
      state.audit.push(data);
    } },
  };
  const mocks = {
    '@/lib/db': { db: {
      user: { findUnique: async () => null },
      institute: { findUnique: async () => ({ id: 'dummy-ics' }) },
      $transaction: async work => { state.transactions++; return work(tx); },
    } },
    '@/lib/administrator-scope': { administratorInstitute: async (actor, code) => {
      assert.equal(actor.id, 'dummy-admin'); assert.equal(code, 'ics');
    } },
    '@/lib/password-write-pilot': {
      passwordWritePilotEnabled: role => state.pilot && role === 'PROFESSOR',
      passwordPilotBlocklist: async () => new Set([createHash('sha256').update('dummy blocked passphrase').digest('hex')]),
    },
    '@/lib/authenticated-rate-limits': { limitAuthenticatedOperation: async (operation, actor) => state.limits.push([operation, actor]) },
    '@/lib/rbac': { requireAdmin: async () => ({ user: { id: 'dummy-admin' } }), parsePermissions: JSON.parse },
    '@/lib/super-user-v1/legacy-entry-guard': { denyLegacyApi: async () => null },
    '@/lib/roster/imports': {}, '@/lib/roster/policy': {}, '@/lib/roster/csv': {},
  };
  const original = Module._load;
  let handler;
  Module._load = function (name, ...args) {
    return Object.hasOwn(mocks, name) ? mocks[name] : original.call(this, name, ...args);
  };
  try {
    const handlerPath = require.resolve('../../apps/web/src/app/api/admin/users/route.ts');
    delete require.cache[handlerPath];
    handler = require(handlerPath).POST;
  } finally { Module._load = original; }
  return { state, submit: password => handler(new Request('https://fixture.invalid/api/admin/users', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Synthetic Instructor', email: 'instructor@example.invalid', role: 'INSTRUCTOR', instituteCode: 'ics', password }),
  })) };
}

test('instructor pilot validates the shared policy and stores Argon2id with metadata-only audit', async () => {
  const { state, submit } = provisioningFixture();
  assert.equal((await submit('dummy blocked passphrase')).status, 400);
  assert.equal(state.transactions, 0);
  const password = 'é fixture phrase '.repeat(6);
  const response = await submit(password);
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(state.limits, [['instructorProvisioning', 'dummy-admin']]);
  assert.match(state.creates[0].password, /^\$argon2id\$/);
  assert.equal(await verifyAccountPassword(password, state.creates[0].password), true);
  assert.equal((await response.json()).temporaryPassword, undefined);
  assert.deepEqual(JSON.parse(state.audit[0].metadata), { instituteId: 'dummy-ics', role: 'INSTRUCTOR', outcome: 'CREATED' });
});

test('legacy provisioning rejects a truncated password and protects issued temporary credentials', async () => {
  const { state, submit } = provisioningFixture();
  state.pilot = false;
  assert.equal((await submit('é'.repeat(37))).status, 400);
  assert.equal(state.transactions, 0);
  const response = await submit(undefined);
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const { temporaryPassword } = await response.json();
  assert.equal(await verifyAccountPassword(temporaryPassword, state.creates[0].password), true);
  state.auditUnavailable = true;
  const unavailable = await submit(undefined);
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { message: 'Unable to create the account right now.' });
});

test('seven-day rehearsal serializes private cookies and preserves server-side absolute and idle limits', () => {
  const cutover = '2026-12-01T09:00:00Z';
  const start = Date.parse(cutover);
  const policy = now => sessionCookiePolicy({ production: true, cutover, now });
  assert.equal(policy(start - 1).write, 'lumina_session');
  assert.deepEqual(policy(start).read, ['__Host-lumina_session', 'lumina_session']);
  assert.deepEqual(policy(start + SESSION_ABSOLUTE_MS - 1).read, ['__Host-lumina_session', 'lumina_session']);
  assert.deepEqual(policy(start + SESSION_ABSOLUTE_MS).read, ['__Host-lumina_session']);
  const response = NextResponse.json({});
  response.cookies.set(policy(start).write, 'synthetic-opaque-token', sessionCookieAttributes(policy(start).write));
  const wire = response.headers.get('set-cookie');
  assert.match(wire, /^__Host-lumina_session=/);
  for (const field of ['Path=/', 'Secure', 'HttpOnly', 'SameSite=lax']) assert.ok(wire.includes(field));
  assert.doesNotMatch(wire, /Domain=/i);
  const session = { createdAt: new Date(start - 1), expiresAt: new Date(start + SESSION_ABSOLUTE_MS),
    lastSeenAt: new Date(start + SESSION_ABSOLUTE_MS - 1) };
  assert.equal(sessionExpired(session, start + SESSION_ABSOLUTE_MS), true);
  const idle = { createdAt: new Date(start), expiresAt: new Date(start + SESSION_ABSOLUTE_MS), lastSeenAt: new Date(start) };
  assert.equal(sessionExpired(idle, start + SESSION_IDLE_MS), true);
});

test('native Argon2id measures sequential and bounded two-job performance', async t => {
  const secret = 'public synthetic performance input';
  const serial = performance.now();
  for (let index = 0; index < 6; index++) {
    assert.equal(await verifyAccountPassword(secret, await hashArgonPassword(secret)), true);
  }
  const serialMs = Math.round(performance.now() - serial);
  const parallel = performance.now();
  for (let index = 0; index < 3; index++) {
    const stored = await Promise.all([hashArgonPassword(secret), hashArgonPassword(secret)]);
    assert.deepEqual(await Promise.all(stored.map(row => verifyAccountPassword(secret, row))), [true, true]);
  }
  t.diagnostic(`Argon2id 12 serial native jobs: ${serialMs} ms; 12 two-at-a-time native jobs: ${Math.round(performance.now() - parallel)} ms; process peak RSS ${Math.round(process.resourceUsage().maxRSS / 1024)} MiB`);
});

test('restored synthetic MFA key reads its factor and preserves recovery-code subject binding', () => {
  const { encryptTotpSecret, decryptTotpSecret, newTotpSecret, totpCode, matchingTotpCounter,
    newRecoveryCodes, findRecoveryHash } = require('../../apps/web/src/lib/admin-mfa-crypto.ts');
  const original = process.env.ADMIN_MFA_ENCRYPTION_KEY;
  const backedUpKey = randomBytes(32).toString('base64');
  const actor = 'dummy-factor-owner';
  try {
    process.env.ADMIN_MFA_ENCRYPTION_KEY = backedUpKey;
    const stored = encryptTotpSecret(actor, newTotpSecret());
    const { codes, hashes } = newRecoveryCodes(actor);
    process.env.ADMIN_MFA_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    assert.throws(() => decryptTotpSecret(actor, stored), { status: 503 });
    process.env.ADMIN_MFA_ENCRYPTION_KEY = backedUpKey;
    const restored = decryptTotpSecret(actor, stored);
    const counter = 100n;
    const now = Number(counter) * 30_000;
    const code = totpCode(restored, counter);
    assert.equal(matchingTotpCounter(restored, code, null, now), counter);
    assert.equal(matchingTotpCounter(restored, code, counter, now), null);
    assert.equal(findRecoveryHash(actor, codes[0], hashes), hashes[0]);
    assert.equal(findRecoveryHash('another-dummy-owner', codes[0], hashes), null);
  } finally {
    if (original === undefined) delete process.env.ADMIN_MFA_ENCRYPTION_KEY;
    else process.env.ADMIN_MFA_ENCRYPTION_KEY = original;
  }
});
