const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

async function loadSession(state) {
  const built = await build({
    entryPoints: ['apps/web/src/lib/auth-session.ts'], bundle: true, write: false,
    platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json',
    nodePaths: [path.resolve('apps/web/node_modules')],
    plugins: [{ name: 'session-boundaries', setup(b) {
      b.onResolve({ filter: /^\.\/db$|^next\/headers$|provisioning$/ }, ({ path }) => ({ path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path: name }) => ({ contents:
        name === './db' ? 'export const db = globalThis.__sessionCreationTest.db;' :
        name === 'next/headers' ? 'export async function cookies(){return globalThis.__sessionCreationTest.cookies} export async function headers(){return new Headers()}' :
        'export async function applicationWriterQualified(){return globalThis.__sessionCreationTest.qualified}'
      }));
    } }],
  });
  globalThis.__sessionCreationTest = state;
  const loaded = new Module(path.resolve('tmp/session-creation-memory.cjs'), module);
  loaded.filename = path.resolve('tmp/session-creation-memory.cjs'); loaded.paths = module.paths;
  loaded._compile(built.outputFiles[0].text, loaded.filename);
  return loaded.exports;
}

test('session creation bounds transaction waits, revalidates under lock, and withholds cookies on failure', async () => {
  const state = { qualified: true, events: [], cookiesWritten: 0, cookieChanges: [], inserts: 0 };
  const user = { id: 'synthetic-student', password: 'synthetic-hash', role: 'STUDENT', instituteId: 'ics', credentialProvisioningState: null, isActive: true, activationStatus: 'ACTIVE' };
  state.user = { ...user };
  state.cookies = { set(name, value, options) {
    state.events.push(`cookie:${name}`); state.cookieChanges.push({ name, value, options });
    if (name === 'lumina_session') state.cookiesWritten++;
  } };
  const tx = {
    async $queryRaw(parts) {
      if (parts.join('?').includes('set_config')) { state.events.push('limits'); return []; }
      assert.match(parts.join('?'), /FOR UPDATE/);
      state.events.push('locked-recheck'); return state.user ? [state.user] : [];
    },
    session: { async create() { state.events.push('insert'); state.inserts++; return { id: 'synthetic-session' }; } },
  };
  state.db = { async $transaction(callback, options) {
    assert.deepEqual(options, { maxWait: 5000, timeout: 15000 });
    if (state.error) throw state.error;
    const result = await callback(tx);
    state.events.push('commit'); return result;
  } };
  const session = await loadSession(state);
  const create = () => session.createSession(user.id, undefined, user.password, user);
  try {
    await create();
    assert.deepEqual(state.events, ['limits', 'locked-recheck', 'insert', 'commit', 'cookie:lumina_admin_mfa', 'cookie:lumina_session']);
    assert.equal(state.cookieChanges[0].value, '');
    assert.equal(state.cookieChanges[0].options.maxAge, 0, 'Successful ordinary admission clears stale MFA challenges');
    assert.equal(state.cookieChanges[0].options.path, '/api/auth/mfa');
    assert.equal(state.cookieChanges[1].options.httpOnly, true);
    assert.equal(state.cookieChanges[1].options.path, '/');
    for (const change of [{ password: 'changed' }, { instituteId: 'foreign' }, { role: 'ADMIN' }, { credentialProvisioningState: 'COMPLETE' }, { isActive: false }, { activationStatus: 'PENDING_ACTIVATION' }]) {
      state.user = { ...user, ...change };
      await assert.rejects(create(), error => error instanceof session.SessionAdmissionError && [401, 403].includes(error.status));
      assert.equal(state.inserts, 1); assert.equal(state.cookiesWritten, 1);
      assert.equal(state.cookieChanges.length, 2, 'Failed admission must not write either cookie');
    }
    state.user = { ...user };
    for (const error of [
      { code: 'P2028' }, { code: 'P2024' }, { code: 'P2034' },
      { code: 'P2010', meta: { code: '55P03' } },
      { code: 'P2010', meta: { driverAdapterError: { cause: { originalCode: '57014' } } } },
    ]) {
      state.error = error;
      await assert.rejects(create(), failure => failure instanceof session.SessionAdmissionError && failure.status === 503 && failure.retryAfterSeconds === 5);
      assert.equal(state.inserts, 1); assert.equal(state.cookiesWritten, 1);
      assert.equal(state.cookieChanges.length, 2, 'Failed transactions must not write either cookie');
    }
    state.error = Object.assign(new Error('synthetic unexpected database error'), { code: 'P2022' });
    await assert.rejects(create(), error => error === state.error);
    assert.equal(state.cookiesWritten, 1);
    assert.equal(state.cookieChanges.length, 2);
  } finally { delete globalThis.__sessionCreationTest; }
});
