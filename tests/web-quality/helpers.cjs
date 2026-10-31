const path = require('node:path');
const Module = require('node:module');
const { createRequire } = Module;
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
const webRequire = createRequire(path.resolve('apps/web/package.json'));

async function load(db = {}, session = null, network = null) {
  globalThis.__webQuality = { db, session, network };
  const built = await build({ stdin: { contents: `
    export * from './apps/web/src/lib/course-access';
    export * from './apps/web/src/lib/academic-records';
    export * from './apps/web/src/lib/codelab-moderation';
    export * from './apps/web/src/lib/material-access';
    export * from './apps/web/src/lib/attachment-content';
    export * from './apps/web/src/lib/github/token-vault';
    export * from './apps/web/src/lib/gamification/grant-exp';
    export * from './apps/web/src/lib/gamification/badge-checker';
    export { GET as assignments } from './apps/web/src/app/api/assignments/route';
    export { GET as health } from './apps/web/src/app/api/health/route';
    export { GET as classworkList, POST as createClasswork } from './apps/web/src/app/api/courses/[courseId]/classwork/route';
    export { POST as submit, GET as submissions } from './apps/web/src/app/api/courses/[courseId]/submissions/route';
    export { POST as grade } from './apps/web/src/app/api/courses/[courseId]/submissions/grade/route';
    export { POST as moderate } from './apps/web/src/app/api/codelab/instructor/reject/route';
    export { POST as generate } from './apps/web/src/app/api/flashcards/auto-generate/route';
    export { GET as fileInfo } from './apps/web/src/app/api/flashcards/file-info/route';
    export { POST as webhook } from './apps/web/src/app/api/github/webhooks/route';
    export * as gradebook from './apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/gradebook/actions';
    export * as classwork from './apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/[itemId]/actions';
    export * as instructorClasswork from './apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/actions';
  `, resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', tsconfig: 'apps/web/tsconfig.json',
    plugins: [{ name: 'isolated-boundaries', setup(b) {
      b.onResolve({ filter: /(^|\/)db$|(^|\/)auth-session$|^next\/(server|navigation|cache)$|^@\/lib\/skills$|^node:(https|dns\/promises)$/ }, ({ path: name }) => name.startsWith('node:') && !network ? { path: name, external: true } : { path: name, namespace: 'boundary' });
      b.onLoad({ filter: /.*/, namespace: 'boundary' }, ({ path: name }) => ({ contents:
        name === 'node:https' ? 'export default globalThis.__webQuality.network.https;' :
        name === 'node:dns/promises' ? 'export const lookup=(...args)=>globalThis.__webQuality.network.lookup(...args);' :
        /(^|\/)db$/.test(name) ? 'export const db=globalThis.__webQuality.db;' :
        /auth-session$/.test(name) ? 'export async function getSession(){return globalThis.__webQuality.session;}' :
        name === 'next/server' ? 'export const NextResponse=Response;' :
        name === 'next/navigation' ? "export function redirect(){throw Error('REDIRECT')} export function notFound(){throw Error('NOT_FOUND')}" :
        name === 'next/cache' ? 'export function revalidatePath(){}' : 'export async function executeSkill(name, work){return work();}' }));
    } }],
  });
  const compiled = new Module(path.resolve('tmp/web-quality/bundle.cjs'), module);
  compiled.filename = path.resolve('tmp/web-quality/bundle.cjs');
  compiled.paths = [path.resolve('apps/web/node_modules'), ...module.paths];
  compiled._compile(built.outputFiles[0].text, compiled.filename);
  return compiled.exports;
}
function as(user) { globalThis.__webQuality.session = user ? { user } : null; }
function request(url, body, headers = {}) {
  return new Request('https://lms.example.test' + url, { ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }), headers: { 'Content-Type': 'application/json', ...headers } });
}
module.exports = { load, as, request, webRequire };
