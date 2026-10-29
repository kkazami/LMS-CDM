import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createDisposablePostgres } from '../labs/postgres-fixture.mjs';
import { upgradeGradebookPeriods } from '../../scripts/upgrade-gradebook-periods.mjs';
const require = createRequire(import.meta.url);
const { compile } = require('../web-quality/compile.cjs');
const output = path.resolve('tmp/gradebook/integration-' + Date.now()); fs.mkdirSync(output, { recursive: true });
const report = { checks: [], target: 'Owned disposable loopback PostgreSQL only.' };
let cluster, db, pool;
const teacher = { id: 'teacher', role: 'PROFESSOR', instituteId: 'ics' };
async function check(name, work) { await work(); report.checks.push({ name, result: 'PASS' }); console.log('PASS ' + name); }
try {
  cluster = await createDisposablePostgres();
  const baseline = path.join(output, 'before.prisma');
  fs.writeFileSync(baseline, execFileSync('git', ['show', 'HEAD:prisma/schema.prisma'], { encoding: 'utf8', windowsHide: true }));
  const config = path.join(output, 'prisma.config.mjs'); fs.writeFileSync(config, 'export default ' + JSON.stringify({ schema: baseline, datasource: { url: 'postgresql://unused@127.0.0.1:1/harness_unused' } }));
  const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');
  const ddl = execFileSync(process.execPath, [cli, 'migrate', 'diff', '--config', config, '--from-empty', '--to-schema', baseline, '--script'], { encoding: 'utf8', windowsHide: true });
  await cluster.owner.query(ddl);
  await cluster.owner.query(`CREATE TABLE "_prisma_migrations"(id varchar(36) PRIMARY KEY,checksum varchar(64) NOT NULL,finished_at timestamptz,migration_name varchar(255) NOT NULL,logs text,rolled_back_at timestamptz,started_at timestamptz NOT NULL DEFAULT now(),applied_steps_count integer NOT NULL DEFAULT 0);
    INSERT INTO "Institute"(id,code,name) VALUES('ics','ics','Synthetic ICS'),('ibe','ibe','Synthetic IBE');
    INSERT INTO "User"(id,name,email,password,role,"instituteId") VALUES('teacher','Teacher','teacher@example.invalid','disabled','PROFESSOR','ics'),('other','Other Teacher','other@example.invalid','disabled','PROFESSOR','ics'),('student','Student','student@example.invalid','disabled','STUDENT','ics');
    INSERT INTO "Course"(id,code,title,"courseCode","instituteId","instructorId","updatedAt") VALUES('course','GRADE101','Synthetic gradebook','GRADEJOIN','ics','teacher',now()),('other-course','OTHER','Other class','OTHERJOIN','ics','other',now());
    INSERT INTO "Enrollment"(id,"courseId","studentId",status) VALUES('enrollment','course','student','APPROVED');
    INSERT INTO "SyllabusItem"(id,"courseId",type,title,"maxPoints","updatedAt") VALUES('m','course','MIDTERM_EXAM','Midterm exam',100,now()),('f','course','FINAL_EXAM','Final exam',100,now()),('q','course','QUIZ','Quiz',50,now()),('foreign','other-course','QUIZ','Other quiz',50,now());
    INSERT INTO "StudentSubmission"(id,"studentId","syllabusItemId",grade,status,"isReturned","updatedAt") VALUES('sm','student','m',80,'RETURNED',true,now()),('sf','student','f',90,'RETURNED',true,now()),('sq','student','q',40,'RETURNED',true,now());`);
  const before = (await cluster.owner.query('SELECT jsonb_agg(s ORDER BY id) AS rows FROM "StudentSubmission" s')).rows[0].rows;
  await check('additive migration preserves existing scores and supports replay', async () => {
    assert.equal((await upgradeGradebookPeriods(cluster.owner, 'bqual_test_app')).status, 'APPLIED');
    assert.equal((await upgradeGradebookPeriods(cluster.owner, 'bqual_test_app')).status, 'ALREADY_APPLIED');
    assert.deepEqual((await cluster.owner.query('SELECT jsonb_agg(s ORDER BY id) AS rows FROM "StudentSubmission" s')).rows[0].rows, before);
  });
  await cluster.owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO bqual_test_app');
  pool = new Pool({ connectionString: cluster.url, max: 4 }); db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const api = await compile(`export * from './apps/web/src/lib/grading/period-service'; export {readGradebook} from './apps/web/src/lib/gradebook-data';`, { db });
  const policy = { midtermWeightPercentage: 40, finalsWeightPercentage: 60, categoryWeights: { MIDTERM: [], FINALS: [] } };
  await check('ownership, institute and role gates protect policies and period assignments', async () => {
    for (const actor of [{ ...teacher, id: 'student', role: 'STUDENT' }, { ...teacher, id: 'other' }, { ...teacher, role: 'ADMIN', instituteId: 'ibe' }, { ...teacher, role: 'SUPER_USER' }]) {
      await assert.rejects(api.savePeriodPolicy(actor, 'course', policy), error => [403, 404].includes(error.status));
      await assert.rejects(api.savePeriodAssignments(actor, 'course', [{ syllabusItemId: 'q', period: 'MIDTERM' }]), error => [403, 404].includes(error.status));
    }
  });
  await check('period assignment is atomic and rejects cross-course items and duplicates', async () => {
    await assert.rejects(api.savePeriodAssignments(teacher, 'course', [{ syllabusItemId: 'q', period: 'MIDTERM' }, { syllabusItemId: 'foreign', period: 'FINALS' }]), error => error.status === 404);
    assert.equal(await db.classworkGradingPeriod.count(), 0);
    await assert.rejects(api.savePeriodAssignments(teacher, 'course', [{ syllabusItemId: 'q', period: 'MIDTERM' }, { syllabusItemId: 'q', period: 'FINALS' }]), error => error.status === 400);
    await api.savePeriodAssignments(teacher, 'course', [{ syllabusItemId: 'q', period: 'MIDTERM' }]);
  });
  await check('policy and period metadata persist without changing academic work or provenance', async () => {
    await api.savePeriodPolicy(teacher, 'course', policy);
    const data = await api.readGradebook(teacher, 'course');
    assert.equal(data.periodsAvailable, true); assert.equal(data.assignments.find(row => row.id === 'q').gradingPeriod, 'MIDTERM');
    assert.equal(data.assignments.find(row => row.id === 'f').gradingPeriod, 'FINALS');
    assert.deepEqual(data.periodPolicy, policy);
    assert.deepEqual((await cluster.owner.query('SELECT jsonb_agg(s ORDER BY id) AS rows FROM "StudentSubmission" s')).rows[0].rows, before);
    assert.equal(await db.syllabusItem.count({ where: { workHistoryState: { not: 'UNKNOWN' } } }), 0);
  });
  await check('concurrent reversed item batches follow sorted locks and database constraints reject invalid policies', async () => {
    await Promise.all([api.savePeriodAssignments(teacher, 'course', [{ syllabusItemId: 'm', period: 'MIDTERM' }, { syllabusItemId: 'q', period: 'MIDTERM' }]), api.savePeriodAssignments(teacher, 'course', [{ syllabusItemId: 'q', period: 'MIDTERM' }, { syllabusItemId: 'm', period: 'MIDTERM' }])]);
    await assert.rejects(api.savePeriodPolicy(teacher, 'course', { ...policy, finalsWeightPercentage: 90 }), error => error.status === 400);
    await assert.rejects(cluster.owner.query('UPDATE "CourseGradebookPolicy" SET "finalsWeightPercentage"=90 WHERE "courseId"=$1', ['course']));
    assert.equal((await db.courseGradebookPolicy.findUniqueOrThrow({ where: { courseId: 'course' } })).finalsWeightPercentage, 60);
  });
  report.result = 'PASS';
} catch (error) { report.result = 'FAIL'; report.error = error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted]'); console.error('GRADEBOOK_INTEGRATION_FAILED', report.error); process.exitCode = 1; }
finally { await db?.$disconnect(); await pool?.end(); await cluster?.stop(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log('Gradebook integration report: ' + path.relative(process.cwd(), path.join(output, 'report.json'))); }
