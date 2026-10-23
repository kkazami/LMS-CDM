// Owned loopback PostgreSQL only; no dotenv, live accounts or Google credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { AsyncLocalStorage } from 'node:async_hooks';
import { hash } from 'bcryptjs';
import { createDisposablePostgres } from '../program-head/postgres-fixture.mjs';
import { installStudentRegistration } from '../../scripts/install-student-registration.mjs';
const require = createRequire(import.meta.url);
const webRequire = createRequire(path.resolve('apps/web/package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
const josePath = webRequire.resolve('jose').replaceAll('\\', '/');
const { generateKeyPair, exportJWK, SignJWT } = await import(pathToFileURL(josePath).href);
const output = path.resolve('tmp/roster-import/student-registration-' + Date.now());
fs.mkdirSync(output, { recursive: true });
const emptyEnv = path.join(output, 'empty.env'); fs.writeFileSync(emptyEnv, '');
const report = { disposable: true, checks: [] };
async function check(name, work) { await work(); report.checks.push(name); console.log('PASS ' + name); }
let cluster, driver;
try {
  const originalCwd = process.cwd();
  try {
    // Windows release checkouts can exceed the PostgreSQL binary path limit.
    if (process.env.LMS_TEST_FIXTURE_ROOT) process.chdir(process.env.LMS_TEST_FIXTURE_ROOT);
    cluster = await createDisposablePostgres();
  } finally { process.chdir(originalCwd); }
  const ddl = execFileSync(process.execPath, [path.join(process.env.APPDATA, 'npm/node_modules/pnpm/bin/pnpm.cjs'), 'exec', 'prisma', 'migrate', 'diff', '--from-empty', '--to-schema', 'prisma/schema.prisma', '--script'], { env: { ...process.env, DOTENV_CONFIG_PATH: emptyEnv, DATABASE_URL: cluster.url }, windowsHide: true, encoding: 'utf8' });
  // Rehearse the additive migration on the previous schema.
  await cluster.owner.query(ddl.replace(/^\s*"googleSubject" TEXT,\r?\n/m, '').replace(/CREATE UNIQUE INDEX "User_googleSubject_key"[^;]+;/, ''));
  await check('additive Google migration applies and can be replayed safely', async () => {
    for (let attempt = 0; attempt < 2; attempt++) assert.equal((await installStudentRegistration(cluster.owner)).uniqueGoogleSubject, true);
  });
  await cluster.owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO bqual_test_app');
  await cluster.owner.query(`ALTER TABLE "User" ADD CONSTRAINT "User_activation_credentials_check" CHECK (("activationStatus"='PENDING_ACTIVATION' AND upper(role)='STUDENT' AND password IS NULL) OR ("activationStatus"='ACTIVE' AND password IS NOT NULL)); INSERT INTO "Institute" (id, code, name) VALUES ('ics','ics','Institute of Computer Studies'),('ite','ite','Institute of Teacher Education'),('ibe','ibe','Institute of Business and Entrepreneurship'); INSERT INTO "Course" (id,code,"courseCode",title,"instituteId","updatedAt") VALUES ('ics-class','CS101','ICS123','ICS Class','ics',now()),('ite-class','ED101','ITE123','ITE Class','ite',now()),('ibe-class','BA101','IBE123','IBE Class','ibe',now());`);
  process.env.DATABASE_URL = cluster.url;
  process.env.NODE_ENV = 'test';
  process.env.GOOGLE_CLIENT_ID = 'synthetic-client.apps.googleusercontent.com';
  process.env.GOOGLE_CLIENT_SECRET = 'SYNTHETIC_TEST_SECRET';
  process.env.APP_BASE_URL = 'http://localhost:3000';
  const context = new AsyncLocalStorage(); globalThis.__studentAuthContext = context;
  const pair = await generateKeyPair('RS256'); const publicKey = await exportJWK(pair.publicKey); publicKey.kid = 'test-key';
  globalThis.__studentAuthJwks = { keys: [publicKey] };
  const built = await build({
    stdin: { contents: `export { POST as register } from '@/app/api/auth/register/route'; export { POST as login } from '@/app/api/auth/login/route'; export { POST as join } from '@/app/api/student/join-class/route'; export { GET as me } from '@/app/api/auth/me/route'; export { GET as courses } from '@/app/api/courses/route'; export { GET as announcements } from '@/app/api/announcements/route'; export { GET as callback } from '@/app/api/auth/callback/google/route'; export { getSession, createSession, deleteSession } from '@/lib/auth-session'; export { needsClassEnrollment } from '@/lib/student-access'; export * from '@/lib/google-auth'; export { db } from '@/lib/db';`, resolveDir: path.resolve('apps/web/src'), loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json', nodePaths: [path.resolve('apps/web/node_modules')],
    external: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
    plugins: [{ name: 'request-context-and-google-keys', setup(b) {
      b.onResolve({ filter: /^next\/server$/ }, () => ({ path: 'server', namespace: 'next-test' }));
      b.onLoad({ filter: /.*/, namespace: 'next-test' }, () => ({ resolveDir: process.cwd(), contents: `export { NextResponse } from ${JSON.stringify(webRequire.resolve('next/server').replaceAll('\\', '/'))}; export function after(){}` }));
      b.onResolve({ filter: /^next\/headers$/ }, () => ({ path: 'headers', namespace: 'test' }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export async function cookies(){return globalThis.__studentAuthContext.getStore().cookies} export async function headers(){return globalThis.__studentAuthContext.getStore().headers}' }));
      b.onResolve({ filter: /^jose$/ }, args => args.importer.replaceAll('\\','/').endsWith('/google-auth.ts') ? ({ path: 'google-jose', namespace: 'keys' }) : undefined);
      b.onLoad({ filter: /.*/, namespace: 'keys' }, () => ({ resolveDir: process.cwd(), contents: `export * from ${JSON.stringify(josePath)}; import {createLocalJWKSet} from ${JSON.stringify(josePath)}; export function createRemoteJWKSet(){return (...args)=>createLocalJWKSet(globalThis.__studentAuthJwks)(...args)}` }));
    } }],
  });
  const bundle = path.join(output, 'driver.cjs'); fs.writeFileSync(bundle, built.outputFiles[0].text); driver = require(bundle);
  const jar = () => { const values = new Map(); return { get: name => values.has(name) ? { value: values.get(name) } : undefined, set: (name, value) => values.set(name, value), delete: name => values.delete(name), values }; };
  const browser = jar();
  const inContext = (cookies, fn, headers = new Headers()) => context.run({ cookies, headers }, fn);
  const call = (handler, body, cookies = browser, route = '/api/auth/register', extraHeaders = {}) => inContext(cookies, () => handler(new Request('http://localhost:3000' + route, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000', ...extraHeaders }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })));
  const registration = { name: 'Synthetic Student', email: 'student@example.invalid', studentNumber: '26-12345', password: 'Synthetic123!', confirmPassword: 'Synthetic123!', instituteCode: 'ite', acceptedPolicies: true };
  let student, token;
  await check('registration validates ID, confirmation, institute and consent at the server', async () => {
    for (const change of [{ studentNumber: '2026-12345' }, { studentNumber: 'AB-12345' }, { studentNumber: '26-1234' }, { confirmPassword: 'different' }, { instituteCode: 'foreign' }, { acceptedPolicies: false }]) assert.equal((await call(driver.register, { ...registration, ...change })).status, 400);
    assert.equal((await call(driver.register, registration, browser, '/api/auth/register', { origin: 'https://attacker.invalid' })).status, 403);
  });
  await check('public registration creates only a STUDENT, hashes the password and starts gated session', async () => {
    const response = await call(driver.register, { ...registration, role: 'ADMIN', permissions: '["all"]', instituteId: 'ics' });
    assert.equal(response.status, 200, await response.clone().text()); const data = await response.json();
    assert.equal(data.user.requiresEnrollment, true); assert.equal(data.redirectTo, '/join-class'); assert.equal(data.user.role, 'STUDENT');
    student = await driver.db.user.findUniqueOrThrow({ where: { id: data.user.id } }); token = data.token;
    assert.equal(student.instituteId, 'ite'); assert.equal(student.permissions, '[]'); assert.notEqual(student.password, registration.password);
    assert.equal((await call(driver.register, registration)).status, 409);
  });
  await check('unenrolled Cookie and Bearer sessions cannot use ordinary APIs or actions', async () => {
    assert.equal(await inContext(browser, () => driver.getSession()), null);
    assert.ok(await inContext(browser, () => driver.getSession(undefined, { allowUnenrolled: true })));
    assert.equal((await call(driver.courses, undefined, browser, '/api/courses')).status, 401);
    assert.equal((await call(driver.courses, undefined, jar(), '/api/courses', { authorization: 'Bearer ' + token })).status, 401);
    const me = await (await call(driver.me, undefined, browser, '/api/auth/me')).json(); assert.equal(me.user.requiresEnrollment, true);
  });
  await check('new students can log in by email or ID, remain gated, and cannot choose a foreign portal', async () => {
    for (const identifier of [registration.email, registration.studentNumber]) {
      const loginJar = jar();
      const response = await call(driver.login, { identifier, password: registration.password, instituteCode: 'ite', acceptedPolicies: true }, loginJar, '/api/auth/login');
      assert.equal(response.status, 200, await response.clone().text()); assert.equal((await response.json()).user.requiresEnrollment, true);
      await inContext(loginJar, () => driver.deleteSession());
    }
    assert.equal((await call(driver.login, { identifier: registration.email, password: registration.password, instituteCode: 'ics', acceptedPolicies: true }, jar(), '/api/auth/login')).status, 403);
  });
  await check('foreign codes cannot enroll or unlock an ITE account, even with forged institute fields', async () => {
    assert.equal((await call(driver.join, { code: 'ICS123', instituteCode: 'ics', instituteId: 'ics' }, browser, '/api/student/join-class')).status, 400);
    assert.equal(await driver.db.enrollment.count({ where: { studentId: student.id } }), 0);
    assert.equal(await driver.needsClassEnrollment(student), true);
    await driver.db.enrollment.create({ data: { courseId: 'ics-class', studentId: student.id, status: 'APPROVED' } });
    assert.equal(await driver.needsClassEnrollment(student), true);
  });
  await check('a same-institute code enrolls immediately and repeated joins are idempotent', async () => {
    for (let index = 0; index < 2; index++) assert.equal((await call(driver.join, { code: ' ite123 ' }, browser, '/api/student/join-class')).status, 200);
    assert.equal(await driver.db.enrollment.count({ where: { studentId: student.id, courseId: 'ite-class', status: 'APPROVED' } }), 1);
    assert.equal(await driver.needsClassEnrollment(student), false);
    assert.ok(await inContext(browser, () => driver.getSession()));
    assert.equal((await call(driver.courses, undefined, browser, '/api/courses?institute=ite')).status, 200);
    assert.equal((await call(driver.courses, undefined, browser, '/api/courses?institute=ics')).status, 403);
    await driver.db.course.create({ data: { id: 'unjoined-ite', instituteId: 'ite', code: 'OTHER', courseCode: 'OTHER1', title: 'Unjoined ITE Class' } });
    await driver.db.announcement.createMany({ data: [
      { courseId: 'ite-class', authorId: student.id, content: 'OWN-CLASS-CONTENT' },
      { courseId: 'unjoined-ite', authorId: student.id, content: 'UNJOINED-CLASS-CONTENT' },
      { courseId: 'ics-class', authorId: student.id, content: 'FOREIGN-CLASS-CONTENT' },
    ] });
    assert.equal((await call(driver.announcements, undefined, browser, '/api/announcements?institute=ics')).status, 403);
    const feed = await call(driver.announcements, undefined, browser, '/api/announcements?institute=ite');
    assert.equal(feed.status, 200); const content = await feed.text();
    assert.ok(content.includes('OWN-CLASS-CONTENT')); assert.ok(!content.includes('UNJOINED-CLASS-CONTENT')); assert.ok(!content.includes('FOREIGN-CLASS-CONTENT'));

  });
  await check('archived, pending and removed enrollments do not grant access; logout still works', async () => {
    await driver.db.course.update({ where: { id: 'ite-class' }, data: { isArchived: true } });
    assert.equal(await driver.needsClassEnrollment(student), true);
    assert.equal((await call(driver.join, { code: 'ITE123' }, browser, '/api/student/join-class')).status, 400);
    await driver.db.course.update({ where: { id: 'ite-class' }, data: { isArchived: false } });
    await driver.db.enrollment.updateMany({ where: { studentId: student.id }, data: { status: 'PENDING' } });
    assert.equal(await driver.needsClassEnrollment(student), true);
    await inContext(browser, () => driver.deleteSession());
    assert.equal(browser.get('lumina_session'), undefined);
    assert.equal(await driver.db.session.count({ where: { userId: student.id } }), 0);
  });
  let tokenClaims = {};
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    assert.equal(String(url), 'https://oauth2.googleapis.com/token');
    const jwt = await new SignJWT({ email: 'google@example.invalid', email_verified: true, name: 'Google Student', nonce: tokenClaims.nonce, ...tokenClaims }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setSubject('google-stable-subject').setIssuer('https://accounts.google.com').setAudience(tokenClaims.aud || process.env.GOOGLE_CLIENT_ID).setIssuedAt().setExpirationTime('5m').sign(pair.privateKey);
    return Response.json({ id_token: jwt });
  };
  const googleJar = jar();
  async function googleStart() { return inContext(googleJar, () => driver.beginGoogle('ite')); }
  async function googleFinish(start, changes = {}) {
    const url = new URL('http://localhost:3000/api/auth/callback/google'); url.searchParams.set('state', start.searchParams.get('state')); url.searchParams.set('code', 'synthetic-code');
    for (const [key, value] of Object.entries(changes)) url.searchParams.set(key, value);
    return inContext(googleJar, () => driver.finishGoogle(url));
  }
  await check('OAuth uses PKCE and rejects wrong state, nonce, audience, email verification and replay', async () => {
    let start = await googleStart(); assert.equal(start.searchParams.get('code_challenge_method'), 'S256');
    await assert.rejects(googleFinish(start, { state: 'forged-state' }));
    for (const claims of [{ nonce: 'wrong' }, { aud: 'another-client' }, { email_verified: false }]) {
      start = await googleStart(); tokenClaims = { nonce: start.searchParams.get('nonce'), ...claims }; await assert.rejects(googleFinish(start));
    }
    start = await googleStart(); tokenClaims = { nonce: start.searchParams.get('nonce') };
    assert.equal((await googleFinish(start)).sub, 'google-stable-subject'); await assert.rejects(googleFinish(start));
  });
  await check('Google signup requires profile completion, pins verified email and stores stable subject', async () => {
    const start = await googleStart(); tokenClaims = { nonce: start.searchParams.get('nonce') };
    const profile = await googleFinish(start); await inContext(googleJar, () => driver.saveGoogleProfile(profile));
    assert.equal((await call(driver.register, { ...registration, google: true, email: 'changed@example.invalid', studentNumber: '26-12346' }, googleJar)).status, 400);
    const response = await call(driver.register, { ...registration, google: true, email: profile.email, studentNumber: '26-12346' }, googleJar);
    assert.equal(response.status, 200, await response.clone().text());
    const data = await response.json(); const user = await driver.db.user.findUniqueOrThrow({ where: { id: data.user.id } });
    assert.equal(user.googleSubject, 'google-stable-subject'); assert.equal(data.user.requiresEnrollment, true);
    assert.equal(await inContext(googleJar, () => driver.readGoogleProfile()), null);
  });
  await check('OAuth profile cookies reject tampering and expired/missing completion', async () => {
    await driver.db.rateLimitBucket.deleteMany();
    await inContext(googleJar, () => driver.saveGoogleProfile({ sub: 'unused-sub', email: 'unused@example.invalid', name: 'Unused', instituteCode: 'ite' }));
    googleJar.set('lms_google_profile', googleJar.get('lms_google_profile').value + 'tampered');
    assert.equal(await inContext(googleJar, () => driver.readGoogleProfile()), null);
    assert.equal((await call(driver.register, { ...registration, google: true }, googleJar)).status, 400);
  });
  await check('existing legacy students must prove their password to link Google; role and institute cannot change', async () => {
    await driver.db.rateLimitBucket.deleteMany();
    const legacy = await driver.db.user.create({ data: { name: 'Legacy Student', email: 'legacy@example.invalid', studentNumber: '2024-12345', password: await hash('legacy123', 4), instituteId: 'ite', role: 'STUDENT' } });
    const linkingJar = jar();
    await inContext(linkingJar, () => driver.saveGoogleProfile({ sub: 'legacy-google-sub', email: legacy.email, name: legacy.name, instituteCode: 'ite' }));
    const body = { ...registration, google: true, email: legacy.email, name: legacy.name, studentNumber: legacy.studentNumber, password: 'wrong', confirmPassword: 'wrong' };
    assert.equal((await call(driver.register, body, linkingJar)).status, 409);
    assert.equal((await call(driver.register, { ...body, password: 'legacy123', confirmPassword: 'legacy123', instituteCode: 'ics' }, linkingJar)).status, 409);
    const response = await call(driver.register, { ...body, password: 'legacy123', confirmPassword: 'legacy123', role: 'ADMIN' }, linkingJar);
    assert.equal(response.status, 200, await response.clone().text());
    const actual = await driver.db.user.findUniqueOrThrow({ where: { id: legacy.id } });
    assert.equal(actual.googleSubject, 'legacy-google-sub'); assert.equal(actual.role, 'STUDENT'); assert.equal(actual.instituteId, 'ite');
    assert.equal(actual.password, legacy.password); assert.equal(actual.studentNumber, legacy.studentNumber);
  });
  await check('linked Google users still require their own institute and enrollment', async () => {
    let start = await googleStart(); tokenClaims = { nonce: start.searchParams.get('nonce') };
    let response = await inContext(googleJar, () => driver.callback(new Request('http://localhost:3000/api/auth/callback/google?state=' + start.searchParams.get('state') + '&code=synthetic-code')));
    assert.ok(response.headers.get('location').endsWith('/join-class'));
    start = await inContext(googleJar, () => driver.beginGoogle('ics')); tokenClaims = { nonce: start.searchParams.get('nonce') };
    response = await inContext(googleJar, () => driver.callback(new Request('http://localhost:3000/api/auth/callback/google?state=' + start.searchParams.get('state') + '&code=synthetic-code')));
    assert.ok(response.headers.get('location').includes('googleError=1'));
  });
  await check('simultaneous claims cannot create duplicate student IDs', async () => {
    await driver.db.rateLimitBucket.deleteMany();
    const responses = await Promise.all(['first', 'second'].map(value => call(driver.register, { ...registration, email: value + '@example.invalid', studentNumber: '26-99990' }, jar())));
    assert.deepEqual(responses.map(value => value.status).sort(), [200, 409]);
    assert.equal(await driver.db.user.count({ where: { studentNumber: '26-99990' } }), 1);
  });
  await check('public registration attempts are rate limited', async () => {
    await driver.db.rateLimitBucket.deleteMany();
    for (let attempt = 0; attempt < 10; attempt++) assert.equal((await call(driver.register, {})).status, 400);
    assert.equal((await call(driver.register, {})).status, 429);
  });
  globalThis.fetch = originalFetch;
  if (process.argv.includes('--browser')) {
    const { browserChecks } = await import('./student-registration.browser.mjs');
    await browserChecks({ cluster, output, check });
  }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log('Evidence: ' + output);
} finally {
  await driver?.db.$disconnect();
  await cluster?.stop();
}
