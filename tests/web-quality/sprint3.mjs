// Real roster services and real pg_dump/pg_restore, solely on a newly owned loopback cluster.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash, randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createDisposablePostgres } from '../program-head/postgres-fixture.mjs';
import { installSuperUserBoundary } from '../../scripts/install-super-user-boundary.mjs';
import { installRosterActivation } from '../../scripts/install-roster-activation.mjs';
import { sourceFingerprint, outputPath } from './evidence.mjs';
import { compareRestore } from './restore-check.mjs';

const require = createRequire(import.meta.url), webRequire = createRequire(path.resolve('apps/web/package.json'));
const { compile } = require('./compile.cjs');
const output = path.dirname(outputPath(`tmp/web-quality/sprint3-${Date.now()}/report.json`));
const safeEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(key)));
const report = { startedAt: new Date().toISOString(), productSourceSHA256: sourceFingerprint(), syntheticOnly: true, checks: [], imports: [],
  limitations: ['Local PostgreSQL, not deployed capacity.', 'Import calls use the actual service and restricted runtime; HTTP transport is covered separately.', 'Local logical recovery drill, not provider/PITR or full application disaster recovery.'] };
let cluster, db;
async function command(executable, args, env = safeEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill(); reject(Error('Owned command timeout.')); }, 120000);
    child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b);
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => { clearTimeout(timer); if (code) reject(Error('Owned command failed: ' + path.basename(executable) + ' (' + code + ')')); else resolve(stdout); });
  });
}
async function check(name, work) { await work(); report.checks.push({ name, result: 'PASS' }); console.log('PASS ' + name); }
try {
  const schema = path.join(output, 'schema.prisma'), config = path.join(output, 'prisma.config.mjs');
  fs.copyFileSync('prisma/schema.prisma', schema);
  fs.writeFileSync(config, 'export default ' + JSON.stringify({ schema, datasource: { url: 'postgresql://unused@127.0.0.1:1/offline' } }));
  const ddl = await command(process.execPath, [path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js'), 'migrate', 'diff', '--config', config, '--from-empty', '--to-schema', schema, '--script']);
  cluster = await createDisposablePostgres();
  assert.equal(new URL(cluster.url).hostname, '127.0.0.1'); assert.match(cluster.database, /^harness_/);
  await cluster.owner.query(ddl);
  await cluster.owner.query(`INSERT INTO "Institute"(id,code,name) VALUES('ics','ics','Synthetic ICS');
    INSERT INTO "User"(id,name,email,password,role,"instituteId") VALUES('admin','Synthetic Admin','admin@example.invalid','UNUSABLE','ADMIN','ics'),('teacher','Synthetic Instructor','teacher@example.invalid','UNUSABLE','PROFESSOR','ics');
    INSERT INTO "AcademicProgram"(id,code,name,"instituteId") VALUES('bsit','BSIT','Synthetic BSIT','ics');
    INSERT INTO "AcademicTerm"(id,code,name,"instituteId") VALUES('term','2026-1','Synthetic term','ics');`);
  const assignment = fs.readFileSync('prisma/program-head-chart/approved-existing-target-update.sql', 'utf8');
  await cluster.owner.query(assignment.slice(assignment.indexOf('-- Assignments are administrative input')).replace(/COMMIT;\s*$/, '').replace(/CREATE UNIQUE INDEX "ProgramMembership_one_student_home"[^;]+;/, ''));
  const bootstrap = await cluster.connect('bqual_bootstrap_admin', 'postgres'); await bootstrap.query('ALTER ROLE bqual_schema_owner CREATEROLE');
  const runtimePassword = randomBytes(32).toString('hex');
  await installSuperUserBoundary(cluster.owner, { runtimePrincipal: 'sprint3_runtime', operatorPrincipal: 'sprint3_operator', runtimePassword, operatorPassword: randomBytes(32).toString('hex'), qualificationReference: 'OWNED_SYNTHETIC_SPRINT3' });
  await cluster.owner.query(fs.readFileSync('prisma/super-user-v1/administrator-consolidation.sql', 'utf8'));
  await cluster.owner.query('CREATE UNIQUE INDEX "User_studentNumber_normalized_key" ON "User"(upper(btrim("studentNumber"))) WHERE "studentNumber" IS NOT NULL');
  await installRosterActivation(cluster.owner);
  const url = new URL(cluster.url); url.username = 'sprint3_runtime'; url.password = runtimePassword;
  const { PrismaClient } = webRequire('@prisma/client'), { PrismaPg } = webRequire('@prisma/adapter-pg'); let queries = 0;
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href, max: 2 }), log: [{ emit: 'event', level: 'query' }] }); db.$on('query', () => queries++);
  const imports = await compile(`export { previewImport, commitImport, getBatch } from './apps/web/src/lib/roster/imports';`, { db, realAuth: true });
  const tokenHash = createHash('sha256').update(randomBytes(32)).digest('hex');
  await db.session.create({ data: { id: 'session-admin', userId: 'admin', tokenHash, expiresAt: new Date(Date.now() + 3600000) } });
  const actor = { id: 'admin', sessionId: 'session-admin', tokenHash, instituteId: 'ics' };
  const size = async () => (await cluster.owner.query('SELECT pg_database_size(current_database())::float8 AS "databaseBytes",sum(pg_table_size(relid))::float8 AS "tableBytes",sum(pg_indexes_size(relid))::float8 AS "indexBytes" FROM pg_stat_user_tables')).rows[0];
  report.before = await size();
  async function importBatch(type, csv, count, resumeTest = false) {
    const start = performance.now(), before = queries, cpu = process.cpuUsage(), ram = process.memoryUsage().rss;
    let batch = await imports.previewImport(actor, { type, csv, ...(type !== 'STUDENTS' ? { termId: 'term' } : {}) });
    assert.equal(batch.rows.length, count); assert.equal(batch.rows.filter(r => r.proposedAction === 'ERROR').length, 0);
    const previewMs = performance.now() - start; let calls = 0;
    while (batch.status !== 'COMPLETED') {
      assert.ok(calls++ < Math.ceil(count / 50) + 5, 'Bounded resume calls');
      batch = await imports.commitImport(actor, batch.id, {});
      if (resumeTest && calls === 1) {
        assert.equal(batch.status, 'PROCESSING'); assert.equal(batch.rows.filter(r => r.outcome === 'CREATED').length, 50);
        batch = await imports.getBatch(actor, batch.id); // Simulate closing the page and resuming persisted state.
      }
    }
    assert.equal(batch.rows.filter(r => r.outcome === 'CREATED').length, count);
    const repeated = await imports.commitImport(actor, batch.id, {}); assert.deepEqual(repeated.rows, batch.rows);
    report.imports.push({ type, rows: count, previewMs, totalMs: performance.now() - start, commitCalls: calls, queries: queries - before, cpuMicros: process.cpuUsage(cpu), rssBefore: ram, rssAfter: process.memoryUsage().rss, repeat: 'PASS' });
  }
  await check('Actual 400-student import resumes after 50 rows and safely replays completed confirmation', async () => {
    const rows = Array.from({ length: 400 }, (_, i) => `S3-${String(i + 1).padStart(4, '0')},Student,Synthetic${i + 1},s3-${i + 1}@example.invalid,BSIT,BSIT-1A`);
    await importBatch('STUDENTS', 'student_Id,last_name,first_name,email,program,section\n' + rows.join('\n'), 400, true);
    const users = await db.user.findMany({ where: { role: 'STUDENT' }, include: { programMemberships: true }, orderBy: { studentNumber: 'asc' } });
    assert.equal(users.length, 400);
    for (let i = 0; i < 400; i++) { const u = users[i]; assert.equal(u.studentNumber, `S3-${String(i + 1).padStart(4, '0')}`); assert.equal(u.email, `s3-${i + 1}@example.invalid`); assert.equal(u.password, null); assert.equal(u.activationStatus, 'PENDING_ACTIVATION'); assert.equal(u.programMemberships.filter(m => m.isActive && m.programId === 'bsit').length, 1); }
  });
  await check('Five course imports and 2,000 enrollments in four bounded CSV batches preserve exact relationships', async () => {
    await importBatch('COURSES', 'courseCode,subject,title,section,room,description,instructorEmail,program\n' + Array.from({ length: 5 }, (_, i) => `IT${i + 1},Computing,Synthetic Course ${i + 1},BSIT-1A,,,teacher@example.invalid,BSIT`).join('\n'), 5);
    const rows = Array.from({ length: 400 }, (_, i) => Array.from({ length: 5 }, (_, c) => `S3-${String(i + 1).padStart(4, '0')},IT${c + 1},BSIT-1A`)).flat();
    for (let i = 0; i < rows.length; i += 500) await importBatch('ENROLLMENTS', 'student_Id,courseCode,section\n' + rows.slice(i, i + 500).join('\n'), 500);
    assert.equal(await db.enrollment.count({ where: { status: 'APPROVED' } }), 2000);
    const coverage = await cluster.owner.query('SELECT "studentId",count(*)::int n FROM "Enrollment" GROUP BY "studentId"'); assert.equal(coverage.rowCount, 400); assert.ok(coverage.rows.every(r => r.n === 5));
    assert.equal(await db.course.count({ where: { termId: 'term', programId: 'bsit', instructorId: 'teacher' } }), 5);
  });
  await check('500-row cap and invalid rows fail without creating student identities', async () => {
    await assert.rejects(() => imports.previewImport(actor, { type: 'STUDENTS', csv: 'student_Id,last_name,first_name,email,program,section\n' + Array.from({ length: 501 }, (_, i) => `OVER-${i},X,Y,over-${i}@example.invalid,BSIT,BSIT-1A`).join('\n') }), e => e.status === 400);
    const bad = await imports.previewImport(actor, { type: 'STUDENTS', csv: 'student_Id,last_name,first_name,email,program,section\nINVALID,X,Y,not-an-email,BSIT,BSIT-1A' });
    assert.equal(bad.rows[0].proposedAction, 'ERROR'); await imports.commitImport(actor, bad.id, {}); assert.equal(await db.user.count({ where: { role: 'STUDENT' } }), 400);
  });
  report.after = await size();
  await check('Logical backup restores to a separate empty owned database with identical application/security table hashes', async () => {
    const nonce = randomBytes(24).toString('hex');
    await cluster.owner.query('CREATE TABLE public.quality_restore_ownership ("environmentId" text NOT NULL,nonce text NOT NULL)');
    await cluster.owner.query('INSERT INTO public.quality_restore_ownership VALUES($1,$2)', ['owned-sprint3', nonce]);
    // Add representative academic state and a private file, not just a roster-only backup.
    const course = await db.course.findFirstOrThrow(), student = await db.user.findFirstOrThrow({ where: { role: 'STUDENT' } });
    await cluster.owner.query(`INSERT INTO "SyllabusItem"(id,"courseId",type,title,"maxPoints","updatedAt") VALUES('restore-item',$1,'ASSIGNMENT','Synthetic restore item',100,CURRENT_TIMESTAMP);
      `, [course.id]);
    await cluster.owner.query(`INSERT INTO "StudentSubmission"(id,"studentId","syllabusItemId",status,grade,"isReturned","updatedAt") VALUES('restore-submission',$1,'restore-item','RETURNED',87,true,CURRENT_TIMESTAMP)`, [student.id]);
    await cluster.owner.query(`INSERT INTO "SubmissionAttachment"(id,"submissionId",type,url,"fileName") VALUES('restore-attachment','restore-submission','LINK','https://example.invalid/synthetic','Synthetic reference')`);
    const content = Buffer.from('Synthetic private restore bytes');
    await cluster.owner.query('INSERT INTO "PrivateAsset"(id,"ownerId","instituteId","fileName","mimeType",size,content,"scanStatus",sha256) VALUES(\'restore-asset\',$1,\'ics\',\'synthetic.txt\',\'text/plain\',$2,$3,\'CLEAN\',$4)', [student.id, content.length, content, createHash('sha256').update(content).digest('hex')]);
    const name = 'harness_restore_' + randomBytes(8).toString('hex');
    await bootstrap.query(`CREATE DATABASE "${name}" OWNER bqual_schema_owner TEMPLATE template0`);
    const p = cluster.owner.connectionParameters, sourceUrl = new URL(cluster.url); sourceUrl.username = p.user; sourceUrl.password = p.password;
    const restoreUrl = new URL(sourceUrl); restoreUrl.pathname = '/' + name;
    const bin = path.resolve('.orchestra/local-worktrees/trusted-local-harness/.orchestra/runs/run_trusted_local_profile_20261009/checkpoint/bqual-01-phase-3/local-postgresql/distribution/pgsql/bin');
    const backup = path.join(output, 'synthetic.dump'), start = performance.now();
    const env = { ...safeEnv, PGHOST: '127.0.0.1', PGPORT: String(cluster.port), PGUSER: p.user, PGPASSWORD: p.password, PGSSLMODE: 'disable', PGOPTIONS: '-c role=bqual_schema_owner' };
    report.recovery = { backupCapturedAt: new Date().toISOString(), tools: Object.fromEntries(['pg_dump.exe', 'pg_restore.exe'].map(f => [f, createHash('sha256').update(fs.readFileSync(path.join(bin, f))).digest('hex')])) };
    await command(path.join(bin, 'pg_dump.exe'), ['--dbname', cluster.database, '--format=custom', '--no-owner', '--no-privileges', '--file', backup], env);
    report.recovery.backupMs = performance.now() - start; const restoreStart = performance.now();
    await command(path.join(bin, 'pg_restore.exe'), ['--dbname', name, '--exit-on-error', '--no-owner', '--no-privileges', backup], env);
    report.recovery.restoreMs = performance.now() - restoreStart; report.recovery.backupBytes = fs.statSync(backup).size;
    // Read as the owner through libpq startup role. These URLs stay in memory only.
    sourceUrl.searchParams.set('options', '-c role=bqual_schema_owner'); restoreUrl.searchParams.set('options', '-c role=bqual_schema_owner');
    const comparison = await compareRestore({ syntheticOnly: true, environmentKind: 'staging', environmentId: 'owned-sprint3', ownershipNonce: nonce, allowedHosts: ['127.0.0.1'], sourceUrlEnv: 'LMS_QUALITY_SOURCE', restoredUrlEnv: 'LMS_QUALITY_RESTORED', backupCapturedAt: report.recovery.backupCapturedAt, output: path.join(output, 'restore-comparison.json') }, { LMS_QUALITY_SOURCE: sourceUrl.href, LMS_QUALITY_RESTORED: restoreUrl.href });
    assert.equal(comparison.result, 'PASS'); report.recovery.tableCount = comparison.tables.length; report.recovery.observedBackupAgeSeconds = comparison.observedBackupAgeSeconds;
    report.recovery.note = 'No source writes between snapshot and comparison. Snapshot data loss observed: zero. Restore duration excludes detection/provisioning/app recovery; no adopted RTO/RPO claim.';
  });
  assert.equal(sourceFingerprint(), report.productSourceSHA256, 'Product changed during verification.'); report.result = 'PASS';
} catch (error) { report.result = 'FAIL'; report.error = error instanceof assert.AssertionError ? error.message : String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted owned connection]'); console.error('SPRINT3_FAILED', report.error); process.exitCode = 1; }
finally {
  if (db) await db.$disconnect();
  if (cluster) { await cluster.stop(); report.clusterStopped = true; }
  report.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log('Evidence: ' + path.relative(process.cwd(), path.join(output, 'report.json')));
}
