import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import type { ClassSchedule, LmsCalendarEvent } from '@lms/types';
import { addDays, classOccurrences, eventOnDay, monthDays, schoolDateKey } from '../../apps/mobile/src/lib/ics-calendar';
import { icsFeaturePath } from '../../apps/mobile/src/lib/ics-features';
import { mobileFeaturePath } from '../../apps/web/src/lib/mobile-feature-path';

test('native calendar uses GMT+8, complete weeks, and inclusive semester boundaries', () => {
  assert.equal(schoolDateKey('2026-09-30T17:00:00Z'), '2026-10-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  const days = monthDays('2026-10-15');
  assert.equal(days.length, 35);
  assert.equal(days[0], '2026-09-27');
  assert.equal(days.at(-1), '2026-10-31');
  const schedule: ClassSchedule = { id: 'course', code: 'CS101', title: 'Computing', room: '309', instructorName: 'Professor', scheduleDays: [4], scheduleStart: '09:00', scheduleEnd: '10:30', scheduleStartDate: '2026-10-01', scheduleEndDate: '2026-10-08', createdAt: '2026-01-01T00:00:00Z' };
  const occurrences = classOccurrences([schedule], days);
  assert.deepEqual(occurrences.map(event => schoolDateKey(event.eventDate)), ['2026-10-01', '2026-10-08']);
  assert.equal(occurrences[0].eventDate, '2026-10-01T01:00:00.000Z');
  assert.equal(occurrences[0].endDate, '2026-10-01T02:30:00.000Z');
  assert.equal(classOccurrences([{ ...schedule, scheduleStartDate: null }], days).length, 0);
  assert.equal(eventOnDay(occurrences[0], '2026-10-01'), true);
  assert.equal(eventOnDay(occurrences[0], '2026-10-02'), false);
  const overnight = { ...occurrences[0], eventDate: '2026-10-01T15:00:00Z', endDate: '2026-10-01T16:00:00Z' };
  assert.equal(eventOnDay(overnight, '2026-10-01'), true);
  assert.equal(eventOnDay(overnight, '2026-10-02'), false);
});

test('instructor tools bootstrap only into their known portal destinations', () => {
  for (const tool of ['create-class', 'archives', 'organization', 'seasons'] as const) {
    const target = icsFeaturePath(tool)!;
    assert.equal(mobileFeaturePath(target), target);
  }
  for (const target of ['/ics/teachers/../../admin', '/ics/courses/archived%2f..', '/ics/organization/unknown', '/ics/manage-leaderboard/foreign', '/ite/teachers']) assert.equal(mobileFeaturePath(target), null);
});

const require = createRequire(path.resolve('package.json'));
const webRequire = createRequire(path.resolve('apps/web/package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));

test('dashboard endpoint scopes data, excludes submitted deadlines, and saves authorized order atomically', async () => {
  const now = Date.now();
  const event = (id: string, offset: number) => ({ id, source: 'classwork', eventDate: new Date(now + offset).toISOString() }) as LmsCalendarEvent;
  const state = {
    user: { id: 'professor', role: 'PROFESSOR', instituteId: 'institute-ics', institute: { code: 'ics' } } as Record<string, unknown> | null,
    denied: false, allowed: 2, writes: [] as unknown[], reads: 0,
    courses: [
      { id: 'first', code: 'CS101', title: 'Computing', instructor: { name: 'Professor' }, _count: { enrollments: 9 } },
      { id: 'second', code: 'SYSADMIN', title: 'Administration', instructor: { name: 'Professor' }, _count: { enrollments: 18 } },
    ],
    calendar: { schedules: [], events: [event('syllabus_late', -86400000), event('syllabus_submitted', -86400000), event('syllabus_next', 86400000), event('syllabus_later', 9 * 86400000)] },
  };
  const db = {
    course: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        state.reads++;
        assert.equal(where.instituteId, 'institute-ics'); assert.equal(where.isArchived, false);
        if (state.user?.role === 'STUDENT') assert.deepEqual(JSON.parse(JSON.stringify(where.enrollments)), { some: { studentId: 'student', status: 'APPROVED' } });
        else assert.equal(where.instructorId, 'professor');
        return state.courses;
      },
      count: async ({ where }: { where: Record<string, unknown> }) => { assert.equal(where.instituteId, 'institute-ics'); return state.allowed; },
    },
    dashboardLayout: { findMany: async () => [{ courseId: 'second', displayOrderIndex: 0 }, { courseId: 'first', displayOrderIndex: 1 }], upsert: (input: unknown) => ({ kind: 'faculty', input }) },
    enrollment: { findMany: async () => [], groupBy: async () => [{ courseId: 'first', _count: { _all: 2 } }], updateMany: (input: unknown) => ({ kind: 'student', input }) },
    syllabusItem: { findMany: async () => [{ courseId: 'second', _count: { submissions: 5 } }] },
    studentSubmission: { findMany: async () => [{ syllabusItemId: 'submitted' }] },
    $transaction: async (writes: unknown[]) => { state.writes.push(writes); return writes; },
  };
  const bundle = await build({ entryPoints: ['apps/web/src/app/api/mobile/dashboard/route.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', tsconfig: 'apps/web/tsconfig.json', external: ['next/server', 'zod'],
    plugins: [{ name: 'dashboard-boundaries', setup(builder: { onResolve: Function; onLoad: Function }) {
      builder.onResolve({ filter: /^@\/lib\// }, ({ path: name }: { path: string }) => ({ path: name, namespace: 'test' }));
      builder.onLoad({ filter: /.*/, namespace: 'test' }, ({ path: name }: { path: string }) => ({ contents:
        name.endsWith('/db') ? 'export const db = globalThis.db;'
          : name.endsWith('/api-auth') ? 'export const getSessionFromRequest = async () => globalThis.state.user ? { user: globalThis.state.user } : null;'
          : name.endsWith('/legacy-entry-guard') ? "export const denyLegacyApi = async () => globalThis.state.denied ? Response.json({}, {status:403}) : null;"
          : name.endsWith('/student-calendar-data') ? 'export const getDashboardCalendar = async () => globalThis.state.calendar;' : '' }));
    } }],
  });
  const module = { exports: {} as { GET: (request: Request) => Promise<Response>; PATCH: (request: Request) => Promise<Response> } };
  vm.runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports, require: webRequire, state, db, Date, Response, Request, URL });
  const get = () => module.exports.GET(new Request('https://lms.example.invalid/api/mobile/dashboard'));
  const patch = (courseIds: unknown) => module.exports.PATCH(new Request('https://lms.example.invalid/api/mobile/dashboard', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ courseIds }) }));
  let response = await get(), payload = await response.json();
  assert.equal(response.status, 200); assert.match(response.headers.get('cache-control')!, /no-store/);
  assert.deepEqual(payload.courses.map((course: { id: string }) => course.id), ['second', 'first']);
  assert.equal(payload.courses[0].pendingWorkCount, 5);
  assert.equal(payload.courses[1].pendingCount, 2);
  assert.equal(payload.courses[0].enrolledCount, 18);
  assert.equal((await patch(['second', 'first'])).status, 200);
  assert.equal(state.writes.length, 1);
  state.user = { id: 'student', role: 'STUDENT', instituteId: 'institute-ics', institute: { code: 'ics' } };
  payload = await (await get()).json();
  assert.equal(payload.overdue, 1); assert.equal(payload.dueSoon, 1);
  assert.equal(payload.pendingAssignments.length, 3);
  assert.equal((await patch(['first', 'second'])).status, 200);
  const written = JSON.stringify(state.writes.at(-1));
  assert.match(written, /studentId.*student/); assert.match(written, /APPROVED/);
  for (const ids of [[], ['first', 'first'], ['../foreign'], 'first']) assert.equal((await patch(ids)).status, 400);
  state.allowed = 1;
  assert.equal((await patch(['first', 'foreign'])).status, 403);
  assert.equal(state.writes.length, 2);
  for (const user of [null, { id: 'admin', role: 'ADMIN', institute: { code: 'ics' } }, { id: 'foreign', role: 'STUDENT', institute: { code: 'ibe' } }]) {
    state.user = user;
    const reads = state.reads;
    assert.equal((await get()).status, 403); assert.equal((await patch(['first'])).status, 403);
    assert.equal(state.reads, reads);
  }
  state.denied = true;
  assert.equal((await patch(['first'])).status, 403);
});
