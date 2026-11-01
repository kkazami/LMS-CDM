import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { upgradeQrGrace, inspectQrGrace } from '../../scripts/attendance-qr-grace.mjs';
import { upgradeAttendance, migrationName as attendanceMigrationName, checksum as attendanceChecksum } from '../../scripts/attendance-database.mjs';
const require = createRequire(import.meta.url); const { compile } = require('../web-quality/compile.cjs');
const output = path.resolve('tmp/attendance/integration-' + Date.now()); fs.mkdirSync(output, { recursive: true });
const bin = process.env.ATTENDANCE_TEST_PG_BIN || 'C:/Program Files/PostgreSQL/17/bin';
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(PG|DATABASE_URL|POSTGRES|SUPER_USER|HARNESS)/i.test(key)));
const command = (name, args) => {
  // pg_ctl's server child inherits pipes on Windows; use files so controller exit is observable.
  if (name !== 'pg_ctl') return execFileSync(path.join(bin, name + '.exe'), args, { env, encoding: 'utf8', windowsHide: true, timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = fs.openSync(path.join(output, 'controller.stdout.log'), 'a'); const err = fs.openSync(path.join(output, 'controller.stderr.log'), 'a');
  try { return execFileSync(path.join(bin, name + '.exe'), args, { env, windowsHide: true, timeout: 45000, stdio: ['ignore', out, err] }); }
  finally { fs.closeSync(out); fs.closeSync(err); }
};
const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const chosen = server.address().port; server.close(() => resolve(chosen)); }); });
const data = path.join(output, 'postgres'); let started = false; let pool, db;
const report = { checks: [], load: [], target: 'Owned disposable loopback PostgreSQL; synthetic identities only.' };
async function check(name, work) { await work(); report.checks.push({ name, result: 'PASS' }); console.log('PASS ' + name); }
try {
  command('initdb', ['-D', data, '-U', 'postgres', '-A', 'trust', '--encoding=UTF8', '--no-locale']);
  command('pg_ctl', ['start', '-D', data, '-l', path.join(output, 'postgres.log'), '-o', `-p ${port} -h 127.0.0.1`, '-w', '-t', '30']); started = true;
  const control = new Pool({ host: '127.0.0.1', port, user: 'postgres', database: 'postgres' });
  await control.query('CREATE DATABASE harness_attendance'); await control.end();
  pool = new Pool({ host: '127.0.0.1', port, user: 'postgres', database: 'harness_attendance', max: 2 });
  db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const baseline = path.join(output, 'baseline.prisma'); fs.writeFileSync(baseline, execFileSync('git', ['show', 'HEAD:prisma/schema.prisma'], { encoding: 'utf8', windowsHide: true }));
  const config = path.join(output, 'prisma.config.mjs'); fs.writeFileSync(config, 'export default ' + JSON.stringify({ schema: baseline, datasource: { url: 'postgresql://unused@127.0.0.1:1/harness_unused' } }));
  const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');
  const ddl = schema => execFileSync(process.execPath, [cli, 'migrate', 'diff', '--config', config, '--from-empty', '--to-schema', schema, '--script'], { env, encoding: 'utf8', windowsHide: true });
  await pool.query(ddl(baseline));
  await pool.query('CREATE ROLE lms_web_runtime_v1 NOLOGIN');
  await pool.query(`INSERT INTO "Institute"(id,code,name) VALUES('ics','ics','Synthetic ICS'),('ibe','ibe','Synthetic IBE'); INSERT INTO "User"(id,name,email,role,"instituteId") VALUES('teacher','Teacher','teacher@example.invalid','PROFESSOR','ics'),('helper','Helper','helper@example.invalid','PROFESSOR','ics'),('admin','Admin','admin@example.invalid','ADMIN','ics'),('foreign','Foreign','foreign@example.invalid','STUDENT','ibe'); INSERT INTO "Course"(id,code,title,"courseCode","instituteId","instructorId","updatedAt") VALUES('class','ATT101','Synthetic attendance','ATTJOIN','ics','teacher',now());`);
  await pool.query(`CREATE TABLE "_prisma_migrations"(id varchar(36) PRIMARY KEY,checksum varchar(64) NOT NULL,finished_at timestamptz,migration_name varchar(255) NOT NULL,logs text,rolled_back_at timestamptz,started_at timestamptz NOT NULL DEFAULT now(),applied_steps_count integer NOT NULL DEFAULT 0)`);
  await check('targeted operator rolls back schema when migration receipt cannot be written', async () => {
    await pool.query(`CREATE FUNCTION reject_attendance_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic receipt failure'; END $$;
      CREATE TRIGGER reject_attendance_receipt BEFORE INSERT ON "_prisma_migrations" FOR EACH ROW EXECUTE FUNCTION reject_attendance_receipt()`);
    const client = await pool.connect();
    try { await assert.rejects(upgradeAttendance(client, 'lms_web_runtime_v1'), /Synthetic receipt failure/); }
    finally { client.release(); }
    assert.equal((await pool.query(`SELECT to_regclass('public."AttendanceSession"') IS NULL AS absent`)).rows[0].absent, true);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='public' AND table_name='Institute' AND column_name='timezone'`)).rows[0].n, 0);
    assert.equal(await db.user.count(), 4);
    await pool.query('DROP TRIGGER reject_attendance_receipt ON "_prisma_migrations"; DROP FUNCTION reject_attendance_receipt()');
  });
  await check('existing upgrade applies attendance migration without changing existing users/classes', async () => {
    const client = await pool.connect();
    try { assert.equal((await upgradeAttendance(client, 'lms_web_runtime_v1')).status, 'APPLIED'); }
    finally { client.release(); }
    assert.equal(await db.course.count(), 1); assert.equal(await db.user.count(), 4); assert.equal((await db.institute.findUniqueOrThrow({ where: { id: 'ics' } })).timezone, 'Asia/Manila');
  });
  await check('targeted operator is idempotent and refuses mismatched migration receipts', async () => {
    const client = await pool.connect();
    try {
      assert.equal((await upgradeAttendance(client, 'lms_web_runtime_v1')).status, 'ALREADY_APPLIED');
      assert.equal((await client.query('SELECT count(*)::int n FROM "_prisma_migrations" WHERE migration_name=$1', [attendanceMigrationName])).rows[0].n, 1);
      await client.query('UPDATE "_prisma_migrations" SET checksum=$1 WHERE migration_name=$2', ['0'.repeat(64), attendanceMigrationName]);
      await assert.rejects(upgradeAttendance(client, 'lms_web_runtime_v1'), /needs reconciliation/);
    } finally {
      await client.query('UPDATE "_prisma_migrations" SET checksum=$1 WHERE migration_name=$2', [attendanceChecksum, attendanceMigrationName]);
      client.release();
    }
  });
  await check('QR grace migration permits 60 seconds, defaults to 30, and is repeatable', async () => {
    const client = await pool.connect();
    try {
      assert.equal(await inspectQrGrace(client), false);
      assert.equal((await upgradeQrGrace(client)).status, 'APPLIED');
      assert.equal(await inspectQrGrace(client), true);
      assert.equal((await upgradeQrGrace(client)).status, 'ALREADY_APPLIED');
    } finally { client.release(); }
  });
  await check('runtime grants allow attendance writes but forbid updating audit events', async () => {
    const { rows } = await pool.query(`SELECT has_table_privilege('lms_web_runtime_v1','public."AttendanceRecord"','INSERT, UPDATE') AS records, has_table_privilege('lms_web_runtime_v1','public."AttendanceEvent"','INSERT') AS events, has_table_privilege('lms_web_runtime_v1','public."AttendanceEvent"','UPDATE') AS edits`);
    assert.equal(rows[0].records, true); assert.equal(rows[0].events, true); assert.equal(rows[0].edits, false);
  });
  await check('fresh schema plus migration replays in an empty owned schema', async () => { const client = await pool.connect(); try { await client.query('CREATE SCHEMA attendance_replay; SET search_path TO attendance_replay'); await client.query(ddl(baseline)); await client.query(fs.readFileSync('prisma/migrations/20261101000100_attendance/migration.sql', 'utf8')); } finally { await client.query('SET search_path TO public'); client.release(); } });
  await check('failed migration rolls back atomically and can be reapplied without losing baseline data', async () => {
    const client = await pool.connect();
    try {
      await client.query('CREATE SCHEMA attendance_recovery; SET search_path TO attendance_recovery'); await client.query(ddl(baseline));
      await client.query(`INSERT INTO "Institute"(id,code,name) VALUES('preserved','ics','Synthetic preserved institute')`);
      const migration = fs.readFileSync('prisma/migrations/20261101000100_attendance/migration.sql', 'utf8');
      await assert.rejects(client.query(migration.replace('COMMIT;', 'SELECT nonexistent_attendance_recovery_column; COMMIT;')));
      await client.query('ROLLBACK');
      assert.equal((await client.query(`SELECT to_regclass('attendance_recovery."AttendanceSession"') AS relation`)).rows[0].relation, null);
      assert.equal((await client.query(`SELECT count(*)::int AS n FROM "Institute" WHERE id='preserved'`)).rows[0].n, 1);
      await client.query(migration); assert.equal((await client.query(`SELECT timezone FROM "Institute" WHERE id='preserved'`)).rows[0].timezone, 'Asia/Manila');
    } finally { await client.query('SET search_path TO public'); client.release(); }
  });
  for (const id of ['teacher', 'helper', 'admin', 'foreign']) await db.session.create({ data: { id: id + '-session', userId: id, expiresAt: new Date(Date.now() + 86400000) } });
  await db.user.createMany({ data: Array.from({ length: 200 }, (_, i) => ({ id: 'student-' + i, name: 'Student ' + i, email: `student-${i}@example.invalid`, role: 'STUDENT', instituteId: 'ics' })) });
  await db.session.createMany({ data: Array.from({ length: 200 }, (_, i) => ({ id: `student-${i}-session`, userId: 'student-' + i, expiresAt: new Date(Date.now() + 86400000) })) });
  await db.enrollment.createMany({ data: Array.from({ length: 100 }, (_, i) => ({ courseId: 'class', studentId: 'student-' + i, status: 'APPROVED' })) });
  process.env.ATTENDANCE_QR_SECRET = 'synthetic-attendance-test-secret-32-characters';
  const state = { db };
  const service = await compile("export * from './apps/web/src/lib/attendance/mutate.ts'; export * from './apps/web/src/lib/attendance/read.ts'; export * from './apps/web/src/lib/attendance/lifecycle.ts'; export * from './apps/web/src/lib/attendance/retention.ts';", state);
  const actor = id => ({ id, sessionId: id + '-session' }); const manager = actor('teacher');
  const mutate = (input, user = manager) => service.mutateAttendance(user, 'class', input);
  await check('production attendance works by default without institute setup or administrator action', async () => {
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      assert.equal(await db.attendancePolicy.count(), 0);
      const snapshot = await service.getAttendance(manager, 'class');
      assert.equal(snapshot.enabled, true); assert.equal(snapshot.phase, 3); assert.equal(snapshot.policy.locationEnabled, false);
      await mutate({ action: 'SETTINGS', settings: snapshot.settings });
      await mutate({ action: 'CREATE_SESSION', input: { title: 'Available without activation', mode: 'IN_PERSON', durationMinutes: 30, qrGraceSeconds: 60 } });
      const session = await db.attendanceSession.findFirstOrThrow({ where: { state: 'OPEN' } });
      assert.equal(session.qrGraceSeconds, 60);
      const code = await service.attendanceCodes(manager, 'class', session.id);
      await mutate({ action: 'CHECK_IN', sessionId: session.id, token: code.token }, actor('student-98'));
      await mutate({ action: 'REQUEST', sessionId: session.id, reason: 'Camera unavailable' }, actor('student-99'));
      const request = await db.attendanceRequest.findFirstOrThrow({ where: { record: { sessionId: session.id, studentId: 'student-99' } } });
      assert(request.textExpiresAt);
      await mutate({ action: 'ACCEPT_ALL', sessionId: session.id, requests: [{ id: request.id, revision: request.revision }], acknowledgeUnverified: true });
      await mutate({ action: 'ARRANGEMENT', studentId: 'student-98', enabled: true });
      await mutate({ action: 'CANCEL', sessionId: session.id });
      assert.equal(await db.attendancePolicy.count(), 0);
    } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
  });
  await mutate({ action: 'POLICY', policy: { rollout: 'ENABLED', phase: 3, pilotCourseIds: [], locationEnabled: true, timezone: 'Asia/Manila', privacyReview: 'Synthetic test approval only', recordDays: 365, eventDays: 365, requestDays: 30, verificationDays: 30, arrangementDays: 90 } }, actor('admin'));
  await check('settings and policy DTOs round-trip through strict mutation validation', async () => {
    const snapshot = await service.getAttendance(actor('admin'), 'class');
    await mutate({ action: 'SETTINGS', settings: snapshot.settings });
    await mutate({ action: 'POLICY', policy: snapshot.policy }, actor('admin'));
    assert(!('courseId' in snapshot.settings)); assert(!('instituteId' in snapshot.policy));
  });
  await check('production location enablement is blocked without a healthy retention job', async () => {
    const previous = process.env.NODE_ENV; const snapshot = await service.getAttendance(actor('admin'), 'class');
    try { process.env.NODE_ENV = 'production'; await assert.rejects(mutate({ action: 'POLICY', policy: snapshot.policy }, actor('admin')), error => error.status === 409); }
    finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
  });
  const create = async (mode, extra = {}) => { await mutate({ action: 'CREATE_SESSION', input: { title: mode + '-' + Date.now(), mode, durationMinutes: mode === 'ASYNCHRONOUS' ? 10080 : 30, ...extra } }); return db.attendanceSession.findFirstOrThrow({ where: { mode, state: 'OPEN' }, orderBy: { opensAt: 'desc' } }); };
  const live = await create('LIVE_REMOTE'); const asyncSession = await create('ASYNCHRONOUS');
  await check('live and async coexist; duplicate live capacity is rejected', async () => { assert.equal(await db.attendanceSession.count({ where: { state: 'OPEN' } }), 2); await assert.rejects(create('IN_PERSON')); });
  await check('concurrent retries produce one self-reported record and event', async () => { await Promise.all(Array.from({ length: 20 }, () => mutate({ action: 'CHECK_IN', sessionId: live.id }, actor('student-0')))); assert.equal(await db.attendanceEvent.count({ where: { sessionId: live.id, studentId: 'student-0', action: 'CHECK_IN' } }), 1); });
  await check('student read is private and other roles/institutes cannot enter', async () => { const view = await service.getAttendance(actor('student-0'), 'class'); assert(view.sessions.every(s => s.records.every(r => r.studentId === 'student-0'))); assert.equal(view.staff.length, 0); await assert.rejects(service.getAttendance(actor('foreign'), 'class')); await assert.rejects(service.getAttendance(actor('helper'), 'class')); });
  await check('real route handlers enforce student privacy and reject tampered identity and foreign institute', async () => {
    const routes = await compile("export { GET, POST } from './apps/web/src/app/api/courses/[courseId]/attendance/route.ts';", state);
    const selectActor = async id => { state.session = await db.session.findUniqueOrThrow({ where: { id: id + '-session' }, include: { user: true } }); };
    const context = { params: Promise.resolve({ courseId: 'class' }) };
    await selectActor('student-0');
    const own = await routes.GET(new Request('https://lms.invalid/api/courses/class/attendance'), context);
    assert.equal(own.status, 200); const body = await own.json(); assert(body.sessions.every(s => s.records.every(r => r.studentId === 'student-0')));
    const tampered = await routes.POST(new Request('https://lms.invalid/api/courses/class/attendance', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'CHECK_IN', sessionId: live.id, studentId: 'student-1' }) }), context); assert.equal(tampered.status, 400);
    await selectActor('foreign'); assert.equal((await routes.GET(new Request('https://lms.invalid/api/courses/class/attendance'), context)).status, 404);
    state.session = null; assert.equal((await routes.GET(new Request('https://lms.invalid/api/courses/class/attendance'), context)).status, 401);
  });
  await check('requests resolve after closure without granting helper correction authority', async () => {
    await mutate({ action: 'GRANT', userId: 'helper' }); await mutate({ action: 'REQUEST', sessionId: live.id }, actor('student-1'));
    await mutate({ action: 'END', sessionId: live.id });
    const closed = await db.attendanceSession.findUniqueOrThrow({ where: { id: live.id } });
    assert.equal(closed.expiresAt.getTime() - closed.closedAt.getTime(), 365 * 86400000);
    const request = await db.attendanceRequest.findFirstOrThrow({ where: { record: { sessionId: live.id, studentId: 'student-1' } } });
    await mutate({ action: 'ACCEPT_ALL', sessionId: live.id, requests: [{ id: request.id, revision: request.revision }], acknowledgeUnverified: true }, actor('helper'));
    const record = await db.attendanceRecord.findUniqueOrThrow({ where: { sessionId_studentId: { sessionId: live.id, studentId: 'student-1' } } }); assert.equal(record.status, 'PRESENT');
    await assert.rejects(mutate({ action: 'MARK', sessionId: live.id, recordId: record.id, status: 'EXCUSED', reason: 'Forbidden helper correction', revision: record.revision }, actor('helper')));
    assert.equal(await db.notification.count({ where: { userId: 'student-1', type: 'ATTENDANCE' } }), 1);
  });
  await check('async enrollment adds fair joiners, removes unmarked leavers and preserves rejoin cutoff', async () => {
    await db.$transaction(async tx => { await service.attendanceEnrollmentChanged(tx, 'class', 'student-101', true); await tx.enrollment.create({ data: { courseId: 'class', studentId: 'student-101', status: 'APPROVED' } }); });
    const first = await db.attendanceRecord.findUniqueOrThrow({ where: { sessionId_studentId: { sessionId: asyncSession.id, studentId: 'student-101' } } }); assert.equal(first.required, true);
    await db.$transaction(async tx => { await service.attendanceEnrollmentChanged(tx, 'class', 'student-101', false); await tx.enrollment.deleteMany({ where: { courseId: 'class', studentId: 'student-101' } }); });
    assert.equal((await db.attendanceRecord.findUniqueOrThrow({ where: { id: first.id } })).required, false);
    await db.$transaction(async tx => { await service.attendanceEnrollmentChanged(tx, 'class', 'student-101', true); await tx.enrollment.create({ data: { courseId: 'class', studentId: 'student-101', status: 'APPROVED' } }); });
    assert.equal((await db.attendanceRecord.findUniqueOrThrow({ where: { id: first.id } })).presentUntil.getTime(), first.presentUntil.getTime());
  });
  await check('QR validation, manual protection and location exception bulk exclusion', async () => {
    const s = await create('IN_PERSON', { requiresLocation: true, latitude: 14.75, longitude: 121.1 }); const code = await service.attendanceCodes(manager, 'class', s.id);
    await assert.rejects(mutate({ action: 'CHECK_IN', sessionId: s.id, token: 'forged' }, actor('student-2')));
    await mutate({ action: 'REQUEST', sessionId: s.id }, actor('student-2')); const request = await db.attendanceRequest.findFirstOrThrow({ where: { record: { sessionId: s.id, studentId: 'student-2' } } });
    const bulk = await mutate({ action: 'ACCEPT_ALL', sessionId: s.id, requests: [{ id: request.id, revision: 0 }], acknowledgeUnverified: true }); assert.equal(bulk.skipped, 1);
    await mutate({ action: 'DECIDE', sessionId: s.id, requestId: request.id, revision: 0, accept: true, status: 'EXCUSED', reason: 'Synthetic individual verification' }, actor('helper'));
    const result = await mutate({ action: 'CHECK_IN', sessionId: s.id, token: code.token }, actor('student-2')); assert.equal(result.status, 'EXCUSED');
    await mutate({ action: 'CANCEL', sessionId: s.id });
  });
  await check('expiry is consistent in export and overview without any scheduled finalizer', async () => { await pool.query('UPDATE "AttendanceSession" SET "opensAt"=now()-interval \'1 hour\',"presentUntil"=now()-interval \'30 minutes\',"closesAt"=now()-interval \'1 minute\' WHERE id=$1', [asyncSession.id]); const csv = await service.attendanceExport(manager, 'class'); assert(csv.csv.includes('ABSENT')); const view = await service.getAttendance(manager, 'class'); assert.equal(view.sessions.find(s => s.id === asyncSession.id).state, 'CLOSED', JSON.stringify({ session: await db.attendanceSession.findUnique({ where: { id: asyncSession.id } }), now: new Date().toISOString(), databaseClock: (await pool.query('SELECT now()')).rows })); });
  for (const size of [100, 200]) {
    if (size === 200) await db.enrollment.createMany({ data: Array.from({ length: 100 }, (_, i) => ({ courseId: 'class', studentId: 'student-' + (i + 100), status: 'APPROVED' })), skipDuplicates: true });
    const s = await create('IN_PERSON'); const code = await service.attendanceCodes(manager, 'class', s.id); const started = Date.now(); const timings = [];
    await Promise.all(Array.from({ length: size }, async (_, i) => { const begin = Date.now(); await mutate({ action: 'CHECK_IN', sessionId: s.id, token: code.token }, actor('student-' + i)); timings.push(Date.now() - begin); }));
    assert.equal(await db.attendanceRecord.count({ where: { sessionId: s.id, status: 'PRESENT', source: 'QR_SCANNED' } }), size);
    timings.sort((a,b) => a-b); report.load.push({ students: size, poolMax: 2, durationMs: Date.now() - started, p95Ms: timings[Math.floor(size * .95)], duplicates: 0, incorrectStatuses: 0 });
    console.log('PASS ' + size + '-student burst'); await mutate({ action: 'END', sessionId: s.id });
  }
  await check('weak-network retries and simultaneous closure preserve one consistent outcome', async () => {
    const s = await create('IN_PERSON'); const code = await service.attendanceCodes(manager, 'class', s.id);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await mutate({ action: 'CHECK_IN', sessionId: s.id, token: code.token }, actor('student-0'));
    await mutate({ action: 'CHECK_IN', sessionId: s.id, token: code.token }, actor('student-0'));
    const outcomes = await Promise.allSettled([mutate({ action: 'CHECK_IN', sessionId: s.id, token: code.token }, actor('student-1')), mutate({ action: 'END', sessionId: s.id })]);
    assert(outcomes.some(value => value.status === 'fulfilled'));
    const record = await db.attendanceRecord.findUniqueOrThrow({ where: { sessionId_studentId: { sessionId: s.id, studentId: 'student-1' } } });
    assert(['PRESENT', 'ABSENT'].includes(record.status)); assert.equal((await db.attendanceSession.findUniqueOrThrow({ where: { id: s.id } })).state, 'CLOSED');
    assert.equal(await db.attendanceEvent.count({ where: { sessionId: s.id, studentId: 'student-0', action: 'CHECK_IN' } }), 1);
  });
  await check('revocation removes historical helper access', async () => { const grant = await db.attendanceGrant.findFirstOrThrow(); await mutate({ action: 'REVOKE', grantId: grant.id }); await assert.rejects(service.getAttendance(actor('helper'), 'class')); });
  await check('disabled rollout cancels active windows without adding absences', async () => { const s = await create('LIVE_REMOTE'); const policy = await db.attendancePolicy.findUniqueOrThrow({ where: { instituteId: 'ics' } }); const { instituteId, updatedAt, ...value } = policy; await mutate({ action: 'POLICY', policy: { ...value, timezone: 'Asia/Manila', rollout: 'DISABLED' } }, actor('admin')); assert.equal((await db.attendanceSession.findUniqueOrThrow({ where: { id: s.id } })).state, 'CANCELLED'); assert.equal(await db.attendanceRecord.count({ where: { sessionId: s.id, status: 'ABSENT' } }), 0); });
  await check('retention removes expired details only after a hold is released; audit history remains', async () => {
    const r = await db.attendanceRecord.findFirstOrThrow();
    await service.transaction(tx => tx.attendanceVerificationDetail.create({ data: { recordId: r.id, outcome: 'UNCLEAR', expiresAt: new Date(Date.now() - 1000) } }));
    await mutate({ action: 'HOLD', sessionId: r.sessionId, enabled: true, reason: 'Synthetic preservation test' }, actor('admin'));
    await service.purgeAttendance(); assert.equal(await db.attendanceVerificationDetail.count({ where: { recordId: r.id } }), 1);
    await mutate({ action: 'HOLD', sessionId: r.sessionId, enabled: false, reason: 'Synthetic hold completed' }, actor('admin'));
    const before = await db.attendanceEvent.count(); await service.purgeAttendance();
    assert.equal(await db.attendanceVerificationDetail.count({ where: { recordId: r.id } }), 0); assert.equal(await db.attendanceEvent.count(), before); assert.equal((await service.retentionHealth()).healthy, true);
  });
  report.result = 'PASS';
} catch (error) { report.result = 'FAIL'; report.error = error instanceof Error ? error.message : String(error); console.error('Attendance integration failed:', report.error); process.exitCode = 1; }
finally { if (db) await db.$disconnect(); if (pool) await pool.end().catch(() => {}); if (started || fs.existsSync(path.join(data, 'postmaster.pid'))) command('pg_ctl', ['stop', '-D', data, '-m', 'fast', '-w', '-t', '20']); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log('Report: ' + path.join(output, 'report.json')); }
