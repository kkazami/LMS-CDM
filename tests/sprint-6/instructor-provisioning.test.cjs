// Current-schema ordinary provisioning with a synthetic, pre-admitted MFA administrator.
const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const { mkdtemp, readFile, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const Module = require('node:module');
const { test } = require('node:test');
const { Client } = require('pg');

const digest = text => createHash('sha256').update(text).digest('hex');

test('MFA-qualified admin provisions and resets a synthetic instructor with scoped audit events', { timeout: 60_000 }, async t => {
  assert.equal(process.env.SPRINT2_DISPOSABLE, '1');
  assert.equal(process.env.DATABASE_URL, 'postgresql://sprint_app:dummy_fixture_only@127.0.0.1:5432/sprint2_staging');
  const owner = new Client({ host: '127.0.0.1', port: 5432, database: 'sprint2_staging', user: 'postgres', connectionTimeoutMillis: 5000 });
  let db;
  t.after(async () => { await db?.$disconnect(); await globalThis.pgPool?.end(); await owner.end(); });
  await owner.connect();
  assert.equal((await owner.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0);
  await owner.query(await readFile('/fixture/schema.sql', 'utf8'));
  await owner.query(await readFile('prisma/admin-mfa/revocation.sql', 'utf8'));
  await owner.query(`
    INSERT INTO "Institute"(id,code,name) VALUES ('ics','ics','Synthetic Institute');
    INSERT INTO "User"(id,name,email,role,"instituteId") VALUES ('dummy-admin','Dummy Admin','admin@example.invalid','ADMIN','ics');
  `);
  const { installSuperUserBoundary } = await import('../../scripts/install-super-user-boundary.mjs');
  await installSuperUserBoundary(owner, { runtimePrincipal: 'sprint_app', operatorPrincipal: 'sprint_operator',
    runtimePassword: 'dummy_fixture_only'.padEnd(32, '_'), operatorPassword: 'dummy_operator_only'.padEnd(32, '_'),
    qualificationReference: 'synthetic-sprint6-provisioning' });
  await owner.query("ALTER ROLE sprint_app PASSWORD 'dummy_fixture_only'");
  db = require('../../apps/web/src/lib/db.ts').db;
  const token = randomBytes(32).toString('base64url');
  const admitted = await db.session.create({ data: { userId: 'dummy-admin', tokenHash: digest(token), expiresAt: new Date(Date.now() + 3600_000) } });
  const admin = await db.user.findUniqueOrThrow({ where: { id: 'dummy-admin' } });
  let requestHeaders;
  const original = Module._load;
  let POST;
  let reset;
  let adminMfaIdentityHash;
  Module._load = function (name, ...args) {
    if (name === 'next/headers') return {
      headers: async () => requestHeaders,
      cookies: async () => ({ get: name => name === 'lumina_session' ? { value: token } : undefined }),
    };
    return original.call(this, name, ...args);
  };
  try {
    ({ POST } = require('../../apps/web/src/app/api/admin/users/route.ts'));
    ({ POST: reset } = require('../../apps/web/src/app/api/admin/users/[userId]/reset-password/route.ts'));
    ({ adminMfaIdentityHash } = require('../../apps/web/src/lib/admin-mfa.ts'));
  } finally { Module._load = original; }
  const { encryptTotpSecret } = require('../../apps/web/src/lib/admin-mfa-crypto.ts');
  await owner.query('INSERT INTO "AdminMfaFactor" ("userId","encryptedSecret","recoveryHashes",version) VALUES ($1,$2,$3,$4)',
    [admin.id, encryptTotpSecret(admin.id, 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'), '[]', 'dummy-factor']);
  await owner.query('INSERT INTO "AdminMfaSession" ("sessionId","userId","factorVersion","identityHash") VALUES ($1,$2,$3,$4)',
    [admitted.id, admin.id, 'dummy-factor', adminMfaIdentityHash(admin)]);

  const path = join(await mkdtemp(join(tmpdir(), 'provisioning-')), 'digests.txt');
  const contents = Array.from({ length: 3000 }, (_, i) => digest('synthetic-excluded-provisioning-' + i)).join('\n') + '\n';
  await writeFile(path, contents);
  process.env.LMS_SYNTHETIC_PASSWORD_PILOT = '1';
  process.env.LMS_PASSWORD_PILOT_BLOCKLIST_FILE = path;
  process.env.LMS_PASSWORD_PILOT_BLOCKLIST_SHA256 = digest(contents);

  const submit = password => {
    requestHeaders = new Headers({ 'content-type': 'application/json', origin: 'https://staging.example.invalid',
      host: 'staging.example.invalid', cookie: 'lumina_session=' + token });
    return POST(new Request('https://staging.example.invalid/api/admin/users', { method: 'POST', headers: requestHeaders,
      body: JSON.stringify({ name: 'Synthetic Instructor', email: 'instructor@example.invalid', role: 'INSTRUCTOR', instituteCode: 'ics', password }) }));
  };
  assert.equal((await submit('synthetic-excluded-provisioning-1')).status, 400);
  const password = '合成 é phrase '.repeat(8);
  const response = await submit(password);
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const instructor = await db.user.findUniqueOrThrow({ where: { email: 'instructor@example.invalid' } });
  assert.equal(instructor.role, 'PROFESSOR');
  assert.match(instructor.password, /^\$argon2id\$/);
  const { verifyAccountPassword } = require('../../apps/web/src/lib/password-hashing.ts');
  assert.equal(await verifyAccountPassword(password, instructor.password), true);
  const events = await db.auditLog.findMany({ where: { adminId: admin.id, targetId: instructor.id } });
  assert.equal(events.length, 1);
  assert.deepEqual(JSON.parse(events[0].metadata), { instituteId: 'ics', role: 'INSTRUCTOR', outcome: 'CREATED' });

  await db.session.create({ data: { userId: instructor.id, tokenHash: digest(randomBytes(32)), expiresAt: new Date(Date.now() + 3600_000) } });
  const resetPassword = newPassword => {
    requestHeaders = new Headers({ 'content-type': 'application/json', origin: 'https://staging.example.invalid',
      host: 'staging.example.invalid', cookie: 'lumina_session=' + token });
    return reset(new Request(`https://staging.example.invalid/api/admin/users/${instructor.id}/reset-password`, {
      method: 'POST', headers: requestHeaders, body: JSON.stringify({ newPassword }),
    }), { params: Promise.resolve({ userId: instructor.id }) });
  };
  process.env.LMS_SYNTHETIC_PASSWORD_PILOT = '0';
  const disabled = await resetPassword(undefined);
  assert.equal(disabled.status, 503);
  assert.equal(await db.session.count({ where: { userId: instructor.id } }), 1);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: instructor.id } })).password, instructor.password);

  process.env.LMS_SYNTHETIC_PASSWORD_PILOT = '1';
  const resetResponse = await resetPassword(undefined);
  assert.equal(resetResponse.status, 200);
  assert.equal(resetResponse.headers.get('cache-control'), 'private, no-store');
  const { temporaryPassword } = await resetResponse.json();
  assert.match(temporaryPassword, /^[A-Za-z0-9_-]{24}$/);
  const newHash = (await db.user.findUniqueOrThrow({ where: { id: instructor.id } })).password;
  assert.match(newHash, /^\$argon2id\$/);
  assert.equal(await verifyAccountPassword(temporaryPassword, newHash), true);
  assert.equal(await verifyAccountPassword(password, newHash), false);
  assert.equal(await db.session.count({ where: { userId: instructor.id } }), 0);
  const resets = await db.auditLog.findMany({ where: { adminId: admin.id, targetId: instructor.id, action: 'PASSWORD_RESET' } });
  assert.equal(resets.length, 1);
  assert.deepEqual(JSON.parse(resets[0].metadata), { instituteId: 'ics', outcome: 'RESET', method: 'auto-generated' });
});
