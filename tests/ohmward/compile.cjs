const path = require('node:path');
const Module = require('node:module');
const { createRequire } = Module;
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
const webRequire = createRequire(path.resolve('apps/web/package.json'));

async function compile(db) {
  const boundary = { db };
  const built = await build({ stdin: { contents: `export * from './apps/web/src/features/interactive-activities/ohmward/server/service'; export * from './apps/web/src/features/interactive-activities/ohmward/server/http'; export * from './apps/web/src/features/interactive-activities/ohmward/server/access'; export * from './apps/web/src/features/interactive-activities/ohmward/server/grading';`, resolveDir: process.cwd() },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', tsconfig: 'apps/web/tsconfig.json', plugins: [{ name: 'owned-database-and-session', setup(builder) {
      builder.onResolve({ filter: /(^|\/)db$/ }, args => ({ path: args.path, namespace: 'ohm-boundary' }));
      builder.onLoad({ filter: /.*/, namespace: 'ohm-boundary' }, () => ({ contents: 'export const db=globalThis.__ohmBoundary.db;' }));
    } }] });
  globalThis.__ohmBoundary = boundary;
  const compiled = new Module(path.resolve('apps/web/__ohmward_owned_test.cjs'), module); compiled.filename = path.resolve('apps/web/__ohmward_owned_test.cjs'); compiled.paths = [path.resolve('apps/web/node_modules'), ...module.paths]; compiled._compile(built.outputFiles[0].text, compiled.filename);
  return compiled.exports;
}
module.exports = { compile, webRequire };
