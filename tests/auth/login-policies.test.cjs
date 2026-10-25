const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

test('login rejects missing, false, and coerced policy acknowledgements before account lookup or session creation', async () => {
  const built = await build({
    entryPoints: ['apps/web/src/app/api/auth/login/route.ts'], bundle: true, write: false,
    platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json',
    nodePaths: [path.resolve('apps/web/node_modules')],
    plugins: [{ name: 'service-boundaries', setup(b) {
      b.onResolve({ filter: /^\.\/db$|^next\/server$|^bcryptjs$|^@\/lib\/(db|auth-session|gamification\/login-rewards|rate-limit|cors|roster\/rate-limit|super-user-v1\/actor|ite\/activity-logger)$/ }, ({ path }) => ({ path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path: name }) => ({ contents:
        name === 'next/server' ? 'export const NextResponse=Response; export const after=(fn)=>{Promise.resolve().then(fn).catch(()=>{});};' :
        name === 'bcryptjs' ? 'export async function compare(){throw Error("Unexpected password check")}' :
        name.endsWith('/db') ? 'export const db={user:{async findMany(){globalThis.__cdmPolicyLookups++; return []}}};' :
        name.endsWith('auth-session') ? 'export class SessionAdmissionError extends Error{} export async function createSession(){throw Error("Unexpected session creation")}' :
        name.endsWith('/actor') ? 'export class AccessError extends Error{}' :
        name.endsWith('login-rewards') ? 'export async function processLoginReward(){}' :
        name.endsWith('/cors') ? 'export function getCorsHeaders(){return {"Access-Control-Allow-Origin":"https://lms.example.invalid"}} export function handleCorsPreflight(){}' :
        name.endsWith('roster/rate-limit') ? 'export async function persistentLimit(){}' :
        name.endsWith('activity-logger') ? 'export const logActivity = async () => {};' :
        'export const RATE_LIMIT_CONFIG={loginIp:{maxRequests:10,windowMs:1000},loginAccount:{maxRequests:5,windowMs:1000}}; export function getClientIp(){return "127.0.0.1"} export async function checkDualRateLimit(){return {allowed:true}} export function createRateLimitResponse(){}'
      }));
    } }],
  });
  const loaded = new Module(path.resolve('tmp/login-policies-built.cjs'), module);
  loaded.filename = path.resolve('tmp/login-policies-built.cjs'); loaded.paths = module.paths;
  loaded._compile(built.outputFiles[0].text, loaded.filename);
  globalThis.__cdmPolicyLookups = 0;
  const attempt = (acceptance) => loaded.exports.POST(new Request('http://localhost/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'synthetic@example.invalid', password: 'Synthetic-Only-12345', instituteCode: 'ics', ...acceptance }),
  }));
  for (const acceptance of [{}, { acceptedPolicies: false }, { acceptedPolicies: 'true' }, { acceptedPolicies: 1 }, { acceptedPolicies: null }]) {
    const response = await attempt(acceptance);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://lms.example.invalid');
    const body = await response.json();
    assert.match(body.message, /Terms and Conditions.*Privacy Policy/);
    assert.ok(body.errors.acceptedPolicies.length);
    assert.equal(globalThis.__cdmPolicyLookups, 0);
  }
  // Acknowledgement alone is insufficient: the request must still authenticate.
  const response = await attempt({ acceptedPolicies: true });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(globalThis.__cdmPolicyLookups, 1);
  delete globalThis.__cdmPolicyLookups;
});
