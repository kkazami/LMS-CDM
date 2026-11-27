const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

async function load(f) {
  globalThis.__navigationTest = f;
  const built = await build({
    stdin: { contents: `
      export {default as layout} from './apps/web/src/app/(dashboard)/[institute]/layout';
      export {default as analytics} from './apps/web/src/app/(dashboard)/[institute]/analytics/page';
      export {default as manage} from './apps/web/src/app/(dashboard)/[institute]/manage-leaderboard/page';
      export {default as leaderboards} from './apps/web/src/app/(dashboard)/[institute]/leaderboards/page';
      export {GET as risk} from './apps/web/src/app/api/analytics/at-risk/route';
    `, resolveDir: process.cwd() },
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    tsconfig: 'apps/web/tsconfig.json', nodePaths: [path.resolve('apps/web/node_modules')],
    plugins: [{ name: 'service-boundaries', setup(b) {
      b.onResolve({ filter: /^next\/(server|navigation)$|^@\/lib\/(db|auth-session|api-auth|get-institute-theme|gamification\/login-rewards|super-user-v1\/legacy-entry-guard)$|^@\/components\/(layout\/DashboardLayout|super-user-v1\/SuperUserShell)$|^\.\/(client|db)$/ }, ({ path }) => ({ path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path: name }) => ({ contents:
        name === 'next/server' ? 'export const NextResponse=Response;' :
        name === 'next/navigation' ? 'export function redirect(url){throw new Error("REDIRECT:"+url)} export function notFound(){throw new Error("NOT_FOUND")}' :
        name.endsWith('/db') ? 'export const db=globalThis.__navigationTest.db;' :
        name.endsWith('/auth-session') ? 'export async function getSession(){if(globalThis.__navigationTest.session)return globalThis.__navigationTest.session;throw new Error("DUPLICATE_AUTH_READ")}' :
        name.endsWith('/api-auth') ? 'export async function getSessionFromRequest(){return {user:globalThis.__navigationTest.user}}' :
        name.endsWith('legacy-entry-guard') ? 'export async function denyLegacyApi(){return null} export async function requireLegacyActor(){globalThis.__navigationTest.authReads++;return globalThis.__navigationTest.user}' :
        name.endsWith('get-institute-theme') ? 'export function getInstituteTheme(){return {code:"ics"}}' :
        name.endsWith('login-rewards') ? 'export const getPHTDateString=date=>date?.toISOString() ?? "today";export const getPHTMidnight=()=>new Date(0);export const processLoginReward=()=>globalThis.__navigationTest.reward()' :
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

test('dashboard starts sidebar reads alongside rewards and lets rewards finish even if the sidebar fails', async () => {
  const reads = [];
  let grant = deferred(), failSidebar = false;
  const student = { ...user(), id: 'student', role: 'STUDENT' };
  const f = { session: { user: student }, reward: async () => { reads.push('grant'); await grant.promise; }, db: {
    enrollment: {
      findFirst: async () => ({ id: 'approved' }),
      findMany: async () => {
        reads.push('sidebar');
        if (failSidebar) throw new Error('Sidebar unavailable');
        return [{ course: { id: 'course', code: 'CS101', title: 'Computing' } }];
      },
    },
    gamificationProfile: { findUnique: async () => {
      const refreshed = reads.includes('grant');
      reads.push('profile');
      return { exp: refreshed ? 20 : 0, loginStreakCurrent: refreshed ? 1 : 0, lastDailyRewardAt: null };
    } },
    expTransaction: { aggregate: async () => { reads.push('daily-exp'); return { _sum: { amount: 20 } }; } },
  } };
  const api = await load(f), rendering = api.layout(params());
  try {
    await tick();
    assert.deepEqual([...reads].sort(), ['grant', 'profile', 'sidebar']);
  } finally {
    grant.resolve();
  }
  const result = await rendering;
  assert.equal(reads.at(-1), 'daily-exp');
  assert.equal(result.props.exp, 20);
  assert.equal(result.props.loginRewardExp, 20);
  assert.equal(result.props.enrolledCourses[0].id, 'course');

  grant = deferred();
  failSidebar = true;
  reads.length = 0;
  let settled = false;
  const rejection = assert.rejects(api.layout(params()).finally(() => { settled = true; }), /Sidebar unavailable/);
  try {
    await tick();
    assert.equal(settled, false);
  } finally {
    grant.resolve();
  }
  await rejection;
  assert.equal(reads.at(-1), 'daily-exp');
});

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

test('risk metrics page students and load all of their scoped enrollments before reading activities', async () => {
  const students = deferred(), items = deferred(), submissions = deferred(), reads = [];
  const scope = { instituteId: 'ics', isArchived: false, instructorId: 'teacher', id: 'selected-class' };
  const f = { user: user(), authReads: 0, db: {
    user: {
      findMany: async query => { reads.push(['students', query]); return students.promise; },
      count: async query => { reads.push(['count', query]); await students.promise; return 1; },
    },
    syllabusItem: { findMany: async query => { reads.push(['items', query]); return items.promise; } },
    studentSubmission: { findMany: async query => { reads.push(['submissions', query]); return submissions.promise; } },
  } };
  const api = await load(f), request = new Request('http://localhost/api/analytics/at-risk?courseId=selected-class');
  const response = api.risk(request); await tick();
  const enrollmentScope = { status: 'APPROVED', course: scope };
  assert.deepEqual(reads.map(([name]) => name), ['students', 'count']);
  for (const [, query] of reads) assert.deepEqual(query.where, { enrollments: { some: enrollmentScope } });
  assert.deepEqual(reads[0][1].select.enrollments.where, enrollmentScope);
  assert.deepEqual(reads[0][1].orderBy, [{ name: 'asc' }, { id: 'asc' }]);
  assert.equal(reads[0][1].take, 50); assert.equal(reads[0][1].skip, 0);
  students.resolve([{
    id: 'student-a', name: 'Dummy student', email: 'dummy@example.invalid', avatarUrl: null,
    enrollments: [{ course: { id: 'selected-class', title: 'Dummy course', code: 'DUMMY' } }],
  }]);
  await tick(); assert.equal(reads.length, 3);
  assert.deepEqual(reads[2][1].where, { courseId: { in: ['selected-class'] }, course: scope });
  assert.equal(reads[2][1].take, 2001);
  items.resolve([{ id: 'activity-a', title: 'Dummy work', type: 'ASSIGNMENT', dueDate: null, maxPoints: 10, courseId: 'selected-class' }]);
  await tick(); assert.equal(reads.length, 4);
  assert.deepEqual(reads[3][1].where, { studentId: { in: ['student-a'] }, syllabusItemId: { in: ['activity-a'] } });
  submissions.resolve([]);
  const result = await response; assert.equal(result.status, 200);
  const body = await result.json();
  assert.deepEqual(body.pagination, { page: 1, total: 1, totalPages: 1, pageSize: 50 });
  assert.deepEqual(body.atRiskStudents.map(row => [row.studentId, row.courseId]), [['student-a', 'selected-class']]);
  f.user.role = 'STUDENT'; assert.equal((await api.risk(request)).status, 403); assert.equal(reads.length, 4);
});

test('one student page contains both subjects and reports the total number of students', async () => {
  const courses = [
    { id: 'computing', title: 'Computing', code: 'CS101' },
    { id: 'systems', title: 'Systems', code: 'SYSADMIN' },
  ];
  const f = { user: user(), authReads: 0, db: {
    user: {
      findMany: async ({ skip, take }) => {
        assert.equal(skip, 50);
        assert.equal(take, 50);
        return [{ id: 'student-a', name: 'Sample Student', email: 'student@example.invalid', enrollments: courses.map(course => ({ course })) }];
      },
      count: async () => 51,
    },
    syllabusItem: { findMany: async () => [{
      id: 'quiz', title: 'Quiz 2', type: 'QUIZ', dueDate: null,
      maxPoints: 2, courseId: 'systems', form: { id: 'form' },
    }] },
    studentSubmission: { findMany: async () => [{
      id: 'submission', studentId: 'student-a', syllabusItemId: 'quiz',
      grade: 50, status: 'SUBMITTED',
    }] },
  } };
  const api = await load(f);
  const response = await api.risk(new Request('http://localhost/api/analytics/at-risk?page=2'));
  assert.equal(response.status, 200);
  const { pagination, atRiskStudents } = await response.json();
  assert.deepEqual(pagination, { page: 2, total: 51, totalPages: 2, pageSize: 50 });
  assert.deepEqual(atRiskStudents.map(row => [row.studentId, row.courseId, row.riskLevel]), [
    ['student-a', 'systems', 'HIGH'],
    ['student-a', 'computing', 'LOW'],
  ]);
  assert.equal(atRiskStudents[0].details.gradeAverage, 50);
});
