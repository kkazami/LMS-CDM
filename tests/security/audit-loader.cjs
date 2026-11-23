// Loads TypeScript routes without platform-specific esbuild/SWC binaries.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { AsyncLocalStorage } = require('node:async_hooks');
const ts = require('typescript');
const context = new AsyncLocalStorage();
const root = process.cwd();
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, parent, ...args) {
  if (name.startsWith('@/')) name = path.join(root, 'apps/web/src', name.slice(2));
  if (name === '@lms/types') name = path.join(root, 'packages/types/src/index.ts');
  return resolve.call(this, name, parent, ...args);
};
for (const extension of ['.ts', '.tsx']) Module._extensions[extension] = (mod, file) => {
  const source = fs.readFileSync(file, 'utf8');
  mod._compile(ts.transpileModule(source, { fileName: file, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, file);
};
const load = Module._load;
const realServer = require(path.join(root, 'apps/web/node_modules/next/server'));
const provider = {
  CodeRunnerUnavailableError: class CodeRunnerUnavailableError extends Error {},
  async executeJudge0Submission() {
    provider.calls++;
    return { status: { id: 3, description: 'Accepted' }, stdout: 'fixture-output', time: '0.001' };
  },
  calls: 0,
};
Module._load = function (name, parent, isMain) {
  if (name === 'next/headers') return {
    async headers() { return context.getStore().headers; },
    async cookies() { return context.getStore().cookies; },
  };
  if (name === 'next/server') return { ...realServer, after() {} };
  if (name.endsWith('/codelab/utils/judge0-config')) return provider;
  // Rewards are outside the grade/authorization boundary; no external work runs.
  if (name.endsWith('/gamification/engine')) return { async processGamificationEvent() {} };
  return load.call(this, name, parent, isMain);
};
globalThis.fetch = async () => { throw new Error('External fetch forbidden by audit fixture'); };
async function invoke(handler, token, url, method = 'GET', body, params = {}, options = {}) {
  const headers = new Headers({ authorization: `Bearer ${token}`, host: 'localhost:3000',
    origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' });
  for (const [name, value] of Object.entries(options.headers || {})) headers.set(name, value);
  const jar = options.cookieJar;
  const visible = name => {
    const row = jar?.get(name);
    if (!row || !new URL(url, 'http://localhost:3000').pathname.startsWith(row.options?.path || '/')) return undefined;
    return { name, value: row.value };
  };
  if (jar) headers.set('cookie', [...jar.keys()].map(visible).filter(Boolean).map(row => `${row.name}=${row.value}`).join('; '));
  const cookieStore = {
    get: visible,
    set(name, value, attributes = {}) { if (!jar) return; if (attributes.maxAge === 0) jar.delete(name); else jar.set(name, { value, options: attributes }); },
    delete(name) { jar?.delete(name); },
  };
  const request = new Request(`http://localhost:3000${url}`, {
    method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return context.run({ headers: request.headers, cookies: cookieStore },
    () => handler(request, { params: Promise.resolve(params) }));
}
module.exports = { invoke, provider };
