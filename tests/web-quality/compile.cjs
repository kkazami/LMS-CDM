const path = require('node:path');
const Module = require('node:module');
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
let serial = 0;
async function compile(source, state = {}) {
  const key = '__sprint2_' + serial++;
  globalThis[key] = state;
  const global = `globalThis[${JSON.stringify(key)}]`;
  const bundled = await build({ stdin: { contents: source, resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', tsconfig: 'apps/web/tsconfig.json', plugins: [{ name: 'owned-test-boundaries', setup(b) {
    b.onResolve({ filter: /^@lms\/types$/ }, () => ({ path: path.resolve('packages/types/src/index.ts') }));
    b.onResolve({ filter: /(^|\/)db$|(^|\/)auth-session$|^next\/headers$/ }, ({ path: name }) => /auth-session$/.test(name) && state.realAuth ? null : { path: name, namespace: 'test' });
    b.onLoad({ filter: /.*/, namespace: 'test' }, ({ path: name }) => ({ contents: /(^|\/)db$/.test(name) ? `export const db=${global}.db;` : name === 'next/headers' ? `export async function headers(){return ${global}.headers || new Headers()} export async function cookies(){return ${global}.cookies || {get(){},set(){},delete(){}}}` : `export async function getSession(){return ${global}.session;}` }));
  } }] });
  const mod = new Module(path.resolve('apps/web/__sprint2_test_' + serial + '.cjs'), module);
  mod.filename = path.resolve('apps/web/__sprint2_test_' + serial + '.cjs');
  mod.paths = [path.resolve('apps/web/node_modules'), ...module.paths];
  mod._compile(bundled.outputFiles[0].text, mod.filename);
  return mod.exports;
}
module.exports = { compile };
