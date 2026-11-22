const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

// This suite tests export auditing only. Existing authorization/read boundaries are
// explicit doubles; it does not revalidate session, MFA or database isolation.
async function load(state) {
  globalThis.__exportAuditTest = state;
  const result = await build({
    entryPoints: ['apps/web/src/app/api/admin/database/export/route.ts'],
    bundle: true, write: false, platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json',
    plugins: [{ name: 'export-audit-boundaries', setup(b) {
      b.onResolve({ filter: /^next\/server$|^@\/lib\/(admin-database|db|super-user-v1\/actor)$/ }, ({ path: name }) => ({ path: name, namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => ({ contents:
        name === 'next/server' ? 'export const NextResponse = Response;' :
        name === '@/lib/db' ? 'export const db={auditLog:{create: async args=>globalThis.__exportAuditTest.write(args)}};' :
        name.endsWith('/admin-database') ? `export async function databaseAdministrator(){const s=globalThis.__exportAuditTest;if(s.denial)throw Object.assign(new Error('Denied'),{status:s.denial});return {id:'dummy-admin',instituteId:'dummy-institute'}}
          export async function databaseRows(model,instituteId,take){const s=globalThis.__exportAuditTest;s.reads.push({model,instituteId,take});if(s.readError)throw new Error('DUMMY_PRIVATE_QUERY_DETAIL');return {rows:s.rows,totalCount:10000}}` :
        `export class AccessError extends Error{constructor(status,message){super(message);this.status=status}}
          export function accountErrorResponse(error){return Response.json({message:error.status?'Denied':'Operation unavailable.'},{status:error.status||503})}`,
      }));
    } }],
  });
  const compiled = new Module(path.resolve('tmp/export-audit-tests.cjs'), module);
  compiled.filename = path.resolve('tmp/export-audit-tests.cjs'); compiled.paths = module.paths;
  compiled._compile(result.outputFiles[0].text, compiled.filename);
  return compiled.exports;
}
const request = () => new Request('https://lms.example.invalid/api/admin/database/export?model=User&ignored=DUMMY_QUERY_SECRET', {
  headers: { authorization: 'Bearer DUMMY_CREDENTIAL', cookie: 'lumina_session=DUMMY_COOKIE', 'user-agent': 'DUMMY_AGENT' },
});
function fixture(rows = [{ id: 'dummy-student', name: 'DUMMY_STUDENT_NAME', email: 'dummy@example.invalid', bio: 'DUMMY_PRIVATE_RECORD_CONTENT' }]) {
  const state = { rows, events: [], reads: [] };
  state.write = async args => { state.events.push(args); return { id: 'dummy-event' }; };
  return state;
}

test('export logs exactly allowlisted metadata and preserves the download response', async () => {
  const state = fixture(), { GET } = await load(state);
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('content-disposition'), 'attachment; filename="user_export.json"');
  assert.deepEqual(await response.json(), state.rows);
  assert.deepEqual(state.reads, [{ model: 'User', instituteId: 'dummy-institute', take: 500 }]);
  assert.equal(state.events.length, 1);
  assert.deepEqual(state.events[0], { data: {
    adminId: 'dummy-admin', targetId: 'dummy-admin', action: 'DATABASE_TABLE_EXPORTED',
    metadata: JSON.stringify({ instituteId: 'dummy-institute', model: 'User', recordsExported: 1, limit: 500, format: 'json', outcome: 'PREPARED' }),
  } });
  const logged = JSON.stringify(state.events);
  for (const forbidden of ['dummy-student', 'DUMMY_STUDENT_NAME', 'dummy@example.invalid', 'DUMMY_PRIVATE_RECORD_CONTENT', 'DUMMY_QUERY_SECRET', 'DUMMY_CREDENTIAL', 'DUMMY_COOKIE', 'DUMMY_AGENT']) assert.ok(!logged.includes(forbidden));
});
test('export waits for audit persistence and releases no records when it fails', async () => {
  const state = fixture(); let release;
  state.write = () => new Promise(resolve => { release = resolve; });
  const { GET } = await load(state); let settled = false;
  const pending = GET(request()).then(value => { settled = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof release, 'function'); assert.equal(settled, false);
  release({ id: 'dummy-event' }); assert.equal((await pending).status, 200);
  state.write = async () => { throw new Error('DUMMY_PRIVATE_DATABASE_DIAGNOSTIC'); };
  const failed = await GET(request()); assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { message: 'Operation unavailable.' });
  assert.equal(failed.headers.get('content-disposition'), null);
});
test('empty exports are counted and denied/read-failed requests emit no success event', async () => {
  const state = fixture([]), { GET } = await load(state);
  assert.equal((await GET(request())).status, 200);
  assert.equal(JSON.parse(state.events[0].data.metadata).recordsExported, 0);
  state.events.length = 0;
  for (const status of [401, 403]) { state.denial = status; assert.equal((await GET(request())).status, status); }
  state.denial = 0; state.readError = true; assert.equal((await GET(request())).status, 503);
  assert.equal(state.events.length, 0);
});
