// Owns a loopback database and HTTPS app with synthetic accounts. Never loads dotenv.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { createDisposablePostgres } from './postgres-fixture.mjs';
import { scannerFixture } from './scanner-fixture.mjs';
import { installSuperUserBoundary } from '../../scripts/install-super-user-boundary.mjs';
import { installRosterActivation } from '../../scripts/install-roster-activation.mjs';

const require = createRequire(import.meta.url);
const webRequire = createRequire(path.resolve('apps/web/package.json'));
const output = path.resolve('tmp/roster-import/labs-browser-' + Date.now());
fs.mkdirSync(output, { recursive: true });
const report = { startedAt: new Date().toISOString(), owned: true, checks: [], limitations: ['Owned loopback environment only; no staging deployment claim.', 'Scanner protocol fixture only; real antivirus verification remains required.'] };
const safeEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(key)));
const emptyEnv = path.join(output, 'empty.env'); fs.writeFileSync(emptyEnv, ''); safeEnv.DOTENV_CONFIG_PATH = emptyEnv;
let cluster, scanner, server, serverClosed = true, serverLog = '';
const redact = value => String(value).replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted owned connection]');
async function run(args, env, logName, program = process.execPath, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; const timeout = setTimeout(() => { child.kill(); reject(Error('Owned command deadline: ' + logName)); }, 600000);
    child.stdout.on('data', bytes => { log += bytes; }); child.stderr.on('data', bytes => { log += bytes; });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('close', code => { clearTimeout(timeout); fs.writeFileSync(path.join(output, logName), redact(log));
      if (code) { console.error(redact(log.slice(-3500))); reject(Error(logName + ' exited ' + code)); } else resolve(); });
  });
}
async function check(name, work) { await work(); report.checks.push({ name, result: 'PASS' }); console.log('PASS ' + name); }
async function freePort() { return new Promise(resolve => { const listener = net.createServer(); listener.listen(0, '127.0.0.1', () => { const port = listener.address().port; listener.close(() => resolve(port)); }); }); }

try {
  if (process.env.LAB_E2E_BUILD !== '1') assert.ok(fs.existsSync('apps/web/.next/BUILD_ID'), 'Build the feature first, or set LAB_E2E_BUILD=1.');
  cluster = await createDisposablePostgres();
  assert.equal(new URL(cluster.url).hostname, '127.0.0.1'); assert.match(cluster.database, /^harness_labs_/);
  const baseSchema = path.join(output, 'baseline.prisma');
  fs.writeFileSync(baseSchema, execFileSync('git', ['show', '1a231cd0a10cb3c2bf733c04de17c01058ee300c:prisma/schema.prisma'], { encoding: 'utf8', windowsHide: true }));
  const config = path.join(output, 'prisma.config.mjs');
  fs.writeFileSync(config, 'export default ' + JSON.stringify({ schema: baseSchema, datasource: { url: 'postgresql://unused@127.0.0.1:1/harness_labs_offline' } }));
  const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');
  const ddl = execFileSync(process.execPath, [cli, 'migrate', 'diff', '--config', config, '--from-empty', '--to-schema', baseSchema, '--script'], { env: safeEnv, encoding: 'utf8', windowsHide: true });
  await cluster.owner.query(ddl);
  await cluster.owner.query(fs.readFileSync('prisma/migrations/20261025140000_guided_practical_labs/migration.sql', 'utf8'));
  const password = 'Lab-' + randomBytes(20).toString('hex') + '!';
  const passwordHash = await hash(password, 4);
  await cluster.owner.query(`INSERT INTO "Institute"(id,code,name) VALUES('ics','ics','Synthetic ICS'),('ibe','ibe','Synthetic IBE'),('ite','ite','Synthetic ITE');`);
  await cluster.owner.query(`INSERT INTO "User"(id,name,email,password,role,"instituteId") VALUES('teacher','Synthetic Teacher','teacher@example.invalid',$1,'PROFESSOR','ics'),('student','Synthetic Student','student@example.invalid',$1,'STUDENT','ics'),('other','Synthetic Other Student','other@example.invalid',$1,'STUDENT','ics')`, [passwordHash]);
  await cluster.owner.query(`INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","instructorId","updatedAt") VALUES('course','LAB101','LABJOIN','Synthetic MySQL Lab Course','ics','teacher',CURRENT_TIMESTAMP);
    INSERT INTO "Enrollment"(id,"studentId","courseId",status) VALUES('enrolled','student','course','APPROVED'),('other-enrolled','other','course','APPROVED');`);
  const assignmentSql = fs.readFileSync('prisma/program-head-chart/approved-existing-target-update.sql', 'utf8');
  await cluster.owner.query(assignmentSql.slice(assignmentSql.indexOf('-- Assignments are administrative input')).replace(/COMMIT;\s*$/, '').replace(/CREATE UNIQUE INDEX "ProgramMembership_one_student_home"[^;]+;/, ''));
  await (await cluster.connect('bqual_bootstrap_admin', 'postgres')).query('ALTER ROLE bqual_schema_owner CREATEROLE');
  const runtimePassword = randomBytes(32).toString('hex');
  await installSuperUserBoundary(cluster.owner, { runtimePrincipal: 'labs_runtime', operatorPrincipal: 'labs_operator', runtimePassword, operatorPassword: randomBytes(32).toString('hex'), qualificationReference: 'OWNED_SYNTHETIC_LABS' });
  await cluster.owner.query(fs.readFileSync('prisma/super-user-v1/administrator-consolidation.sql', 'utf8'));
  await cluster.owner.query('CREATE UNIQUE INDEX "User_studentNumber_normalized_key" ON "User"(upper(btrim("studentNumber"))) WHERE "studentNumber" IS NOT NULL');
  await installRosterActivation(cluster.owner);
  const url = new URL(cluster.url); url.username = 'labs_runtime'; url.password = runtimePassword;
  scanner = await scannerFixture();
  const port = await freePort(), origin = `https://127.0.0.1:${port}`;
  const env = { ...safeEnv, NODE_ENV: 'production', DATABASE_URL: url.href, NEXT_TELEMETRY_DISABLED: '1', APP_BASE_URL: origin, NEXT_PUBLIC_APP_URL: origin,
    CLAMAV_HOST: scanner.host, CLAMAV_PORT: String(scanner.port), EMAIL_INVITATIONS_ENABLED: 'false', RATE_LIMIT_LOGIN_IP_MAX: '100',
    WEB_QUALITY_PORT: String(port), WEB_QUALITY_APP: path.resolve('apps/web'), WEB_QUALITY_OUTPUT: output };
  if (process.env.LAB_E2E_BUILD === '1') await check('production build on owned database', () => run([webRequire.resolve('next/dist/bin/next'), 'build', '--webpack'], env, 'build.log', process.execPath, path.resolve('apps/web')));
  await run(['-NoProfile', '-File', 'tests/web-quality/certificate.ps1', '-Directory', output], safeEnv, 'certificate.log', 'pwsh');
  serverClosed = false; let ready = false;
  server = spawn(process.execPath, ['tests/web-quality/browser-server.mjs'], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', bytes => { serverLog += bytes; if (String(bytes).includes('OWNED_WEB_QUALITY_READY')) ready = true; });
  server.stderr.on('data', bytes => { serverLog += bytes; }); server.on('close', () => { serverClosed = true; }); server.on('error', () => { serverClosed = true; });
  const readyDeadline = Date.now() + 60000;
  while (!ready) { if (serverClosed || Date.now() > readyDeadline) throw Error('Owned HTTPS app failed readiness.'); await new Promise(resolve => setTimeout(resolve, 250)); }
  const runId = randomBytes(16).toString('hex'), stateFile = path.join(output, 'browser-state.json');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0e8AAAAASUVORK5CYII=', 'base64');
  const initialEvidence = path.join(output, 'initial.png'), correctedEvidence = path.join(output, 'corrected.png');
  fs.writeFileSync(initialEvidence, png); fs.writeFileSync(correctedEvidence, png);
  fs.writeFileSync(stateFile, JSON.stringify({ owned: true, runId, origin, output, password, initialEvidence, correctedEvidence,
    accounts: { teacher: { email: 'teacher@example.invalid' }, student: { email: 'student@example.invalid' }, other: { email: 'other@example.invalid' } } }));
  await check('real-cookie instructor/student pilot with correction and gradebook', () => run([require.resolve('@playwright/test/cli'), 'test', '--config', 'tests/labs/browser.config.ts'], { ...safeEnv, LAB_E2E_STATE: stateFile, LAB_E2E_RUN: runId }, 'browser.log'));
  const result = (await cluster.owner.query('SELECT s.grade,s.status,s."isReturned",i.type FROM "StudentSubmission" s JOIN "SyllabusItem" i ON i.id=s."syllabusItemId" WHERE i.title=$1 AND s."studentId"=$2', ['MySQL pilot browser', 'student'])).rows;
  assert.equal(result.length, 1); assert.equal(result[0].grade, 92.25); assert.equal(result[0].status, 'RETURNED'); assert.equal(result[0].isReturned, true); assert.equal(result[0].type, 'ACTIVITY');
  assert.equal((await cluster.owner.query('SELECT count(*)::int n FROM "LabSubmission"')).rows[0].n, 2);
  report.result = 'PASS';
} catch (error) { report.result = 'FAIL'; report.error = redact(error.message); console.error('LAB_BROWSER_FAILED', report.error); process.exitCode = 1; }
finally {
  if (server && !serverClosed) { server.kill(); const deadline = Date.now() + 15000; while (!serverClosed && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100)); if (!serverClosed) { report.serverStopped = false; process.exitCode = 1; } }
  fs.writeFileSync(path.join(output, 'server.log'), redact(serverLog));
  await scanner?.close(); await cluster?.stop();
  report.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log('Lab browser report: ' + path.relative(process.cwd(), path.join(output, 'report.json')));
}
