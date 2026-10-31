// Synthetic sessions with real PostgreSQL, transactions, course guards and submission handlers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { createDisposablePostgres } from '../labs/postgres-fixture.mjs';
import { inspectProgrammingCoursework, inspectPrismaColumns, upgradeProgrammingCoursework } from '../../scripts/programming-coursework-database.mjs';
const require = createRequire(import.meta.url);
const { load, as, request, webRequire } = require('../web-quality/helpers.cjs');
const output = path.resolve('tmp/programming-coursework/integration-' + Date.now());
fs.mkdirSync(output, { recursive: true });
const baseline = path.join(output, 'before.prisma');
fs.writeFileSync(baseline, fs.readFileSync('prisma/schema.prisma', 'utf8').replace(/^\s*(isProgramming|requireGithubRepo)\s+Boolean\s+@default\(false\)\r?\n/gm, ''));
const config = path.join(output, 'prisma.config.mjs');
fs.writeFileSync(config, 'export default ' + JSON.stringify({ schema: baseline, datasource: { url: 'postgresql://unused@127.0.0.1:1/harness_unused' } }));
const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');
const ddl = execFileSync(process.execPath, [cli, 'migrate', 'diff', '--config', config, '--from-empty', '--to-schema', baseline, '--script'], { encoding: 'utf8', windowsHide: true });
const teacher = { id: 'teacher', role: 'PROFESSOR', instituteId: 'ics' };
const student = { id: 'student', role: 'STUDENT', instituteId: 'ics' };
const checks = [];
async function check(name, work) { await work(); checks.push(name); console.log('PASS ' + name); }
const form = (values = {}) => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ courseId: 'course', instituteCode: 'ics', type: 'MIDTERM_EXAM', title: 'Programming exam', maxPoints: '100', isProgramming: 'true', requireGithubRepo: 'true', ...values })) data.set(key, value);
  return data;
};
let cluster, db;
try {
  cluster = await createDisposablePostgres();
  assert.equal(new URL(cluster.url).hostname, '127.0.0.1');
  await cluster.owner.query(ddl);
  await cluster.owner.query(`CREATE TABLE "_prisma_migrations"(id varchar(36) PRIMARY KEY,checksum varchar(64) NOT NULL,finished_at timestamptz,migration_name varchar(255) NOT NULL,logs text,rolled_back_at timestamptz,started_at timestamptz NOT NULL DEFAULT now(),applied_steps_count integer NOT NULL DEFAULT 0);
    INSERT INTO "Institute"(id,code,name) VALUES('ics','ics','Synthetic ICS'),('ibe','ibe','Synthetic IBE');
    INSERT INTO "User"(id,name,email,password,role,"instituteId") VALUES
      ('teacher','Teacher','teacher@example.invalid','disabled','PROFESSOR','ics'),('other','Other','other@example.invalid','disabled','PROFESSOR','ics'),
      ('student','Student','student@example.invalid','disabled','STUDENT','ics'),('foreign','Foreign','foreign@example.invalid','disabled','STUDENT','ibe');
    INSERT INTO "Course"(id,code,title,"courseCode","instituteId","instructorId","updatedAt") VALUES
      ('course','CODE101','Programming','CODEJOIN','ics','teacher',now()),('other-course','OTHER','Other','OTHERJOIN','ics','other',now());
    INSERT INTO "Enrollment"(id,"courseId","studentId",status) VALUES('enrollment','course','student','APPROVED');
    INSERT INTO "SyllabusItem"(id,"courseId",type,title,"maxPoints","updatedAt") VALUES('legacy','course','ASSIGNMENT','Historical work',100,now());
    INSERT INTO "StudentSubmission"(id,"studentId","syllabusItemId",status,"updatedAt") VALUES('historical','student','legacy','DRAFT',now());
    INSERT INTO "SubmissionAttachment"(id,"submissionId",type,url,"fileName") VALUES('historical-file','historical','LINK','https://example.com/historical','Historical link');
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO bqual_test_app;`);
  const before = (await cluster.owner.query('SELECT row_to_json(s) AS data FROM "StudentSubmission" s')).rows;
  const deploymentCheck = () => spawnSync(process.execPath, ['scripts/programming-coursework-database.mjs', '--vercel-build'], {
    encoding: 'utf8', windowsHide: true,
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(key))), DATABASE_URL: cluster.url, VERCEL: '1' },
  });
  await check('Vercel deployment check rejects missing columns before code is deployed', async () => {
    const result = deploymentCheck();
    assert.equal(result.status, 1); assert.match(result.stdout, /"ready":false/);
  });
  await check('additive migration preserves historical work, defaults off, and runs once', async () => {
    assert.equal((await upgradeProgrammingCoursework(cluster.owner)).status, 'APPLIED');
    assert.equal((await upgradeProgrammingCoursework(cluster.owner)).status, 'ALREADY_APPLIED');
    assert.deepEqual(await inspectPrismaColumns(cluster.owner), []);
    assert.deepEqual((await cluster.owner.query('SELECT row_to_json(s) AS data FROM "StudentSubmission" s')).rows, before);
    assert.deepEqual((await cluster.owner.query('SELECT "isProgramming","requireGithubRepo" FROM "SyllabusItem" WHERE id=\'legacy\'')).rows[0], { isProgramming: false, requireGithubRepo: false });
    const runtime = await cluster.connect();
    assert.deepEqual({ ...(await inspectProgrammingCoursework(runtime)), canMigrate: false }, { ready: true, columns: ['isProgramming', 'requireGithubRepo'], constraint: true, canMigrate: false, runtimeAccess: true });
  });
  await check('Vercel deployment check accepts migrated schema with restricted runtime permissions', async () => {
    const result = deploymentCheck();
    assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /"missingPrismaColumns":\[\]/);
  });
  await check('database constraints reject invalid coursework settings', async () => {
    await assert.rejects(cluster.owner.query('UPDATE "SyllabusItem" SET "requireGithubRepo"=true WHERE id=\'legacy\''), error => error.code === '23514');
    await assert.rejects(cluster.owner.query('UPDATE "SyllabusItem" SET type=\'MATERIAL\',"isProgramming"=true WHERE id=\'legacy\''), error => error.code === '23514');
  });
  const { PrismaClient } = webRequire('@prisma/client'), { PrismaPg } = webRequire('@prisma/adapter-pg');
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: cluster.url, max: 4 }), log: [] });
  const api = await load(db);
  let item, submission;
  await check('instructor creation, editing, and mobile API persist programming settings', async () => {
    as(teacher);
    assert.equal((await api.instructorClasswork.createSyllabusItem({ message: '' }, form())).message, 'success');
    item = await db.syllabusItem.findFirstOrThrow({ where: { title: 'Programming exam' } });
    assert.equal(item.isProgramming, true); assert.equal(item.requireGithubRepo, true);
    assert.equal((await api.instructorClasswork.updateSyllabusItem({ message: '' }, form({ id: item.id, title: 'Updated programming exam' }))).message, 'success');
    const created = await api.createClasswork(request('/api/courses/course/classwork', { title: 'Programming activity', type: 'ACTIVITY', isProgramming: true, requireGithubRepo: true }), { params: Promise.resolve({ courseId: 'course' }) });
    assert.equal(created.status, 200); assert.equal((await created.json()).item.requireGithubRepo, true);
    const invalid = await api.createClasswork(request('/api/courses/course/classwork', { title: 'Invalid', requireGithubRepo: true }), { params: Promise.resolve({ courseId: 'course' }) });
    assert.equal(invalid.status, 400);
    await db.syllabusItem.create({ data: { id: 'interactive', courseId: 'course', type: 'QUIZ', title: 'Interactive quiz' } });
    await db.activityTemplate.create({ data: { id: 'interactive-template', courseId: 'course', syllabusItemId: 'interactive', activityType: 'codelab', createdBy: teacher.id } });
    assert.match((await api.instructorClasswork.updateSyllabusItem({ message: '' }, form({ id: 'interactive' }))).message, /own submission flow/);
    await db.syllabusItem.create({ data: { id: 'other-item', courseId: 'other-course', type: 'QUIZ', title: 'Other instructor quiz' } });
    assert.equal((await api.instructorClasswork.updateSyllabusItem({ message: '' }, form({ id: 'other-item' }))).message, 'Classwork not found.');
    assert.equal((await db.syllabusItem.findUniqueOrThrow({ where: { id: 'other-item' } })).requireGithubRepo, false);
    as({ ...teacher, id: 'other' });
    assert.notEqual((await api.instructorClasswork.createSyllabusItem({ message: '' }, form())).message, 'success');
    as(student);
    const list = await api.classworkList(request('/api/courses/course/classwork'), { params: Promise.resolve({ courseId: 'course' }) });
    assert.equal(list.status, 200);
    assert.equal((await list.json()).items.find(row => row.id === item.id).requireGithubRepo, true);
    submission = await api.classwork.getOrCreateSubmission(item.id);
  });
  await check('empty, unrelated, multi-link and disguised file submissions fail on the server', async () => {
    as(student);
    assert.equal((await api.classwork.submitWork(submission.id, 'ics', 'course', item.id)).success, false);
    for (const attachments of [
      [{ type: 'LINK', url: 'https://example.com/student/project' }],
      [{ type: 'LINK', url: 'https://github.com/student' }],
      [{ type: 'LINK', url: 'https://github.com/student/project/issues' }],
      [{ type: 'FILE', url: 'https://github.com/student/project' }],
      [{ type: 'LINK', url: 'https://github.com/student/a' }, { type: 'LINK', url: 'https://github.com/student/b' }],
    ]) {
      const response = await api.submit(request('/api/courses/course/submissions', { syllabusItemId: item.id, attachments }), { params: Promise.resolve({ courseId: 'course' }) });
      assert.equal(response.status, 400);
    }
    await assert.rejects(api.classwork.addSubmissionFile(submission.id, 'https://github.com/student/project', 'fake-file', 'ics', 'course', item.id));
    await assert.rejects(api.classwork.addSubmissionLink(submission.id, 'https://example.com', 'bad', 'ics', 'course', item.id));
    assert.equal((await db.studentSubmission.findUniqueOrThrow({ where: { id: submission.id } })).status, 'DRAFT');
    assert.equal(await db.submissionAttachment.count({ where: { submissionId: submission.id } }), 0);
  });
  await check('repository save replaces atomically, normalizes, and permits the normal turn-in and grading flow', async () => {
    assert.equal((await api.classwork.saveGithubRepository(submission.id, 'https://www.github.com/student/project.git/', 'ics', 'course', item.id)).success, true);
    assert.equal((await api.classwork.saveGithubRepository(submission.id, 'https://github.com/student/final', 'ics', 'course', item.id)).success, true);
    await api.classwork.addSubmissionLink(submission.id, 'https://github.com/student/final', 'Changed label', 'ics', 'course', item.id);
    await api.saveSubmission(student, 'course', { syllabusItemId: item.id, status: 'DRAFT', attachments: [{ type: 'LINK', url: 'https://github.com/student/final', fileName: 'Another label' }] });
    const attachments = await db.submissionAttachment.findMany({ where: { submissionId: submission.id } });
    assert.equal(attachments.length, 1); assert.equal(attachments[0].url, 'https://github.com/student/final');
    assert.equal((await api.classwork.submitWork(submission.id, 'ics', 'course', item.id)).success, true);
    assert.equal((await db.studentSubmission.findUniqueOrThrow({ where: { id: submission.id } })).status, 'SUBMITTED');
    as(teacher);
    const change = await api.instructorClasswork.updateSyllabusItem({ message: '' }, form({ id: item.id, requireGithubRepo: 'false' }));
    assert.match(change.message, /requirement cannot change/);
    await api.gradeSubmission(teacher, submission.id, 85, 'Reviewed repository', 'course');
    assert.equal((await db.studentSubmission.findUniqueOrThrow({ where: { id: submission.id } })).grade, 85);
    as(student);
    assert.equal((await api.classwork.saveGithubRepository(submission.id, 'https://github.com/student/changed', 'ics', 'course', item.id)).success, false);
  });
  await check('ownership, enrollment, deadlines and legacy submissions retain their protections and behavior', async () => {
    as({ ...student, id: 'foreign', instituteId: 'ibe' });
    assert.equal((await api.classwork.saveGithubRepository(submission.id, 'https://github.com/foreign/project', 'ics', 'course', item.id)).success, false);
    await assert.rejects(api.saveSubmission({ ...student, id: 'foreign', instituteId: 'ibe' }, 'course', { syllabusItemId: item.id }));
    await db.syllabusItem.create({ data: { id: 'expired', courseId: 'course', type: 'QUIZ', title: 'Expired', isProgramming: true, requireGithubRepo: true, dueDate: new Date(0) } });
    await assert.rejects(api.saveSubmission(student, 'course', { syllabusItemId: 'expired', attachments: [{ type: 'LINK', url: 'https://github.com/student/project' }] }), error => error.status === 409);
    assert.equal((await api.saveSubmission(student, 'course', { syllabusItemId: 'legacy' })).success, true);
    assert.equal(await db.submissionAttachment.count({ where: { submissionId: 'historical' } }), 1);
  });
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ production: false, checks }, null, 2));
  console.log(`PASS ${checks.length} PostgreSQL integration scenarios`);
} finally {
  await db?.$disconnect();
  await cluster?.stop();
}
