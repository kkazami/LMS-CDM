// Ordinary synthetic workflows only. No original audit launcher, blocked candidates or production URL.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash, randomBytes } = require('node:crypto');
const { Client } = require('pg');

test('current-schema synthetic student/instructor course reads and MFA-admin export audit', { timeout: 60000 }, async t => {
  assert.equal(process.env.SPRINT2_DISPOSABLE, '1');
  assert.equal(process.env.DATABASE_URL, 'postgresql://sprint_app:dummy_fixture_only@127.0.0.1:5432/sprint2_staging');
  const owner = new Client({ host: '127.0.0.1', port: 5432, user: 'postgres', database: 'sprint2_staging', connectionTimeoutMillis: 5000 });
  let db;
  t.after(async () => { await db?.$disconnect(); await globalThis.pgPool?.end(); await owner.end(); });
  await owner.connect();
  assert.equal((await owner.query('SELECT current_database() AS name')).rows[0].name, 'sprint2_staging');
  assert.equal((await owner.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0);
  await owner.query(fs.readFileSync('/fixture/schema.sql', 'utf8'));
  await owner.query(fs.readFileSync('prisma/admin-mfa/revocation.sql', 'utf8'));
  await owner.query(`INSERT INTO "Institute"(id,code,name) VALUES ('ics','ics','Synthetic Institute');
    INSERT INTO "User"(id,name,email,role,"instituteId") VALUES
      ('admin','Dummy Admin','admin@example.invalid','ADMIN','ics'),
      ('teacher','Dummy Teacher','teacher@example.invalid','PROFESSOR','ics'),
      ('student','Dummy Student','student@example.invalid','STUDENT','ics');
    INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","instructorId","updatedAt")
      VALUES ('dummy-course','DUMMY','DUMMY-1','Synthetic course','ics','teacher',now());
    INSERT INTO "Enrollment"(id,"courseId","studentId",status) VALUES ('dummy-enrollment','dummy-course','student','APPROVED');`);
  const { installSuperUserBoundary } = await import('../../scripts/install-super-user-boundary.mjs');
  await installSuperUserBoundary(owner, { runtimePrincipal: 'sprint_app', operatorPrincipal: 'sprint_operator',
    runtimePassword: 'dummy_fixture_only'.padEnd(32, '_'), operatorPassword: 'dummy_operator_only'.padEnd(32, '_'),
    qualificationReference: 'synthetic-sprint2-staging-only' });
  await owner.query("ALTER ROLE sprint_app PASSWORD 'dummy_fixture_only'");
  for (const name of ['administrator-consolidation.sql', 'administrator-credentials.sql', 'student-program-assignment.sql']) {
    await owner.query(fs.readFileSync('prisma/super-user-v1/' + name, 'utf8'));
  }
  db = require('../../apps/web/src/lib/db.ts').db;
  const tokens = {};
  for (const id of ['student', 'teacher', 'admin']) {
    tokens[id] = randomBytes(32).toString('base64url');
    await db.session.create({ data: { id: 'session-' + id, userId: id, tokenHash: createHash('sha256').update(tokens[id]).digest('hex'), expiresAt: new Date(Date.now() + 3600000), lastSeenAt: new Date() } });
  }
  const admin = await db.user.findUniqueOrThrow({ where: { id: 'admin' } });
  const { adminMfaIdentityHash } = require('../../apps/web/src/lib/admin-mfa.ts');
  const { encryptTotpSecret } = require('../../apps/web/src/lib/admin-mfa-crypto.ts');
  await owner.query('INSERT INTO "AdminMfaFactor" ("userId","encryptedSecret","recoveryHashes",version) VALUES ($1,$2,$3,$4)',
    ['admin', encryptTotpSecret('admin', 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'), '[]', 'dummy-factor']);
  await owner.query('INSERT INTO "AdminMfaSession" ("sessionId","userId","factorVersion","identityHash") VALUES ($1,$2,$3,$4)',
    ['session-admin', 'admin', 'dummy-factor', adminMfaIdentityHash(admin)]);
  const request = (path, id) => new Request('https://staging.example.invalid' + path, { headers: { authorization: 'Bearer ' + tokens[id] } });
  const courses = require('../../apps/web/src/app/api/courses/route.ts');
  for (const role of ['student', 'teacher']) {
    const response = await courses.GET(request('/api/courses?institute=ics', role));
    assert.equal(response.status, 200, role + ' course list');
    assert.deepEqual((await response.json()).courses.map(row => row.id), ['dummy-course']);
  }
  const response = await require('../../apps/web/src/app/api/admin/database/export/route.ts').GET(request('/api/admin/database/export?model=User', 'admin'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).length, 3);
  const events = await db.auditLog.findMany({ where: { action: 'DATABASE_TABLE_EXPORTED' } });
  assert.equal(events.length, 1);
  assert.deepEqual(JSON.parse(events[0].metadata), { instituteId: 'ics', model: 'User', recordsExported: 3, limit: 500, format: 'json', outcome: 'PREPARED' });
  assert.ok(!events[0].metadata.includes('@example.invalid'));
});
