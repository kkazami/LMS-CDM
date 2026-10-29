const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

test('web login leaves due rewards for the dashboard, API receipts stay immediate, and enrollment overlaps session creation', { timeout: 5000 }, async () => {
  const state = { rewards: 0, enrollments: 0, sessions: 0, requiresEnrollment: false };
  globalThis.__loginPerformanceTest = state;
  const built = await build({
    entryPoints: ['apps/web/src/app/api/auth/login/route.ts'], bundle: true, write: false,
    platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json', nodePaths: [path.resolve('apps/web/node_modules')],
    plugins: [{ name: 'login-service-boundaries', setup(b) {
      b.onResolve({ filter: /^next\/server$|^bcryptjs$|^@\/lib\/(db|auth-session|student-access|gamification\/login-rewards|rate-limit|cors|roster\/rate-limit|super-user-v1\/actor|ite\/activity-logger)$/ }, ({ path }) => ({ path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path: name }) => ({ contents:
        name === 'next/server' ? 'export const NextResponse=Response; export function after(){}' :
        name === 'bcryptjs' ? 'export async function compare(password){return password!=="incorrect"}' :
        name.endsWith('/db') ? 'export const db={user:{async findMany(){return [{id:"synthetic-student",name:"Synthetic Student",email:"student@example.invalid",password:"synthetic-hash",role:"STUDENT",isActive:true,activationStatus:"ACTIVE",credentialProvisioningState:null,instituteId:"ics",institute:{code:"ics",name:"ICS"}}]}}}' :
        name.endsWith('auth-session') ? 'export class SessionAdmissionError extends Error{} export async function createSession(){const s=globalThis.__loginPerformanceTest;s.sessions++;await new Promise(resolve=>{s.sessionReady=resolve});if(s.holdSession)await new Promise(resolve=>{s.releaseSession=resolve});return {token:"synthetic-token",expiresAt:new Date()}}' :
        name.endsWith('student-access') ? 'export async function needsClassEnrollment(){const s=globalThis.__loginPerformanceTest;s.enrollments++;s.sessionReady();if(s.enrollmentError)throw Object.assign(new Error("synthetic enrollment failure"),{code:"P2022"});return s.requiresEnrollment}' :
        name.endsWith('login-rewards') ? 'export async function processLoginReward(){globalThis.__loginPerformanceTest.rewards++;return {rewarded:true,streak:4}}' :
        name.endsWith('/actor') ? 'export class AccessError extends Error{}' :
        name.endsWith('/cors') ? 'export function getCorsHeaders(){return {}} export function handleCorsPreflight(){}' :
        name.endsWith('roster/rate-limit') ? 'export async function persistentLimit(){}' :
        name.endsWith('activity-logger') ? 'export async function logActivity(){}' :
        'export const RATE_LIMIT_CONFIG={loginIp:{maxRequests:10,windowMs:1000},loginAccount:{maxRequests:5,windowMs:1000}};export function getClientIp(){return "127.0.0.1"} export async function checkDualRateLimit(){return {allowed:true}} export function createRateLimitResponse(){}'
      }));
    } }],
  });
  const loaded = new Module(path.resolve('tmp/login-performance-memory.cjs'), module);
  loaded.filename = path.resolve('tmp/login-performance-memory.cjs'); loaded.paths = module.paths;
  loaded._compile(built.outputFiles[0].text, loaded.filename);
  const login = (headers = {}, password = 'synthetic-password') => loaded.exports.POST(new Request('http://localhost/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ identifier: 'student@example.invalid', password, instituteCode: 'ics', acceptedPolicies: true }),
  }));
  try {
    let response = await login({ 'X-LMS-Login-Rewards': 'dashboard' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).rewardReceipt, null);
    assert.equal(state.rewards, 0);
    assert.equal(state.sessions, 1); assert.equal(state.enrollments, 1);
    const timing = response.headers.get('server-timing');
    for (const stage of ['account-lookup', 'password-check', 'session-creation', 'enrollment-check', 'total']) assert.match(timing, new RegExp(stage + ';dur=\\d+'));
    assert.ok(!timing.includes('student@example.invalid'));
    response = await login();
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).rewardReceipt, { rewarded: true, streak: 4, expEarned: 10 });
    assert.equal(state.rewards, 1);
    state.requiresEnrollment = true;
    response = await login();
    assert.equal((await response.json()).rewardReceipt, null);
    assert.equal(state.rewards, 1);
    response = await login({ 'X-LMS-Login-Rewards': 'dashboard' }, 'incorrect');
    assert.equal(response.status, 401);
    assert.equal(state.sessions, 3); assert.equal(state.enrollments, 3); assert.equal(state.rewards, 1);
    state.holdSession = true; state.enrollmentError = true;
    let settled = false;
    const pending = login({ 'X-LMS-Login-Rewards': 'dashboard' }).then(result => { settled = true; return result; });
    while (!state.releaseSession) await new Promise(setImmediate);
    assert.equal(settled, false, 'an enrollment failure must not leave cookie creation running after the response');
    const originalError = console.error, logs = [];
    try {
      console.error = (...args) => logs.push(args);
      state.releaseSession();
      assert.equal((await pending).status, 500);
      assert.deepEqual(logs, [['LOGIN_OPERATION_UNAVAILABLE', { stage: 'enrollment-check', code: 'P2022' }]]);
    } finally { console.error = originalError; }
  } finally { delete globalThis.__loginPerformanceTest; }
});
