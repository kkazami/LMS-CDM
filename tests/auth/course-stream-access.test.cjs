const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

test('course stream enforces live institute, teaching, and enrollment scope before reading content', async () => {
  const state = { contentReads: 0, role: 'STUDENT', authenticated: true };
  const courses = {
    enrolled: { id: 'enrolled', instituteId: 'ics', instructorId: 'own-teacher', institute: { code: 'ics' } },
    unjoined: { id: 'unjoined', instituteId: 'ics', instructorId: 'other-teacher', institute: { code: 'ics' } },
    foreign: { id: 'foreign', instituteId: 'ite', instructorId: 'other-teacher', institute: { code: 'ite' } },
  };
  state.db = {
    course: { async findUnique({ where }) { return courses[where.id] ?? null; } },
    enrollment: { async findUnique({ where }) { return where.courseId_studentId.courseId === 'enrolled' ? { status: 'APPROVED' } : null; } },
    announcement: { async findMany() { state.contentReads++; return []; } },
    notificationBroadcast: { async findMany() { state.contentReads++; return []; } },
  };
  globalThis.__courseStreamAccessTest = state;
  try {
    const built = await build({
      entryPoints: ['apps/web/src/app/api/courses/[courseId]/stream/route.ts'], bundle: true, write: false,
      platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json', nodePaths: [path.resolve('apps/web/node_modules')],
      plugins: [{ name: 'stream-service-boundaries', setup(b) {
        b.onResolve({ filter: /^next\/server$|^@\/lib\/(db|api-auth|notifications|super-user-v1\/legacy-entry-guard|super-user-v1\/actor)$/ }, ({ path }) => ({ path, namespace: 'mock' }));
        b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path: name }) => ({ contents:
          name === 'next/server' ? 'export const NextResponse=Response;' :
          name.endsWith('/db') ? 'export const db=globalThis.__courseStreamAccessTest.db;' :
          name.endsWith('/api-auth') ? 'export async function getSessionFromRequest(){const s=globalThis.__courseStreamAccessTest;return s.authenticated?{user:{id:s.role==="STUDENT"?"student":"own-teacher",role:s.role,instituteId:"ics"}}:null}' :
          name.endsWith('/actor') ? 'export class AccessError extends Error{constructor(status,message){super(message);this.status=status}}' :
          name.endsWith('legacy-entry-guard') ? 'export async function denyLegacyApi(){return null}' :
          'export async function createNotificationsForCourseStudents(){}'
        }));
      } }],
    });
    const loaded = new Module(path.resolve('tmp/course-stream-access-memory.cjs'), module);
    loaded.filename = path.resolve('tmp/course-stream-access-memory.cjs'); loaded.paths = module.paths;
    loaded._compile(built.outputFiles[0].text, loaded.filename);
    const get = courseId => loaded.exports.GET(new Request('http://localhost/api/courses/' + courseId + '/stream'), { params: Promise.resolve({ courseId }) });
    for (const role of ['STUDENT', 'PROFESSOR', 'ADMIN']) {
      state.role = role;
      assert.equal((await get('enrolled')).status, 200);
      const before = state.contentReads;
      assert.equal((await get('foreign')).status, 404);
      assert.equal((await get('missing')).status, 404);
      if (role !== 'ADMIN') assert.equal((await get('unjoined')).status, 403);
      assert.equal(state.contentReads, before, 'denied course IDs must never reach announcement or broadcast queries');
    }
    state.authenticated = false;
    const before = state.contentReads;
    assert.equal((await get('enrolled')).status, 401);
    assert.equal(state.contentReads, before);
  } finally { delete globalThis.__courseStreamAccessTest; }
});
