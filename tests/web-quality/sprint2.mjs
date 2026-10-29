// Owns its loopback database, HTTPS server, synthetic accounts and source copy. Never loads dotenv.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import https from 'node:https';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createDisposablePostgres } from '../program-head/postgres-fixture.mjs';
import { createWebWorkspace } from '../roster/web-workspace.mjs';
import { installSuperUserBoundary } from '../../scripts/install-super-user-boundary.mjs';
import { installRosterActivation } from '../../scripts/install-roster-activation.mjs';
import { ownedLoad, seedOwnedLoad } from './owned-load.mjs';
const require = createRequire(import.meta.url);
const webRequire = createRequire(path.resolve('apps/web/package.json'));
const { compile } = require('./compile.cjs');
const output = path.resolve('tmp/roster-import/sprint2-' + Date.now()); fs.mkdirSync(output, { recursive: true });
const report = { startedAt: new Date().toISOString(), owned: true, productionBuild: true, realStudentData: false, checks: [], dataset: { students: 400, assignments: 100, submissions: 40000 }, limitations: ['Local PostgreSQL and one HTTPS app process; no concurrent-user capacity claim.', 'Scanner wire-protocol fixture only; real ClamAV provider/signatures remain unverified.'] };
const safeEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(key)));
let db, cluster, scanner, server, workspace, serverClosed = false;
const sockets = new Set(); let serverLog = '';
function sourceFingerprint() {
  const hash = createHash('sha256');
  function add(file) {
    if (file.replaceAll('\\', '/').startsWith('apps/web/public/uploads')) return;
    const stat = fs.lstatSync(file);
    if (stat.isDirectory()) { for (const name of fs.readdirSync(file).sort()) add(path.join(file, name)); }
    else if (stat.isFile()) { hash.update(file.replaceAll('\\', '/')); hash.update(fs.readFileSync(file)); }
  }
  for (const file of ['apps/web/src', 'apps/web/public', 'apps/web/package.json', 'apps/web/next.config.ts', 'packages/api-client/src/index.ts', 'prisma/schema.prisma', 'pnpm-lock.yaml']) add(file);
  return hash.digest('hex');
}
function run(args, env = safeEnv, logName = 'command.log', executable = process.execPath, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); let log = '', stdout = '';
    const timeout = setTimeout(() => { child.kill(); reject(Error('Owned command timed out: ' + logName)); }, 600000);
    child.stdout.on('data', bytes => { log += bytes; stdout += bytes; }); child.stderr.on('data', bytes => { log += bytes; });
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('close', code => { clearTimeout(timeout); fs.writeFileSync(path.join(output, logName), log.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted owned connection]')); if (code) { console.error(log.slice(-4000)); reject(Error(`${logName} exited ${code}`)); } else resolve(stdout); });
  });
}
async function check(name, work) { await work(); report.checks.push({ name, result: 'PASS' }); console.log('PASS ' + name); }
async function freePort() { return new Promise(resolve => { const socket = net.createServer(); socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(() => resolve(port)); }); }); }
async function startOwnedServer(env) {
  serverClosed = false; let ready = false;
  server = spawn(process.execPath, ['tests/web-quality/browser-server.mjs'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', bytes => { serverLog += bytes; if (String(bytes).includes('OWNED_WEB_QUALITY_READY')) ready = true; });
  server.stderr.on('data', bytes => serverLog += bytes); server.on('close', () => serverClosed = true);
  server.on('error', () => serverClosed = true);
  const deadline = Date.now() + 60000;
  while (!ready) { if (serverClosed || Date.now() > deadline) throw Error('Owned HTTPS server did not become ready.'); await new Promise(resolve => setTimeout(resolve, 250)); }
}
async function stopOwnedServer() {
  if (!server || serverClosed) return;
  server.kill(); const deadline = Date.now() + 15000;
  while (!serverClosed && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  if (!serverClosed) throw Error('Owned server stop could not be confirmed.');
}
try {
  const schemaPath = path.join(output, 'before-sprint2.prisma');
  fs.writeFileSync(schemaPath, fs.readFileSync('prisma/schema.prisma', 'utf8').replace(/^\s*lastSeenAt DateTime @default\(now\(\)\)\r?\n/m, '').replace(/^\s*scanStatus String @default\("LEGACY"\)\r?\n/m, '').replace(/^\s*sha256 String\?\r?\n/m, ''));
  const config = path.join(output, 'prisma.config.mjs'); fs.writeFileSync(config, 'export default ' + JSON.stringify({ schema: schemaPath, datasource: { url: 'postgresql://unused@127.0.0.1:1/harness_offline' } }));
  const ddl = await run([path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js'), 'migrate', 'diff', '--config', config, '--from-empty', '--to-schema', schemaPath, '--script'], safeEnv, 'ddl.log');
  cluster = await createDisposablePostgres(); assert.equal(new URL(cluster.url).hostname, '127.0.0.1'); assert.match(cluster.database, /^harness_/);
  await cluster.owner.query(ddl);
  const password = 'Synthetic' + randomBytes(10).toString('hex') + '1!'; const passwordHash = await webRequire('bcryptjs').hash(password, 10);
  await cluster.owner.query(`INSERT INTO "Institute"(id,code,name) VALUES('ics','ics','Synthetic ICS'),('ibe','ibe','Synthetic IBE'),('ite','ite','Synthetic ITE');
    INSERT INTO "User"(id,name,email,password,role,"instituteId") VALUES('perf-teacher','Synthetic Performance Teacher','perf-teacher@example.invalid','UNUSABLE','PROFESSOR','ics');
    INSERT INTO "User"(id,name,email,password,role,"instituteId","studentNumber") SELECT 'perf-'||i,'Synthetic Student '||lpad(i::text,3,'0'),'perf-'||i||'@example.invalid','UNUSABLE','STUDENT','ics','PERF-'||i FROM generate_series(1,400)i;
    INSERT INTO "AcademicProgram"(id,code,name,"instituteId") VALUES('bsit','BSIT','Synthetic BSIT','ics');
    INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","instructorId","updatedAt") VALUES('perf-course','PERF','PERFJOIN','Synthetic performance','ics','perf-teacher',CURRENT_TIMESTAMP);
    INSERT INTO "Enrollment"(id,"studentId","courseId",status) SELECT 'pe-'||i,'perf-'||i,'perf-course','APPROVED' FROM generate_series(1,400)i;
    INSERT INTO "SyllabusItem"(id,"courseId",type,title,"maxPoints","orderIndex","updatedAt") SELECT 'pa-'||i,'perf-course','ASSIGNMENT','Synthetic activity '||i,100,i,CURRENT_TIMESTAMP FROM generate_series(1,100)i;
    INSERT INTO "StudentSubmission"(id,"studentId","syllabusItemId",status,grade,"isReturned","submittedAt","updatedAt") SELECT 'ps-'||s||'-'||a,'perf-'||s,'pa-'||a,'RETURNED',90,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM generate_series(1,400)s CROSS JOIN generate_series(1,100)a;
    INSERT INTO "SubmissionAttachment"(id,"submissionId",type,url,"fileName") SELECT 'pf-'||s,'ps-'||s||'-1','FILE','data:text/plain;base64,'||repeat('YWJj',1024),'synthetic.txt' FROM generate_series(1,400)s;
    INSERT INTO "Session"(id,"userId","tokenHash","createdAt","expiresAt") VALUES('old-session','perf-1','unusable',CURRENT_TIMESTAMP-interval '2 hours',CURRENT_TIMESTAMP+interval '1 day');`);
  const accounts = {};
  for (const project of ['chromium', 'firefox', 'webkit', 'narrow-web']) {
    const courseId = 'course-' + project, itemId = 'item-' + project; accounts[project] = {};
    for (const [role, dbRole] of [['student', 'STUDENT'], ['teacher', 'PROFESSOR'], ['admin', 'ADMIN']]) {
      const id = `${role}-${project}`, name = `Synthetic ${role} ${project}`, email = id + '@example.invalid'; accounts[project][role] = { id, name, email, courseId, itemId };
      await cluster.owner.query('INSERT INTO "User"(id,name,email,password,role,"instituteId") VALUES($1,$2,$3,$4,$5,\'ics\')', [id, name, email, passwordHash, dbRole]);
    }
    await cluster.owner.query('INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","instructorId","updatedAt") VALUES($1,$2,$3,$4,\'ics\',$5,CURRENT_TIMESTAMP)', [courseId, project, 'JOIN' + project, 'Synthetic workflow ' + project, 'teacher-' + project]);
    await cluster.owner.query('INSERT INTO "Enrollment"(id,"studentId","courseId",status) VALUES($1,$2,$3,\'APPROVED\')', ['enroll-' + project, 'student-' + project, courseId]);
    await cluster.owner.query('INSERT INTO "SyllabusItem"(id,"courseId",type,title,"maxPoints","updatedAt") VALUES($1,$2,\'ASSIGNMENT\',\'Synthetic assignment\',100,CURRENT_TIMESTAMP)', [itemId, courseId]);
  }
  await check('Sprint 2 additive migrations preserve 413 accounts and existing session creation times', async () => {
    const usersBefore = (await cluster.owner.query('SELECT count(*)::int n FROM "User"')).rows[0].n;
    for (const folder of ['20261020140000_session_idle', '20261020150000_private_upload_scan']) await cluster.owner.query(fs.readFileSync(`prisma/migrations/${folder}/migration.sql`, 'utf8'));
    assert.equal((await cluster.owner.query('SELECT count(*)::int n FROM "User"')).rows[0].n, usersBefore);
    const row = (await cluster.owner.query('SELECT "createdAt","lastSeenAt" FROM "Session" WHERE id=\'old-session\'')).rows[0]; assert.equal(row.lastSeenAt.toISOString(), '1970-01-01T00:00:00.000Z');
  });
  if (process.env.WEB_QUALITY_LOCAL_LOAD === '1') await seedOwnedLoad(cluster);
  const assignmentSql = fs.readFileSync('prisma/program-head-chart/approved-existing-target-update.sql', 'utf8');
  await cluster.owner.query(assignmentSql.slice(assignmentSql.indexOf('-- Assignments are administrative input')).replace(/COMMIT;\s*$/, '').replace(/CREATE UNIQUE INDEX "ProgramMembership_one_student_home"[^;]+;/, ''));
  await (await cluster.connect('bqual_bootstrap_admin', 'postgres')).query('ALTER ROLE bqual_schema_owner CREATEROLE');
  const runtimePassword = randomBytes(32).toString('hex');
  await installSuperUserBoundary(cluster.owner, { runtimePrincipal: 'sprint2_runtime', operatorPrincipal: 'sprint2_operator', runtimePassword, operatorPassword: randomBytes(32).toString('hex'), qualificationReference: 'OWNED_SYNTHETIC_SPRINT2' });
  await cluster.owner.query(fs.readFileSync('prisma/super-user-v1/administrator-consolidation.sql', 'utf8'));
  await cluster.owner.query('CREATE UNIQUE INDEX "User_studentNumber_normalized_key" ON "User"(upper(btrim("studentNumber"))) WHERE "studentNumber" IS NOT NULL');
  await installRosterActivation(cluster.owner);
  const url = new URL(cluster.url); url.username = 'sprint2_runtime'; url.password = runtimePassword;
  const { PrismaClient } = webRequire('@prisma/client'), { PrismaPg } = webRequire('@prisma/adapter-pg');
  let queryCount = 0;
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href, max: 2 }), log: [{ emit: 'event', level: 'query' }] }); db.$on('query', () => queryCount++);
  const { readGradebook } = await compile(`export { readGradebook } from './apps/web/src/lib/gradebook-data';`, { db });
  const actor = { id: 'perf-teacher', role: 'PROFESSOR', instituteId: 'ics' };
  async function baseline() {
    await db.course.findUnique({ where: { id: 'perf-course' }, include: { institute: { select: { code: true } } } });
    const [enrollments, assignments, submissions, gradingPolicy] = await Promise.all([
      db.enrollment.findMany({ where: { courseId: 'perf-course', status: 'APPROVED' }, include: { student: { select: { id: true, name: true, email: true } } }, orderBy: { student: { name: 'asc' } } }),
      db.syllabusItem.findMany({ where: { courseId: 'perf-course', type: { not: 'MATERIAL' }, maxPoints: { not: null } }, select: { id: true, title: true, maxPoints: true, type: true, orderIndex: true }, orderBy: { orderIndex: 'asc' } }),
      db.studentSubmission.findMany({ where: { syllabusItem: { courseId: 'perf-course' } }, select: { id: true, syllabusItemId: true, studentId: true, grade: true, status: true, isReturned: true, submittedAt: true, attachments: { select: { id: true, type: true, url: true, fileName: true }, orderBy: { createdAt: 'asc' } } } }),
      db.gradingPolicy.findUnique({ where: { courseId: 'perf-course' }, include: { weights: true } }),
    ]);
    const grades = {}; for (const e of enrollments) { grades[e.student.id] = {}; for (const a of assignments) grades[e.student.id][a.id] = { submissionId: null, grade: null, status: null, attachments: [] }; }
    for (const s of submissions) grades[s.studentId][s.syllabusItemId] = { submissionId: s.id, grade: s.grade, status: s.status, isReturned: s.isReturned, submittedAt: s.submittedAt?.toISOString() ?? null, attachments: s.attachments };
    return { students: enrollments.map(e => e.student), assignments, grades, gradingPolicy };
  }
  async function measure(work) { const samples = []; let payload; for (let n = 0; n < 3; n++) { queryCount = 0; const start = performance.now(); payload = await work(); const bytes = Buffer.byteLength(JSON.stringify(payload)); samples.push({ milliseconds: Math.round((performance.now() - start) * 10) / 10, bytes, queries: queryCount }); } return { samples, students: payload.students.length, assignments: payload.assignments.length, bytes: samples[0].bytes }; }
  await check('400-student / 100-activity fixture: bounded gradebook pages retain all grades, totals and eight-page coverage', async () => {
    report.gradebook = { baseline: await measure(baseline), paged: await measure(() => readGradebook(actor, 'perf-course')), note: 'Same database and warm process, three sequential samples. Includes authorization query and serialization. Baseline reproduces the previous unpaged query/response shape; this is not a load test.' };
    const ids = new Set(); for (let page = 1; page <= 8; page++) { const data = await readGradebook(actor, 'perf-course', page); assert.equal(data.assignments.length, 100); for (const s of data.students) { ids.add(s.id); assert.equal(Object.values(data.grades[s.id]).reduce((sum, c) => sum + c.grade, 0), 9000); } }
    assert.equal(ids.size, 400); assert.ok(report.gradebook.paged.bytes < report.gradebook.baseline.bytes / 4);
  });
  // The wire fixture confirms integration, not real malware detection.
  scanner = net.createServer(socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); let data = Buffer.alloc(0), command = false;
    socket.on('data', bytes => { data = Buffer.concat([data, bytes]); if (!command) { if (data.length < 10) return; if (data.subarray(0, 10).toString() !== 'zINSTREAM\0') return socket.destroy(); data = data.subarray(10); command = true; }
      while (data.length >= 4) { const length = data.readUInt32BE(); if (data.length < length + 4) return; data = data.subarray(4 + length); if (!length) { socket.end('stream: OK\0'); return; } }
    });
  }); await new Promise(resolve => scanner.listen(0, '127.0.0.1', resolve));
  report.productSourceSHA256 = sourceFingerprint();
  workspace = createWebWorkspace(output);
  const nextConfig = path.join(workspace.appDir, 'next.config.ts'); fs.writeFileSync(nextConfig, fs.readFileSync(nextConfig, 'utf8').replace('const nextConfig: NextConfig = {', 'const nextConfig: NextConfig = {\n webpack: config => { config.cache = false; return config; },'));
  const port = await freePort(); const origin = `https://127.0.0.1:${port}`;
  // The matrix signs in repeatedly from one loopback IP. Keep account limits intact;
  // use an explicit test-only IP allowance, rather than weakening product defaults.
  report.functionalTestLoginIpAllowance = 100;
  const env = { ...safeEnv, NODE_ENV: 'production', DATABASE_URL: url.href, NEXT_TELEMETRY_DISABLED: '1', APP_BASE_URL: origin, NEXT_PUBLIC_APP_URL: origin, FILE_SCANNING_ENABLED: 'true', CLAMAV_HOST: '127.0.0.1', CLAMAV_PORT: String(scanner.address().port), EMAIL_INVITATIONS_ENABLED: 'false', RATE_LIMIT_LOGIN_IP_MAX: '100', WEB_QUALITY_PORT: String(port), WEB_QUALITY_APP: workspace.appDir, WEB_QUALITY_OUTPUT: output };
  console.log('Building owned production source copy…');
  await check('Next.js production build passes', () => run([webRequire.resolve('next/dist/bin/next'), 'build', '--webpack'], env, 'build.log', process.execPath, workspace.appDir));
  await run(['-NoProfile', '-File', 'tests/web-quality/certificate.ps1', '-Directory', output], safeEnv, 'certificate.log', 'pwsh');
  await startOwnedServer(env);
  const runId = randomBytes(16).toString('hex'), stateFile = path.join(output, 'browser-state.json');
  fs.writeFileSync(stateFile, JSON.stringify({ owned: true, runId, origin, output, accounts, password }));
  await check('Chromium, Firefox, WebKit and narrow-web workflows and keyboard/CSP checks pass', () => run([require.resolve('@playwright/test/cli'), 'test', '--config', 'tests/web-quality/playwright.config.ts'], { ...safeEnv, WEB_QUALITY_STATE: stateFile, WEB_QUALITY_OWNED_RUN: runId }, 'browser.log'));
  if (process.env.WEB_QUALITY_LOCAL_LOAD === '1') report.localLoad = await ownedLoad({ cluster, db, origin, output, safeEnv, run, restart: async max => { await stopOwnedServer(); await startOwnedServer({ ...env, DATABASE_POOL_MAX: String(max) }); } });
  assert.equal(sourceFingerprint(), report.productSourceSHA256, 'Product source changed after the build snapshot; verify the final source again.');
  report.result = 'PASS';
} catch (error) { report.result = 'FAIL'; report.error = error instanceof assert.AssertionError ? error.message : error.message?.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted owned connection]'); console.error('SPRINT2_VERIFICATION_FAILED', report.error); process.exitCode = 1; }
finally {
  if (server && !serverClosed) { server.kill(); const deadline = Date.now() + 15000; while (!serverClosed && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100)); if (!serverClosed) { report.serverStopped = false; process.exitCode = 1; } else report.serverStopped = true; }
  fs.writeFileSync(path.join(output, 'server.log'), serverLog.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted owned connection]'));
  for (const socket of sockets) socket.destroy(); if (scanner) await new Promise(resolve => scanner.close(resolve));
  if (db) await db.$disconnect(); if (cluster) { await cluster.stop(); report.clusterStopped = true; }
  if (workspace && (!server || serverClosed)) workspace.dispose();
  report.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); console.log('Evidence: ' + path.relative(process.cwd(), path.join(output, 'report.json')));
}
