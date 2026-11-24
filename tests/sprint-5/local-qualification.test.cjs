const assert = require('node:assert/strict');
const { createHash, createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');
const { mkdtemp, readFile, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const { hash } = require('bcryptjs');
const { verifyAccountPassword } = require('../../apps/web/src/lib/password-hashing.ts');
const { sessionCookiePolicy } = require('../../apps/web/src/lib/session-cookie.ts');

const digest = value => createHash('sha256').update(value).digest('hex');

function withImports(stubs, loadFixture) {
  const load = Module._load;
  Module._load = function (name, ...args) {
    return Object.hasOwn(stubs, name) ? stubs[name] : load.call(this, name, ...args);
  };
  try { return loadFixture(); } finally { Module._load = load; }
}

function input(path, method, body) {
  return new Request('https://staging.example.invalid/api/auth/' + path, {
    method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
}

const session = () => ({
  id: 'dummy-session', userId: 'dummy-student', tokenHash: 'dummy', user: { id: 'dummy-student', role: 'STUDENT' },
  createdAt: new Date(), lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 60_000),
});

test('the nonproduction password pilot requires a checksummed list and excludes privileged roles', async () => {
  const { passwordWritePilotEnabled, passwordPilotBlocklist } = require('../../apps/web/src/lib/password-write-pilot.ts');
  const fixture = await mkdtemp(join(tmpdir(), 'password-pilot-'));
  const path = join(fixture, 'digests.txt');
  const output = Array.from({ length: 3000 }, (_, i) => digest('synthetic-only-password-' + i)).join('\n') + '\n';
  await writeFile(path, output);
  const original = process.env.NODE_ENV;
  try {
    assert.equal(passwordWritePilotEnabled('PROFESSOR'), false);
    process.env.LMS_SYNTHETIC_PASSWORD_PILOT = '1';
    process.env.LMS_PASSWORD_PILOT_BLOCKLIST_FILE = path;
    process.env.LMS_PASSWORD_PILOT_BLOCKLIST_SHA256 = digest('wrong');
    await assert.rejects(passwordPilotBlocklist(), /checksum mismatch/);
    process.env.LMS_PASSWORD_PILOT_BLOCKLIST_SHA256 = digest(output);
    assert.equal((await passwordPilotBlocklist()).size, 3000);
    assert.equal(passwordWritePilotEnabled('PROFESSOR'), true);
    assert.equal(passwordWritePilotEnabled('ADMIN'), false);
    assert.equal(passwordWritePilotEnabled('SUPER_USER'), false);
    process.env.NODE_ENV = 'production';
    assert.equal(passwordWritePilotEnabled('STUDENT'), false);
  } finally {
    process.env.NODE_ENV = original;
    delete process.env.LMS_SYNTHETIC_PASSWORD_PILOT;
    delete process.env.LMS_PASSWORD_PILOT_BLOCKLIST_FILE;
    delete process.env.LMS_PASSWORD_PILOT_BLOCKLIST_SHA256;
  }
});

test('password change applies pilot policy, conditional update, session clearing and fixed audit metadata', async t => {
  const actor = session();
  const password = await hash('OldFixture123', 4);
  let originalHash = password;
  let latest;
  let pilot = true;
  let updates = 0;
  let deletes = 0;
  let audit;
  let changeAllowed = true;
  let rateStatus = 0;
  class AccessError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  }
  const memory = process.memoryUsage().rss;
  const start = performance.now();
  const tx = {
    user: { updateMany: async ({ where, data }) => {
      updates++;
      assert.deepEqual(where, { id: actor.userId, password: originalHash, securityPin: null, role: 'STUDENT', isActive: true });
      latest = data.password;
      return { count: Number(changeAllowed) };
    } },
    session: { findFirst: async () => actor, deleteMany: async ({ where }) => { assert.equal(where.userId, actor.userId); deletes++; } },
    auditLog: { create: async ({ data }) => { audit = data; } },
  };
  const { POST } = withImports({
    '@/lib/auth-session': { getSession: async () => actor },
    '@/lib/db': { db: { user: { findUnique: async () => ({ password: originalHash, securityPin: null }) }, $transaction: async run => run(tx) } },
    '@/lib/password-write-pilot': { passwordWritePilotEnabled: () => pilot,
      passwordPilotBlocklist: async () => new Set([digest('synthetic blocked choice')]) },
    '@/lib/super-user-v1/legacy-entry-guard': { denyLegacyApi: async () => null },
    '@/lib/super-user-v1/actor': { AccessError },
    '@/lib/super-user-v1/account-lock': { lockAccounts: async () => {} },
    '@/lib/authenticated-rate-limits': { limitAuthenticatedOperation: async (operation, id) => {
      assert.equal(operation, 'passwordChange'); assert.equal(id, actor.userId);
      if (rateStatus) throw new AccessError(rateStatus, 'Limiter unavailable.');
    } },
  }, () => require('../../apps/web/src/app/api/auth/change-password/route.ts'));
  const submit = (newPassword, currentPassword = 'OldFixture123') => POST(input('change-password', 'POST', { newPassword, currentPassword }));
  const longPassword = 'Épreuve '.repeat(16);
  assert.equal((await submit('synthetic blocked choice')).status, 400);
  assert.equal((await submit(longPassword, 'DifferentFixturePassword')).status, 400);
  rateStatus = 429;
  assert.equal((await submit(longPassword)).status, 429);
  rateStatus = 503;
  const unavailable = await submit(longPassword);
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: 'Unable to change password right now.' });
  rateStatus = 0;
  assert.equal(updates, 0);
  changeAllowed = false;
  assert.equal((await submit(longPassword)).status, 409);
  assert.equal(deletes, 0);
  assert.equal(audit, undefined);
  changeAllowed = true;
  const result = await submit(longPassword);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'private, no-store');
  assert.ok(result.headers.get('set-cookie').includes('__Host-lumina_session='));
  assert.equal(deletes, 1);
  assert.deepEqual(audit, { adminId: actor.userId, targetId: actor.userId, action: 'SELF_PASSWORD_CHANGED', metadata: '{"outcome":"UPDATED"}' });
  assert.match(latest, /^\$argon2id\$/);
  assert.equal(await verifyAccountPassword(longPassword, latest), true);
  assert.equal(await verifyAccountPassword(longPassword.trimEnd(), latest), false);
  originalHash = latest;
  pilot = false;
  assert.equal((await submit('OtherPass100', longPassword)).status, 503);
  assert.equal(updates, 2);
  t.diagnostic(`After native writer sequence: ${Math.round(performance.now() - start)} ms; RSS delta ${Math.round((process.memoryUsage().rss - memory) / (1024 * 1024))} MiB; process peak RSS ${Math.round(process.resourceUsage().maxRSS / 1024)} MiB`);
});

test('revoking another device needs recent admission and all replies are private', async () => {
  const actor = session();
  actor.createdAt = new Date(Date.now() - 600_000);
  const calls = [];
  const tx = { session: { findFirst: async () => actor, deleteMany: async ({ where }) => { calls.push(where); return { count: 1 }; } } };
  const { DELETE } = withImports({
    '@/lib/auth-session': { getSession: async () => actor },
    '@/lib/db': { db: { $transaction: async fn => fn(tx) } },
    '@/lib/super-user-v1/legacy-entry-guard': { denyLegacyApi: async () => null },
    '@/lib/super-user-v1/actor': { AccessError: class extends Error {} },
    '@/lib/super-user-v1/account-lock': { lockAccounts: async () => {} },
    '@/lib/authenticated-rate-limits': { limitAuthenticatedOperation: async () => {} },
  }, () => require('../../apps/web/src/app/api/auth/sessions/route.ts'));
  const request = query => DELETE(input('sessions?' + query, 'DELETE'));
  const stale = await request('id=another-device');
  assert.equal(stale.status, 403);
  assert.equal(stale.headers.get('cache-control'), 'private, no-store');
  assert.equal(calls.length, 0);
  assert.equal((await request('id=one&id=two')).status, 400);
  const current = await request('id=dummy-session');
  assert.equal(current.status, 200);
  assert.ok(current.headers.get('set-cookie').includes('lumina_session='));
  assert.deepEqual(calls, [{ userId: actor.userId, id: 'dummy-session' }]);
  actor.createdAt = new Date();
  assert.equal((await request('id=another-device')).status, 200);
  assert.equal(calls.at(-1).id, 'another-device');
});

test('cookie cutover accepts canonical UTC and rejects impossible or ambiguous dates', () => {
  for (const cutover of ['2026-02-31T09:00:00Z', '2026-12-01', '2026-12-01T09:00:00', '2026-12-01T09:00:00+00:00']) {
    assert.throws(() => sessionCookiePolicy({ production: true, cutover }), /valid UTC/);
  }
  const cutover = '2026-12-01T09:00:00Z';
  assert.equal(sessionCookiePolicy({ production: true, cutover, now: Date.parse(cutover) }).write, '__Host-lumina_session');
});

test('independent synthetic config, object and key recovery preserves integrity', async t => {
  const start = performance.now();
  const archiveDir = await mkdtemp(join(tmpdir(), 'sprint5-encrypted-data-'));
  const keyDir = await mkdtemp(join(tmpdir(), 'sprint5-test-key-'));
  const recoveredDir = await mkdtemp(join(tmpdir(), 'sprint5-recovered-'));
  const config = JSON.stringify({ environment: 'synthetic', credentialKeyId: 'test-key-v1', revision: 'dummy-revision' });
  const object = Buffer.from('dummy object without any LMS record');
  const source = Buffer.from(JSON.stringify({ config, object: object.toString('base64') }));
  const key = randomBytes(32);
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const encrypted = Buffer.concat([cipher.update(source), cipher.final()]);
  const archive = Buffer.concat([nonce, cipher.getAuthTag(), encrypted]);
  await writeFile(join(archiveDir, 'encrypted'), archive);
  await writeFile(join(keyDir, 'test-key-v1'), key, { mode: 0o600 });
  const stored = await readFile(join(archiveDir, 'encrypted'));
  const restoredKey = await readFile(join(keyDir, 'test-key-v1'));
  const decipher = createDecipheriv('aes-256-gcm', restoredKey, stored.subarray(0, 12));
  decipher.setAuthTag(stored.subarray(12, 28));
  const restored = JSON.parse(Buffer.concat([decipher.update(stored.subarray(28)), decipher.final()]));
  await writeFile(join(recoveredDir, 'config.json'), restored.config);
  await writeFile(join(recoveredDir, 'dummy-object'), Buffer.from(restored.object, 'base64'));
  assert.equal(digest(await readFile(join(recoveredDir, 'config.json'))), digest(config));
  assert.equal(digest(await readFile(join(recoveredDir, 'dummy-object'))), digest(object));
  t.diagnostic(`Synthetic configuration, object and test-key recovery: ${Math.round(performance.now() - start)} ms`);
});
