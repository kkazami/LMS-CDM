// Runs only in the dedicated current-schema fixture mode with one shared, isolated loopback namespace.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { Client, Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const { test } = require('node:test');

test('Prisma interactive transactions retain and clear the admitted actor on a restricted pooled connection', { timeout: 60_000 }, async t => {
  assert.equal(process.env.SPRINT2_DISPOSABLE, '1');
  assert.equal(process.env.DATABASE_URL, 'postgresql://sprint_app:dummy_fixture_only@127.0.0.1:5432/sprint2_staging');
  const fixture = { host: '127.0.0.1', port: 5432, database: 'sprint2_staging', connectionTimeoutMillis: 5000 };
  const owner = new Client({ ...fixture, user: 'postgres' });
  const pool = new Pool({ ...fixture, max: 1, user: 'sprint5_runtime' });
  const runtime = new PrismaClient({ adapter: new PrismaPg(pool) });
  t.after(async () => { await runtime.$disconnect(); await pool.end(); await owner.end(); });
  await owner.connect();
  assert.equal((await owner.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0);
  await owner.query(readFileSync('/fixture/schema.sql', 'utf8'));
  await owner.query(`
    INSERT INTO "Institute"(id,code,name) VALUES ('one','one','Synthetic One'), ('two','two','Synthetic Two');
    INSERT INTO "User"(id,name,email,role,"instituteId") VALUES
      ('student','Dummy Student','s@example.invalid','STUDENT','one'),
      ('teacher','Dummy Instructor','t@example.invalid','PROFESSOR','one'),
      ('admin','Dummy Admin','a@example.invalid','ADMIN','one'),
      ('teacher-two','Dummy Instructor Two','t2@example.invalid','PROFESSOR','two');
    INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","instructorId","updatedAt") VALUES
      ('one-course','ONE','ONE','First course','one','teacher',now()),
      ('one-pending','PENDING','PENDING','Pending course','one',null,now()),
      ('two-course','TWO','TWO','Another institute','two','teacher-two',now());
    INSERT INTO "Enrollment"(id,"courseId","studentId",status) VALUES
      ('approved','one-course','student','APPROVED'), ('pending','one-pending','student','PENDING');
  `);
  await owner.query(readFileSync('tests/sprint-5/prisma-course-rls.sql', 'utf8'));

  const actor = { student: 'STUDENT', teacher: 'INSTRUCTOR', admin: 'ADMIN' };
  const withActor = (id, work) => runtime.$transaction(async tx => {
    await tx.$queryRaw`SELECT
      set_config('lms.actor_id', ${id}, true),
      set_config('lms.institute_id', 'one', true),
      set_config('lms.actor_role', ${actor[id]}, true)`;
    return work(tx);
  });
  const list = async client => (await client.course.findMany({ select: { id: true }, orderBy: { id: 'asc' } })).map(row => row.id);
  const edit = (client, id, title) => client.course.updateMany({ where: { id }, data: { title } });
  const pid = async client => (await client.$queryRaw`SELECT pg_backend_pid() AS pid`)[0].pid;

  const connection = await pid(runtime);
  assert.deepEqual(await list(runtime), []);
  assert.deepEqual(await withActor('student', list), ['one-course']);
  assert.deepEqual(await withActor('student', tx => edit(tx, 'one-course', 'Forbidden')), { count: 0 });
  assert.deepEqual(await withActor('teacher', list), ['one-course']);
  assert.deepEqual(await withActor('teacher', tx => edit(tx, 'one-course', 'Teacher title')), { count: 1 });
  assert.deepEqual(await withActor('admin', list), ['one-course', 'one-pending']);
  assert.deepEqual(await withActor('admin', tx => edit(tx, 'one-pending', 'Admin title')), { count: 1 });
  assert.deepEqual(await withActor('admin', tx => edit(tx, 'two-course', 'Forbidden')), { count: 0 });
  await assert.rejects(withActor('teacher', async tx => {
    await edit(tx, 'one-course', 'Rolled back');
    throw new Error('Synthetic rollback');
  }), /Synthetic rollback/);
  assert.equal(await pid(runtime), connection);
  assert.deepEqual(await list(runtime), []);
  assert.equal((await owner.query('SELECT title FROM "Course" WHERE id=$1', ['one-course'])).rows[0].title, 'Teacher title');

  const privileges = (await owner.query(`SELECT
    has_column_privilege('sprint5_runtime','public."Course"','instituteId','UPDATE') AS tenant_write,
    has_table_privilege('sprint5_runtime','public."Enrollment"','SELECT') AS roster_read,
    has_column_privilege('sprint5_job','public."Course"','title','SELECT') AS job_title,
    has_column_privilege('sprint5_job','public."Course"','id','SELECT') AS job_id`)).rows[0];
  assert.deepEqual(privileges, { tenant_write: false, roster_read: false, job_title: false, job_id: true });
  const job = new Client({ ...fixture, user: 'sprint5_job' });
  await job.connect();
  try {
    const rows = (await job.query('SELECT id, "instituteId" FROM "Course" ORDER BY id')).rows;
    assert.deepEqual(rows.map(row => row.id), ['one-course', 'one-pending', 'two-course']);
  } finally { await job.end(); }
});
