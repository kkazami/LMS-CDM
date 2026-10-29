const path = require('node:path');
const Module = require('node:module');
const { createRequire } = Module;
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
const webRequire = createRequire(path.resolve('apps/web/package.json'));

// Identity injection is deliberately limited to tests. Course/role/resource guards remain real.
async function load(db = {}) {
  globalThis.__labTest = { db, session: null };
  const built = await build({
    stdin: { contents: `
      export * from './apps/web/src/lib/labs/service';
      export * from './apps/web/src/lib/labs/schema';
      export * from './apps/web/src/lib/labs/readiness';
      export { visibleSyllabusForms } from './apps/web/src/lib/forms/visibility';
      export { readGradebook } from './apps/web/src/lib/gradebook-data';
      export * from './apps/web/src/lib/labs/access';
      export { handleLabRequest } from './apps/web/src/lib/labs/http';
      export { GET as readTodo } from './apps/web/src/app/api/todo/route';
      export { GET as readAssignments } from './apps/web/src/app/api/assignments/route';
      export { getDashboardCalendar } from './apps/web/src/lib/student-calendar-data';
      export * from './apps/web/src/lib/labs/mysql';
      export { LAB_PRESET_OPTIONS } from './apps/web/src/lib/labs/preset-catalog';
      export * from './apps/web/src/lib/academic-task';
      export * from './apps/web/src/lib/academic-records';
      export { boundedUploadBody, verifiedFileType, scanUpload, readPrivateUpload, requireOwnedUpload } from './apps/web/src/lib/private-upload';
    `, resolveDir: process.cwd() },
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', tsconfig: 'apps/web/tsconfig.json',
    plugins: [{ name: 'test-boundaries', setup(builder) {
      builder.onResolve({ filter: /(^|\/)db$|(^|\/)auth-session$|^next\/(server|navigation|cache)$/ }, ({ path: name }) => ({ path: name, namespace: 'boundary' }));
      builder.onLoad({ filter: /.*/, namespace: 'boundary' }, ({ path: name }) => ({ contents:
        /(^|\/)db$/.test(name) ? 'export const db=globalThis.__labTest.db;' :
        /auth-session$/.test(name) ? 'export async function getSession(){return globalThis.__labTest.session;}' :
        name === 'next/server' ? 'export const NextResponse=Response;' :
        name === 'next/navigation' ? "export function redirect(){throw Error('REDIRECT')} export function notFound(){throw Error('NOT_FOUND')}" :
        'export function revalidatePath(){}' }));
    } }],
  });
  const compiled = new Module(path.resolve('apps/web/__lab_test_services.cjs'), module);
  compiled.filename = path.resolve('apps/web/__lab_test_services.cjs');
  compiled.paths = [path.resolve('apps/web/node_modules'), ...module.paths];
  compiled._compile(built.outputFiles[0].text, compiled.filename);
  return compiled.exports;
}

function as(user) { globalThis.__labTest.session = user ? { user } : null; }
module.exports = { load, as, webRequire };
