const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

test('login logs the failure stage and code without exposing credentials or database details', async () => {
  const built = await build({
    entryPoints: ['apps/web/src/app/api/auth/login/route.ts'], bundle: true, write: false,
    platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json',
    nodePaths: [path.resolve('apps/web/node_modules')],
    plugins: [{ name: 'service-boundaries', setup(b) {
      b.onResolve({ filter: /^\.\/db$|^next\/server$|^bcryptjs$|^@\/lib\/(db|auth-session|gamification\/login-rewards|rate-limit|cors|roster\/rate-limit|super-user-v1\/actor|ite\/activity-logger)$/ }, ({ path }) => ({ path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path: name }) => ({ contents:
        name === 'next/server' ? 'export const NextResponse=Response; export const after=(fn)=>{Promise.resolve().then(fn).catch(()=>{});};' :
        name === 'bcryptjs' ? 'export async function compare(){return true;}' :
        name.endsWith('/db') ? 'export const db={user:{findMany(){throw Object.assign(new Error("database-secret"),{code:"P2022"})}}};' :
        name.endsWith('auth-session') ? 'export class SessionAdmissionError extends Error{} export async function createSession(){}' :
        name.endsWith('/actor') ? 'export class AccessError extends Error{}' :
        name.endsWith('login-rewards') ? 'export async function processLoginReward(){}' :
        name.endsWith('/cors') ? 'export function getCorsHeaders(){return {}} export function handleCorsPreflight(){}' :
        name.endsWith('roster/rate-limit') ? 'export async function persistentLimit(){}' :
        name.endsWith('activity-logger') ? 'export const logActivity = async () => {};' :
        'export const RATE_LIMIT_CONFIG={loginIp:{maxRequests:10,windowMs:1000},loginAccount:{maxRequests:5,windowMs:1000}}; export function getClientIp(){return "127.0.0.1"} export async function checkDualRateLimit(){return {allowed:true}} export function createRateLimitResponse(){}'
      }));
    } }],
  });
  const loaded = new Module(path.resolve('tmp/login-diagnostics-built.cjs'), module);
  loaded.filename = path.resolve('tmp/login-diagnostics-built.cjs'); loaded.paths = module.paths;
  loaded._compile(built.outputFiles[0].text, loaded.filename);
  const logs = [], original = console.error;
  let response;
  try {
    console.error = (...args) => logs.push(args);
    response = await loaded.exports.POST(new Request('http://localhost/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'private@example.invalid', password: 'private-password', instituteCode: 'ics', acceptedPolicies: true }),
    }));
  } finally { console.error = original; }
  assert.equal(response.status, 500);
  assert.deepEqual(logs, [['LOGIN_OPERATION_UNAVAILABLE', { stage: 'account-lookup', code: 'P2022' }]]);
  const output = JSON.stringify(logs) + await response.text();
  for (const secret of ['private@example.invalid', 'private-password', 'database-secret']) assert.ok(!output.includes(secret));
});
