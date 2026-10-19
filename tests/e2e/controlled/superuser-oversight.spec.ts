import { test, expect, APIRequestContext } from '@playwright/test';
import * as fs from 'node:fs';
import { Client } from 'pg';
import { createHash } from 'node:crypto';

interface Fixture {
  baseURL: string;
  accounts: Record<'SUPER_USER' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'INACTIVE_USER' | 'FOREIGN_INSTRUCTOR', { id: string; token: string }>;
  courses: Record<'ics' | 'ibe' | 'ite', { id: string; title: string }>;
  sensitiveMarkers: string[];
  mutationCases: { path: string; method: 'POST' | 'PATCH' | 'DELETE'; body?: unknown }[];
}
const fixtureFile = process.env.HARNESS_LMS_FIXTURE_PATH;
if (!fixtureFile) throw new Error('Controlled LMS tests require explicit host-owned disposable fixture configuration');
const fixture = JSON.parse(fs.readFileSync(fixtureFile, 'utf8')) as Fixture;
const origin = new URL(fixture.baseURL);
if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname)) throw new Error('Controlled LMS tests require the isolated loopback server');
const header = (role: keyof Fixture['accounts']) => ({ Authorization: `Bearer ${fixture.accounts[role].token}` });
const overview = (institute: string) => `${fixture.baseURL}/api/academic-oversight/${institute}/courses`;
const supervision = (institute: string, course: string) => `${overview(institute)}/${encodeURIComponent(course)}`;
async function database<T>(action: (client: Client) => Promise<T>): Promise<T> {
  const value = process.env.HARNESS_TEST_DATABASE_URL; if (!value) throw new Error('Host-owned disposable database configuration required');
  const url = new URL(value); if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || !/^\/harness_[a-zA-Z0-9_]+$/.test(url.pathname) || url.search) throw new Error('Refuse a non-disposable database');
  const client = new Client({ connectionString: value }); await client.connect(); try { return await action(client); } finally { await client.end(); }
}
async function teachingFingerprint(): Promise<string> {
  return database(async client => {
    const ids = Object.values(fixture.courses).map(course => course.id);
    const records = await Promise.all([
      client.query('SELECT * FROM "Course" WHERE id=ANY($1) ORDER BY id', [ids]),
      client.query('SELECT * FROM "CalendarEvent" WHERE "courseId"=ANY($1) ORDER BY id', [ids]),
      client.query('SELECT s.* FROM "StudentSubmission" s JOIN "SyllabusItem" i ON i.id=s."syllabusItemId" WHERE i."courseId"=ANY($1) ORDER BY s.id', [ids]),
    ]);
    return createHash('sha256').update(JSON.stringify(records.map(record => record.rows))).digest('hex');
  });
}
function safeResponse(value: unknown): void {
  if (Array.isArray(value)) return value.forEach(safeResponse);
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    expect(key, 'response property allowlist excludes restricted student/assessment data').not.toMatch(/student|enrollment|grade|submission|attempt|answer|correctoption|assessmentexecution/i);
    safeResponse(child);
  }
  const text = JSON.stringify(value); for (const marker of fixture.sensitiveMarkers) expect(text).not.toContain(marker);
}
async function denied(request: APIRequestContext, url: string, role?: keyof Fixture['accounts']): Promise<void> {
  const response = await request.get(url, role ? { headers: header(role) } : {});
  expect(response.status()).toBe(role && role !== 'INACTIVE_USER' ? 403 : 401); safeResponse(await response.json());
}

test('AC-001 AC-009 AC-010: direct oversight denies unauthenticated inactive and other roles', async ({ request }) => {
  await denied(request, overview('ics'));
  for (const role of ['ADMIN', 'INSTRUCTOR', 'STUDENT', 'INACTIVE_USER', 'FOREIGN_INSTRUCTOR'] as const) await denied(request, overview('ics'), role);
});
for (const institute of ['ics', 'ibe', 'ite'] as const) test(`AC-002 AC-003 AC-004 AC-007: explicit ${institute} scope and safe course supervision`, async ({ request }) => {
  const list = await request.get(overview(institute), { headers: header('SUPER_USER') }); expect(list.status()).toBe(200);
  const listed = await list.json(); safeResponse(listed); expect(listed.institute.code.toLowerCase()).toBe(institute);
  expect(listed.courses.map((course: { id: string }) => course.id)).toContain(fixture.courses[institute].id);
  for (const other of ['ics', 'ibe', 'ite'] as const) if (other !== institute) expect(JSON.stringify(listed)).not.toContain(fixture.courses[other].id);
  const course = await request.get(supervision(institute, fixture.courses[institute].id), { headers: header('SUPER_USER') }); expect(course.status()).toBe(200);
  const body = await course.json(); safeResponse(body); expect(body.course.id).toBe(fixture.courses[institute].id); expect(body.course.title).toBe(fixture.courses[institute].title);
  expect(body.institute.code.toLowerCase()).toBe(institute); expect(Array.isArray(body.course.announcements)).toBe(true); expect(Array.isArray(body.course.materials)).toBe(true);
});
test('AC-002 AC-005 AC-010: foreign course ID and manipulated institute cannot change the selected scope', async ({ request }) => {
  for (const selected of ['ics', 'ibe', 'ite'] as const) for (const foreign of ['ics', 'ibe', 'ite'] as const) if (selected !== foreign) {
    const response = await request.get(supervision(selected, fixture.courses[foreign].id), { headers: header('SUPER_USER') }); expect(response.status()).toBe(404);
    const body = await response.json(); safeResponse(body); expect(JSON.stringify(body)).not.toContain(fixture.courses[foreign].title);
  }
  const invalid = await request.get(overview('unsupported'), { headers: header('SUPER_USER') }); expect(invalid.status()).toBe(404);
  const manipulated = await request.get(overview('ibe') + '?institute=ics&instituteId=' + encodeURIComponent(fixture.courses.ics.id), { headers: header('SUPER_USER') });
  expect(manipulated.status()).toBe(200); const body = await manipulated.json(); expect(body.institute.code.toLowerCase()).toBe('ibe'); expect(JSON.stringify(body)).not.toContain(fixture.courses.ics.id);
});
test('AC-001 AC-006 AC-010: direct Super User mutations and teaching/student data are denied', async ({ request }) => {
  const before = await teachingFingerprint();
  expect(fixture.mutationCases.length, 'host reviewed real existing mutation endpoints, not invented missing routes').toBeGreaterThanOrEqual(4);
  for (const candidate of fixture.mutationCases) {
    const response = await request.fetch(fixture.baseURL + candidate.path, { method: candidate.method, headers: header('SUPER_USER'), data: candidate.body });
    expect(response.status(), candidate.path).toBe(403); safeResponse(await response.json());
  }
  for (const suffix of ['people', 'grades', 'gradebook', 'submissions', 'enrollments']) {
    const response = await request.get(`${fixture.baseURL}/api/courses/${fixture.courses.ics.id}/${suffix}`, { headers: header('SUPER_USER') });
    expect(response.status(), suffix).toBe(403); safeResponse(await response.json());
  }
  expect(await teachingFingerprint(), 'denied requests cannot change course/schedule/submission data').toBe(before);
});
test('AC-011: actual successful supervision access has selected-institute audit evidence', async ({ request }) => {
  const start = new Date(); const response = await request.get(supervision('ibe', fixture.courses.ibe.id), { headers: header('SUPER_USER') }); expect(response.status()).toBe(200);
  const rows = await database(async client => (await client.query('SELECT metadata FROM "AuditLog" WHERE "adminId"=$1 AND action=$2 AND "createdAt">=$3', [fixture.accounts.SUPER_USER.id, 'SUPER_USER_COURSE_SUPERVISION_READ', start])).rows);
  expect(rows.some(row => { const metadata = JSON.parse(row.metadata); return metadata.institute === 'ibe' && metadata.courseId === fixture.courses.ibe.id; })).toBe(true);
});
test('AC-008 AC-010: existing own-course role access remains available', async ({ request }) => {
  for (const role of ['ADMIN', 'INSTRUCTOR', 'STUDENT'] as const) {
    const response = await request.get(`${fixture.baseURL}/api/courses/${fixture.courses.ics.id}`, { headers: header(role) }); expect(response.status(), role).toBe(200);
    expect((await response.json()).course.id).toBe(fixture.courses.ics.id);
  }
});
test('AC-004 AC-006 AC-007: actual Super User supervision page is read-only and excludes sensitive data', async ({ page, context }) => {
  await context.addCookies([{ name: 'lumina_session', value: fixture.accounts.SUPER_USER.token, url: fixture.baseURL }]);
  await page.goto(`${fixture.baseURL}/ibe/academic-operations/courses/${fixture.courses.ibe.id}/supervision`);
  await expect(page.getByRole('heading', { name: fixture.courses.ibe.title, exact: true })).toBeVisible();
  for (const name of [/grade/i, /submit work/i, /edit course/i, /start assessment/i]) await expect(page.getByRole('button', { name })).toHaveCount(0);
  const text = await page.locator('body').innerText(); fixture.sensitiveMarkers.forEach(marker => expect(text).not.toContain(marker));
});
