// Ordinary credential change using only a pre-admitted synthetic session and a disposable database.
const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
const { mkdtemp, readFile, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');
const { hash } = require('bcryptjs');
const { Client } = require('pg');

const digest = text => createHash('sha256').update(text).digest('hex');

test('ordinary password change writes Argon2id and revokes sessions atomically with the current schema', { timeout: 60_000 }, async t => {
  assert.equal(process.env.SPRINT2_DISPOSABLE, '1');
  assert.equal(process.env.DATABASE_URL, 'postgresql://sprint_app:dummy_fixture_only@127.0.0.1:5432/sprint2_staging');
  const owner = new Client({ host: '127.0.0.1', port: 5432, database: 'sprint2_staging', user: 'postgres', connectionTimeoutMillis: 5000 });
  let db;
  t.after(async () => { await db?.$disconnect(); await globalThis.pgPool?.end(); await owner.end(); });
  await owner.connect();
  assert.equal((await owner.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0);
  await owner.query(await readFile('/fixture/schema.sql', 'utf8'));
  await owner.query(await readFile('prisma/admin-mfa/revocation.sql', 'utf8'));
  await owner.query(`INSERT INTO "Institute"(id,code,name) VALUES ('ics','ics','Synthetic Institute')`);
  const oldPassword = 'LegacyFixture123';
  await owner.query(`INSERT INTO "User"(id,name,email,role,"instituteId",password)
    VALUES ('dummy-student','Synthetic Student','student@example.invalid','STUDENT','ics',$1)`, [await hash(oldPassword, 4)]);
  await owner.query(`
    INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","updatedAt")
      VALUES ('dummy-course','DUMMY','DUMMY','Synthetic course','ics',now());
    INSERT INTO "Enrollment"(id,"courseId","studentId",status)
      VALUES ('dummy-enrollment','dummy-course','dummy-student','APPROVED');
  `);
  const { installSuperUserBoundary } = await import('../../scripts/install-super-user-boundary.mjs');
  await installSuperUserBoundary(owner, { runtimePrincipal: 'sprint_app', operatorPrincipal: 'sprint_operator',
    runtimePassword: 'dummy_fixture_only'.padEnd(32, '_'), operatorPassword: 'dummy_operator_only'.padEnd(32, '_'),
    qualificationReference: 'synthetic-sprint5-password-writer' });
  await owner.query("ALTER ROLE sprint_app PASSWORD 'dummy_fixture_only'");
  db = require('../../apps/web/src/lib/db.ts').db;
  const token = randomBytes(32).toString('base64url');
  await db.session.create({ data: { userId: 'dummy-student', tokenHash: digest(token), expiresAt: new Date(Date.now() + 3600_000) } });
  const path = join(await mkdtemp(join(tmpdir(), 'writer-data-')), 'digests.txt');
  const contents = Array.from({ length: 3000 }, (_, i) => digest('synthetic-unacceptable-choice-' + i)).join('\n') + '\n';
  await writeFile(path, contents);
  process.env.LMS_SYNTHETIC_PASSWORD_PILOT = '1';
  process.env.LMS_PASSWORD_PILOT_BLOCKLIST_FILE = path;
  process.env.LMS_PASSWORD_PILOT_BLOCKLIST_SHA256 = digest(contents);
  const { POST } = require('../../apps/web/src/app/api/auth/change-password/route.ts');
  const { verifyAccountPassword } = require('../../apps/web/src/lib/password-hashing.ts');
  const submit = newPassword => POST(new Request('https://staging.example.invalid/api/auth/change-password', {
    method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ currentPassword: oldPassword, newPassword }),
  }));
  const blocked = await submit('synthetic-unacceptable-choice-1');
  assert.equal(blocked.status, 400);
  assert.equal(await db.session.count({ where: { userId: 'dummy-student' } }), 1);
  const choices = ['é ao '.repeat(15), '汉字 progredir 雨 '.repeat(5)];
  const results = await Promise.all(choices.map(submit));
  assert.equal(results.filter(result => result.status === 200).length, 1, results.map(result => result.status).join(','));
  assert.ok(results.some(result => result.status === 409 || result.status === 401));
  const winner = results.findIndex(result => result.status === 200);
  const updated = await db.user.findUniqueOrThrow({ where: { id: 'dummy-student' }, select: { password: true } });
  assert.match(updated.password, /^\$argon2id\$/);
  assert.equal(await verifyAccountPassword(choices[winner], updated.password), true);
  assert.equal(await verifyAccountPassword(oldPassword, updated.password), false);
  assert.equal(await db.session.count({ where: { userId: 'dummy-student' } }), 0);
  const events = await db.auditLog.findMany({ where: { action: 'SELF_PASSWORD_CHANGED' } });
  assert.equal(events.length, 1);
  assert.deepEqual(JSON.parse(events[0].metadata), { outcome: 'UPDATED' });
});
