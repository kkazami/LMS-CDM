const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

async function load(f) {
  globalThis.__navigationTest = f;
  const built = await build({
    stdin: { contents: `
      export {default as analytics} from './apps/web/src/app/(dashboard)/[institute]/analytics/page';
      export {default as manage} from './apps/web/src/app/(dashboard)/[institute]/manage-leaderboard/page';
      export {default as leaderboards} from './apps/web/src/app/(dashboard)/[institute]/leaderboards/page';
      export {GET as risk} from './apps/web/src/app/api/analytics/at-risk/route';
    `, resolveDir: process.cwd() },
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    tsconfig: 'apps/web/tsconfig.json', nodePaths: [path.resolve('apps/web/node_modules')],
    plugins: [{ name: 'service-boundaries', setup(b) {
      b.onResolve({ filter: /^next\/(server|navigation)$|^@\/lib\/(db|auth-session|api-auth|get-institute-theme|super-user-v1\/legacy-entry-guard)$|^\.\/client$/ }, ({ path }) => ({ path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path: name }) => ({ contents:
        name === 'next/server' ? 'export const NextResponse=Response;' :
        name === 'next/navigation' ? 'export function redirect(url){throw new Error("REDIRECT:"+url)}' :
        name.endsWith('/db') ? 'export const db=globalThis.__navigationTest.db;' :
        name.endsWith('/auth-session') ? 'export async function getSession(){throw new Error("DUPLICATE_AUTH_READ")}' :
        name.endsWith('/api-auth') ? 'export async function getSessionFromRequest(){return {user:globalThis.__navigationTest.user}}' :
        name.endsWith('legacy-entry-guard') ? 'export async function denyLegacyApi(){return null} export async function requireLegacyActor(){globalThis.__navigationTest.authReads++;return globalThis.__navigationTest.user}' :
        name.endsWith('get-institute-theme') ? 'export function getInstituteTheme(){return {code:"ics"}}' :
        'export default function Client(){return null}'
      }));
    } }],
  });
  const loaded = new Module(path.resolve('tmp/navigation-data-built.cjs'), module);
  loaded.filename = path.resolve('tmp/navigation-data-built.cjs'); loaded.paths = module.paths;
  loaded._compile(built.outputFiles[0].text, loaded.filename);
  return loaded.exports;
}
const user = () => ({ id: 'teacher', instituteId: 'ics', role: 'PROFESSOR', institute: { id: 'ics', code: 'ics' } });
const params = () => ({ params: Promise.resolve({ institute: 'ics' }), searchParams: Promise.resolve({}) });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise(resolve => setImmediate(resolve));

test('analytics reuses the authenticated instructor and institute, and rejects another portal', async () => {
  const f = { user: user(), authReads: 0, db: { course: { findMany: async ({ where }) => {
    assert.equal(where.instructorId, 'teacher'); assert.equal(where.instituteId, 'ics'); return [];
  } } } };
  const api = await load(f);
  await api.analytics(params()); assert.equal(f.authReads, 1);
  await assert.rejects(api.analytics({ params: Promise.resolve({ institute: 'ite' }) }), /REDIRECT/);
});

test('management starts independent reads together, then loads enrolled students and classwork together', async () => {
  const first = deferred(), second = deferred(), started = [];
  const read = (name, gate) => async () => { started.push(name); return gate.promise; };
  const f = { user: user(), authReads: 0, db: {
    course: { findMany: read('courses', first) }, gradeIncentiveRule: { findMany: read('rules', first) },
    expTransaction: { findMany: read('logs', first) }, enrollment: { findMany: read('students', second) },
    syllabusItem: { findMany: read('activities', second) },
  } };
  const api = await load(f), rendering = api.manage(params());
  await tick(); assert.deepEqual(started.sort(), ['courses', 'logs', 'rules']);
  first.resolve([]); await tick(); assert.ok(started.includes('students') && started.includes('activities'));
  second.resolve([]); const result = await rendering;
  assert.equal(f.authReads, 1); assert.deepEqual(result.props.initialActivities, []);
});

test('leaderboards load profiles, authorized classes and published activities in one parallel batch', async () => {
  const gate = deferred(), started = [];
  const read = name => async () => { started.push(name); return gate.promise; };
  const f = { user: user(), authReads: 0, db: {
    course: { findMany: read('courses') }, gamificationProfile: { findMany: read('profiles') }, syllabusItem: { findMany: read('activities') },
  } };
  const api = await load(f), rendering = api.leaderboards(params());
  await tick(); assert.deepEqual(started.sort(), ['activities', 'courses', 'profiles']);
  gate.resolve([]); await rendering; assert.equal(f.authReads, 1);
});

test('risk metrics load concurrently and every read enforces the instructor and institute scope', async () => {
  const gate = deferred(), scopes = [];
  const f = { user: user(), authReads: 0, db: {
    enrollment: { findMany: async ({ where }) => { scopes.push(where.course); return gate.promise; } },
    syllabusItem: { findMany: async ({ where }) => { scopes.push(where.course); return gate.promise; } },
    studentSubmission: { findMany: async ({ where }) => { scopes.push(where.syllabusItem.course); return gate.promise; } },
  } };
  const api = await load(f), request = new Request('http://localhost/api/analytics/at-risk?courseId=selected-class');
  const response = api.risk(request); await tick();
  assert.equal(scopes.length, 3);
  for (const scope of scopes) assert.deepEqual(scope, { instituteId: 'ics', isArchived: false, instructorId: 'teacher', id: 'selected-class' });
  gate.resolve([]); assert.equal((await response).status, 200);
  f.user.role = 'STUDENT'; assert.equal((await api.risk(request)).status, 403); assert.equal(scopes.length, 3);
});
