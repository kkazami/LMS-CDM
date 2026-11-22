const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function source(relative, mocks = {}) {
  const file = path.resolve(relative), loaded = new Module(file, module);
  loaded.filename = file; loaded.paths = Module._nodeModulePaths(path.dirname(file));
  loaded.require = name => Object.hasOwn(mocks, name) ? mocks[name] : Module.createRequire(file)(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
  return loaded.exports;
}
const crypto = source('apps/web/src/lib/admin-mfa-crypto.ts');
const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

test('RFC 6238 SHA1 vectors and a bounded six-digit replay-resistant window', () => {
  for (const [seconds, expected] of [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']]) {
    assert.equal(crypto.totpCode(secret, BigInt(Math.floor(seconds / 30)), 8), expected);
  }
  const now = 1234567890000, counter = BigInt(Math.floor(now / 30000)), code = crypto.totpCode(secret, counter);
  assert.equal(crypto.matchingTotpCounter(secret, code, null, now), counter);
  assert.equal(crypto.matchingTotpCounter(secret, code, counter, now), null);
  assert.equal(crypto.matchingTotpCounter(secret, crypto.totpCode(secret, counter + 2n), null, now), null);
  assert.equal(crypto.matchingTotpCounter(secret, code + '0', null, now), null);
});

test('TOTP secrets require a configured key and authenticated user-bound encryption', t => {
  const previous = process.env.ADMIN_MFA_ENCRYPTION_KEY;
  t.after(() => { if (previous === undefined) delete process.env.ADMIN_MFA_ENCRYPTION_KEY; else process.env.ADMIN_MFA_ENCRYPTION_KEY = previous; });
  delete process.env.ADMIN_MFA_ENCRYPTION_KEY;
  assert.throws(() => crypto.encryptTotpSecret('dummy-admin', secret), error => error.status === 503);
  process.env.ADMIN_MFA_ENCRYPTION_KEY = Buffer.alloc(32, 17).toString('base64');
  const encrypted = crypto.encryptTotpSecret('dummy-admin', secret);
  assert.ok(!encrypted.includes(secret));
  assert.equal(crypto.decryptTotpSecret('dummy-admin', encrypted), secret);
  assert.throws(() => crypto.decryptTotpSecret('other-admin', encrypted), error => error.status === 503);
  const parts = encrypted.split('.'), tag = Buffer.from(parts[2], 'base64url'); tag[0] ^= 1; parts[2] = tag.toString('base64url');
  assert.throws(() => crypto.decryptTotpSecret('dummy-admin', parts.join('.')), error => error.status === 503);
});

test('recovery codes have independent high entropy and store only identity-bound hashes', () => {
  const { codes, hashes } = crypto.newRecoveryCodes('dummy-admin');
  assert.equal(codes.length, 10); assert.equal(new Set(codes).size, 10);
  assert.ok(codes.every(code => /^[a-f0-9]{8}(?:-[a-f0-9]{8}){3}$/.test(code)));
  assert.ok(hashes.every(hash => /^[a-f0-9]{64}$/.test(hash)));
  assert.ok(codes.every(code => !hashes.includes(code)));
  const used = crypto.findRecoveryHash('dummy-admin', codes[0], hashes);
  assert.ok(used); assert.equal(crypto.findRecoveryHash('other-admin', codes[0], hashes), null);
  assert.equal(crypto.findRecoveryHash('dummy-admin', codes[0], hashes.filter(hash => hash !== used)), null);
});

test('MFA proof identity bindings change with passwords, roles, institutes and Google/provisioning identities', () => {
  const mfa = source('apps/web/src/lib/admin-mfa.ts', {
    '@/lib/db': { db: {} }, '@/lib/super-user-v1/account-lock': {}, '@/lib/super-user-v1/capabilities': {}, './admin-mfa-crypto': crypto,
  });
  const user = { email: 'dummy-admin@example.invalid', password: 'dummy-password-hash', role: 'ADMIN', instituteId: 'dummy-ics', credentialProvisioningState: 'COMPLETE', googleSubject: null };
  const original = mfa.adminMfaIdentityHash(user);
  for (const field of Object.keys(user)) assert.notEqual(mfa.adminMfaIdentityHash({ ...user, [field]: 'changed' }), original);
});

test('schema-from-empty fixtures install the same MFA revocation triggers as the migration', () => {
  const companion = fs.readFileSync(path.resolve('prisma/admin-mfa/revocation.sql'), 'utf8').replaceAll('\r\n', '\n').trim();
  const migration = fs.readFileSync(path.resolve('prisma/migrations/20261115010000_admin_mfa/migration.sql'), 'utf8').replaceAll('\r\n', '\n');
  assert.ok(migration.includes(companion));
});

test('central admission creates no password-only ADMIN or SUPER_USER session and rejects legacy privileged sessions', async () => {
  for (const role of ['ADMIN', 'SUPER_USER']) {
    let created = 0;
    const writes = [];
    const user = { id: 'dummy-admin', password: 'dummy-hash', role, instituteId: 'ics', credentialProvisioningState: 'COMPLETE', googleSubject: null, isActive: true, activationStatus: 'ACTIVE', institute: { code: 'ics', name: 'Dummy Computing' } };
    const db = { session: { findFirst: async () => ({ id: 'legacy', userId: user.id, tokenHash: require('node:crypto').createHash('sha256').update('a'.repeat(43)).digest('hex'), user }) } };
    const tx = { $queryRaw: async parts => parts.join('').includes('FROM public."User"') ? [user] : [], session: { create: async () => { created++; return { id: 'should-not-exist' }; } } };
    db.$transaction = work => work(tx);
    const sessions = source('apps/web/src/lib/auth-session.ts', {
      '@lms/types': { getInstituteName: (_code, name) => name }, './db': { db },
      'next/headers': { cookies: async () => ({ set: (...args) => writes.push(args), delete() {} }), headers: async () => new Headers() },
      './super-user-v1/account-lock': {}, './super-user-v1/capabilities': { canonicalRole: value => value, privilegedRole: value => ['ADMIN', 'SUPER_USER'].includes(value), mayAdmitAccount: () => true },
      './super-user-v1/provisioning': { applicationWriterQualified: async () => true },
      './session-policy': { SESSION_ABSOLUTE_MS: 7 * 86400000, sessionExpired: () => false }, './student-access': {},
      './admin-mfa': { beginAdminMfa: async () => ({ rawToken: 'b'.repeat(43), enrollment: true }), validAdminMfaSession: async () => false, ADMIN_MFA_COOKIE: 'lumina_admin_mfa', ADMIN_MFA_COOKIE_PATH: '/api/auth/mfa', ADMIN_MFA_TTL_SECONDS: 600 },
    });
    await assert.rejects(sessions.createSession(user.id), error => error instanceof sessions.AdminMfaRequiredError);
    assert.equal(created, 0, `${role}: primary credentials must never create a full Session`);
    assert.equal(writes.find(write => write[0] === 'lumina_admin_mfa')[2].httpOnly, true);
    assert.equal(writes.some(write => write[0] === 'lumina_session'), false);
    assert.equal(await sessions.validateSessionToken('a'.repeat(43), false), null, `${role}: a legacy token has no second-factor authority`);
  }
});

test('Google callback never admits an administrator through its student-only path', async () => {
  let issued = 0;
  const user = { id: 'dummy-admin', role: 'ADMIN', isActive: true, institute: { code: 'ics' } };
  const route = source('apps/web/src/app/api/auth/callback/google/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/db': { db: { user: { findUnique: async () => user } } },
    '@/lib/google-auth': { googleConfig: () => ({ origin: 'http://localhost:3000' }), finishGoogle: async () => ({ sub: 'dummy-sub', instituteCode: 'ics' }) },
    '@/lib/auth-session': { createSession: async () => { issued++; throw new Error('Admin session must not be issued'); } },
    '@/lib/super-user-v1/capabilities': { canonicalRole: role => role, mayAdmitAccount: () => true },
    '@/lib/student-access': { needsClassEnrollment: async () => false }, '@/lib/rate-limit': { getClientIp: () => '127.0.0.1' },
    '@/lib/google-mobile': { readGoogleMobileFlow: async () => null },
  });
  const response = await route.GET(new Request('http://localhost:3000/api/auth/callback/google?code=dummy'));
  assert.equal(issued, 0); assert.equal(response.status, 302); assert.match(response.headers.get('location'), /\/login\?/);
});

test('Google mobile exchange cannot redeem an administrator session or issue another one', async () => {
  let issued = 0, consumed = 0;
  const ticket = { sessionId: 'dummy-session', tokenHash: 'dummy-hash', challenge: 'dummy-proof', sub: 'dummy-sub', instituteCode: 'ics' };
  const route = source('apps/web/src/app/api/auth/google/mobile/exchange/route.ts', {
    zod: Module.createRequire(path.resolve('apps/web/package.json'))('zod'),
    '@/lib/db': { db: { session: { findUnique: async () => ({ id: ticket.sessionId, tokenHash: ticket.tokenHash, expiresAt: new Date(Date.now() + 60000), user: { role: 'ADMIN', googleSubject: ticket.sub, institute: { code: 'ics' } } }), deleteMany: async () => { consumed++; return { count: 1 }; } } } },
    '@/lib/auth-session': { createSession: async () => { issued++; } }, '@/lib/roster/rate-limit': { persistentLimit: async () => {} },
    '@/lib/rate-limit': { getClientIp: () => '127.0.0.1' }, '@/lib/request-security': { mutationOriginAllowed: () => true },
    '@/lib/roster/policy': { boundedJson: request => request.json() }, '@/lib/super-user-v1/capabilities': { mayAdmitAccount: () => true },
    '@/lib/google-mobile': { openGoogleMobile: async () => ticket, googleMobileVerifierHash: () => 'dummy-proof', googleMobileHeaders: {} },
  });
  const response = await route.POST(new Request('http://localhost:3000/api/auth/google/mobile/exchange', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ticket: 'a'.repeat(32), verifier: 'b'.repeat(64) }) }));
  assert.equal(response.status, 400); assert.equal(issued, 0); assert.equal(consumed, 0);
});

test('native API clients fail clearly on MFA-required login without accepting a missing token', async t => {
  const api = source('packages/api-client/src/index.ts', { './attendance': { attendanceClient: () => ({}) } });
  t.mock.method(globalThis, 'fetch', async () => Response.json({ mfaRequired: true }, { status: 202 }));
  const client = api.createApiClient({ baseUrl: 'http://localhost:3000' });
  await assert.rejects(client.auth.login({ identifier: 'dummy@example.invalid', password: 'dummy-only', acceptedPolicies: true }), /authenticator/);
});
