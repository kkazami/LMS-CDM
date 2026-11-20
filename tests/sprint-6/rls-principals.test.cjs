// Reuse the prior fixture, then qualify reduced definer and backup privileges in the same disposable database.
require('../sprint-5/prisma-rls.test.cjs');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { Client, Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { test } = require('node:test');

test('course policy definer and backup principals have separate narrow grants', async t => {
  assert.equal(process.env.SPRINT2_DISPOSABLE, '1');
  assert.equal(process.env.DATABASE_URL, 'postgresql://sprint_app:dummy_fixture_only@127.0.0.1:5432/sprint2_staging');
  const fixture = { host: '127.0.0.1', port: 5432, database: 'sprint2_staging', connectionTimeoutMillis: 5000 };
  const owner = new Client({ ...fixture, user: 'postgres' });
  const backup = new Client({ ...fixture, user: 'sprint6_backup' });
  const pool = new Pool({ ...fixture, max: 2, user: 'sprint5_runtime' });
  const runtime = new PrismaClient({ adapter: new PrismaPg(pool) });
  t.after(async () => { await runtime.$disconnect(); await pool.end(); await owner.end(); await backup.end(); });
  await owner.connect();
  await owner.query(readFileSync('tests/sprint-6/rls-principals.sql', 'utf8'));
  const grant = (await owner.query(`SELECT
    has_column_privilege('sprint6_policy','public."Enrollment"','status','SELECT') AS status,
    has_column_privilege('sprint6_policy','public."Enrollment"','id','SELECT') AS enrollment_id,
    has_table_privilege('sprint6_backup','public."Course"','UPDATE') AS backup_write,
    has_table_privilege('sprint6_backup','public."Enrollment"','SELECT') AS backup_roster,
    (SELECT rolsuper OR rolbypassrls OR rolcanlogin FROM pg_roles WHERE rolname='sprint6_policy') AS definer_elevated`)).rows[0];
  assert.deepEqual(grant, { status: true, enrollment_id: false, backup_write: false, backup_roster: false, definer_elevated: false });
  const courses = async db => (await db.course.findMany({ select: { id: true }, orderBy: { id: 'asc' } })).map(row => row.id);
  const see = (id, role) => runtime.$transaction(async tx => {
    await tx.$queryRaw`SELECT set_config('lms.actor_id', ${id}, true),
      set_config('lms.institute_id', 'one', true), set_config('lms.actor_role', ${role}, true)`;
    return courses(tx);
  });
  assert.deepEqual(await Promise.all([see('student', 'STUDENT'), see('admin', 'ADMIN')]), [
    ['one-course'], ['one-course', 'one-pending'],
  ]);
  assert.deepEqual(await courses(runtime), []);
  await backup.connect();
  assert.equal((await backup.query('SELECT count(*)::int AS count FROM public."Course"')).rows[0].count, 3);
});
