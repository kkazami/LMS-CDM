// Owns a loopback database and HTTPS app with synthetic accounts. Never loads dotenv.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { createHash } from 'node:crypto';
import { hash } from 'bcryptjs';
import { createDisposablePostgres } from './postgres-fixture.mjs';
import { scannerFixture } from './scanner-fixture.mjs';
import { installSuperUserBoundary } from '../../scripts/install-super-user-boundary.mjs';
import { installRosterActivation } from '../../scripts/install-roster-activation.mjs';
import { createWebWorkspace } from '../roster/web-workspace.mjs';

const require = createRequire(import.meta.url);
const webRequire = createRequire(path.resolve('apps/web/package.json'));
const output = path.resolve('tmp/roster-import/labs-browser-' + Date.now());
fs.mkdirSync(output, { recursive: true });
const realScanner = process.env.LAB_E2E_REAL_SCANNER === '1';
const report = { startedAt: new Date().toISOString(), owned: true, checks: [], limitations: ['Owned loopback environment only; no staging deployment claim.', ...(realScanner ? [] : ['Scanner protocol fixture only; real antivirus verification remains required.'])] };
const safeEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(key)));
const emptyEnv = path.join(output, 'empty.env'); fs.writeFileSync(emptyEnv, ''); safeEnv.DOTENV_CONFIG_PATH = emptyEnv;
let cluster, scanner, server, workspace, serverClosed = true, serverLog = '';
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
function sourceHash(appDir) {
  const hash = createHash('sha256');
  function visit(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const file = path.join(directory, entry.name); if (entry.isDirectory()) visit(file); else { hash.update(path.relative(appDir, file).replaceAll('\\', '/')); hash.update(fs.readFileSync(file)); } } }
  visit(path.join(appDir, 'src'));
  for (const file of ['package.json', 'tsconfig.json', 'postcss.config.js', 'postcss.config.mjs']) if (fs.existsSync(path.join(appDir, file))) hash.update(fs.readFileSync(path.join(appDir, file)));
  return hash.digest('hex');
}
let reusedApp;

try {
  if (process.env.LAB_E2E_REUSE_APP) {
    reusedApp = fs.realpathSync(process.env.LAB_E2E_REUSE_APP);
    assert.ok(reusedApp.startsWith(path.resolve('tmp/roster-import') + path.sep));
    const marker = JSON.parse(fs.readFileSync(path.join(reusedApp, 'owned-build.json'), 'utf8'));
    assert.equal(marker.sourceHash, sourceHash(path.resolve('apps/web'))); assert.equal(marker.sourceHash, sourceHash(reusedApp));
    assert.equal(marker.owned, true); assert.equal(process.env.LAB_E2E_BUILD, undefined, 'Choose build or reuse, not both.');
  }
  if (process.env.LAB_E2E_BUILD !== '1') assert.ok(fs.existsSync(path.join(reusedApp ?? 'apps/web', '.next/BUILD_ID')), 'Build the feature first, or set LAB_E2E_BUILD=1.');
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
  await cluster.owner.query(fs.readFileSync('prisma/migrations/20261026100000_gradebook_periods/migration.sql', 'utf8'));
  const password = 'Lab-' + randomBytes(20).toString('hex') + '!';
  const passwordHash = await hash(password, 4);
  await cluster.owner.query(`INSERT INTO "Institute"(id,code,name) VALUES('ics','ics','Synthetic ICS'),('ibe','ibe','Synthetic IBE'),('ite','ite','Synthetic ITE');`);
  await cluster.owner.query(`INSERT INTO "User"(id,name,email,password,role,"instituteId") VALUES('teacher','Synthetic Teacher','teacher@example.invalid',$1,'PROFESSOR','ics'),('student','Synthetic Student','student@example.invalid',$1,'STUDENT','ics'),('other','Synthetic Other Student','other@example.invalid',$1,'STUDENT','ics')`, [passwordHash]);
  await cluster.owner.query(`INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","instructorId","updatedAt") VALUES('course','LAB101','LABJOIN','Synthetic MySQL Lab Course','ics','teacher',CURRENT_TIMESTAMP);
    INSERT INTO "Enrollment"(id,"studentId","courseId",status) VALUES('enrolled','student','course','APPROVED'),('other-enrolled','other','course','APPROVED');`);
  await cluster.owner.query(`INSERT INTO "User"(id,name,email,password,role,"instituteId") VALUES('foreign-teacher','Foreign teacher','foreign-teacher@example.invalid',$1,'PROFESSOR','ics')`, [passwordHash]);
  await cluster.owner.query(`INSERT INTO "Course"(id,code,"courseCode",title,"instituteId","instructorId","updatedAt") VALUES('grade-course','GRADE101','GRADEJOIN','Period Gradebook Class','ics','teacher',now()),('grade-second','GRADE102','GRADESECOND','Second Gradebook Class','ics','teacher',now()),('grade-foreign','FOR101','FOREIGNJOIN','Forbidden Gradebook Class','ics','foreign-teacher',now());
    INSERT INTO "Enrollment"(id,"studentId","courseId",status) VALUES('grade-student','student','grade-course','APPROVED'),('grade-other','other','grade-course','APPROVED');
    INSERT INTO "SyllabusItem"(id,"courseId",type,title,"maxPoints","orderIndex","updatedAt") VALUES('grade-mid','grade-course','MIDTERM_EXAM','Midterm database exam',100,0,now()),('grade-final','grade-course','FINAL_EXAM','Final database exam',100,10,now());
    INSERT INTO "StudentSubmission"(id,"studentId","syllabusItemId",grade,status,"isReturned","updatedAt") VALUES('grade-sm','student','grade-mid',80,'RETURNED',true,now()),('grade-sf','student','grade-final',90,'RETURNED',true,now());`);
  for (let index = 1; index <= 7; index++) {
    await cluster.owner.query(`INSERT INTO "SyllabusItem"(id,"courseId",type,title,"maxPoints","orderIndex","updatedAt") VALUES($1,'grade-course','QUIZ',$2,100,$3,now())`, ['grade-q' + index, 'Database quiz ' + index, index]);
    await cluster.owner.query(`INSERT INTO "StudentSubmission"(id,"studentId","syllabusItemId",grade,status,"isReturned","updatedAt") VALUES($1,'student',$2,80,'RETURNED',true,now())`, ['grade-sq' + index, 'grade-q' + index]);
  }
  const assignmentSql = fs.readFileSync('prisma/program-head-chart/approved-existing-target-update.sql', 'utf8');
  await cluster.owner.query(assignmentSql.slice(assignmentSql.indexOf('-- Assignments are administrative input')).replace(/COMMIT;\s*$/, '').replace(/CREATE UNIQUE INDEX "ProgramMembership_one_student_home"[^;]+;/, ''));
  await (await cluster.connect('bqual_bootstrap_admin', 'postgres')).query('ALTER ROLE bqual_schema_owner CREATEROLE');
  const runtimePassword = randomBytes(32).toString('hex');
  await installSuperUserBoundary(cluster.owner, { runtimePrincipal: 'labs_runtime', operatorPrincipal: 'labs_operator', runtimePassword, operatorPassword: randomBytes(32).toString('hex'), qualificationReference: 'OWNED_SYNTHETIC_LABS' });
  await cluster.owner.query(fs.readFileSync('prisma/super-user-v1/administrator-consolidation.sql', 'utf8'));
  await cluster.owner.query('CREATE UNIQUE INDEX "User_studentNumber_normalized_key" ON "User"(upper(btrim("studentNumber"))) WHERE "studentNumber" IS NOT NULL');
  await installRosterActivation(cluster.owner);
  const url = new URL(cluster.url); url.username = 'labs_runtime'; url.password = runtimePassword;
  scanner = realScanner ? { host: '127.0.0.1', port: 3310, close: async () => {} } : await scannerFixture();
  if (realScanner) await check('real ClamAV detects clean and antivirus-test content', () => run(['--test', 'tests/web-quality/real-scanner.test.cjs'], { ...safeEnv, LAB_TEST_REAL_SCANNER: '1', FILE_SCANNING_ENABLED: 'true', CLAMAV_HOST: scanner.host, CLAMAV_PORT: String(scanner.port) }, 'real-scanner.log'));
  const port = await freePort(), origin = `https://127.0.0.1:${port}`;
  if (process.env.LAB_E2E_BUILD === '1') workspace = createWebWorkspace(output);
  if (workspace && process.env.LAB_E2E_LOW_RESOURCE === '1') {
    const configFile = path.join(workspace.appDir, 'next.config.ts');
    fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf8').replace('export default nextConfig;', `nextConfig.webpack = config => { config.cache = false; return config; };\nnextConfig.experimental = { ...nextConfig.experimental, cpus: 1, webpackMemoryOptimizations: true };\nexport default nextConfig;`));
    report.buildResourceSettings = 'Owned source copy only: webpack cache disabled, one worker, webpack memory optimizations.';
  }
  const env = { ...safeEnv, NODE_ENV: 'production', DATABASE_URL: url.href, NEXT_TELEMETRY_DISABLED: '1', APP_BASE_URL: origin, NEXT_PUBLIC_APP_URL: origin,
    FILE_SCANNING_ENABLED: 'true', CLAMAV_HOST: scanner.host, CLAMAV_PORT: String(scanner.port), EMAIL_INVITATIONS_ENABLED: 'false', RATE_LIMIT_LOGIN_IP_MAX: '100',
    WEB_QUALITY_PORT: String(port), WEB_QUALITY_APP: reusedApp ?? workspace?.appDir ?? path.resolve('apps/web'), WEB_QUALITY_OUTPUT: output };
  if (process.env.LAB_E2E_BUILD === '1') await check('production build on owned database', () => run([webRequire.resolve('next/dist/bin/next'), 'build', '--webpack'], env, 'build.log', process.execPath, workspace.appDir));
  if (workspace) fs.writeFileSync(path.join(workspace.appDir, 'owned-build.json'), JSON.stringify({ owned: true, sourceHash: sourceHash(workspace.appDir) }));
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
  if (workspace && report.result === 'FAIL' && process.env.LAB_E2E_KEEP_FAILED_BUILD === '1') report.retainedOwnedBuild = workspace.appDir;
  else workspace?.dispose();
  report.finishedAt = new Date().toISOString(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log('Lab browser report: ' + path.relative(process.cwd(), path.join(output, 'report.json')));
}
