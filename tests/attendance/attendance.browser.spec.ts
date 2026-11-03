import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
let script = '', css = '', qrImage = '';

test.beforeAll(async () => {
  const root = process.cwd().replaceAll('\\', '/');
  const result = await build({
    stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Attendance from '${root}/apps/web/src/components/attendance/AttendancePanel'; import Tabs from '${root}/apps/web/src/components/courses/CourseTabs'; const theme={code:'ics',colors:{primary:'#FF7517'}}; createRoot(document.getElementById('root')).render(<><p>Illustrative test class · synthetic data</p><Tabs courseId='class' instituteCode='ics' theme={theme} isInstructor={!new URLSearchParams(location.search).has('studentTabs')} showParticipation={new URLSearchParams(location.search).has('participation')}/><Attendance courseId='class' admin={false}/></>);`, resolveDir: root, loader: 'tsx' },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', tsconfig: 'apps/web/tsconfig.json', nodePaths: [path.resolve('apps/web/node_modules')],
    plugins: [{ name: 'browser-runtime', setup(b: { onResolve: Function; onLoad: Function }) {
      b.onResolve({ filter: /^next\/(dynamic|link|navigation)$/ }, ({ path: name }: { path: string }) => ({ path: name, namespace: 'test' }));
      b.onLoad({ filter: /.*/, namespace: 'test' }, ({ path: name }: { path: string }) => ({ loader: 'jsx', resolveDir: path.resolve('apps/web'), contents: name === 'next/link' ? 'export default function Link({children,...props}){return <a {...props}>{children}</a>}' : name === 'next/navigation' ? "export function usePathname(){return '/ics/courses/class/attendance'}" : 'export default function dynamic(){return ()=>null}' }));
    } }],
  });
  script = result.outputFiles[0].text;
  const webRequire = createRequire(path.resolve('apps/web/package.json'));
  qrImage = await webRequire('qrcode').toDataURL('Synthetic attendance QR - never valid for a real class');
  const postcss = webRequire('postcss'), tailwind = webRequire('@tailwindcss/postcss');
  const stylesheet = path.resolve('apps/web/src/app/globals.css');
  const source = fs.readFileSync(stylesheet, 'utf8').replace('@import "tailwindcss";', '@import "tailwindcss" source(none);\n@source "../components/attendance";\n@source "../components/courses/CourseTabs.tsx";');
  css = (await postcss([tailwind()]).process(source, { from: stylesheet })).css + '\n:root{--font-cdm-body:Arial;--font-sans:Arial;--institute-ink:color-mix(in srgb,#FF7517 58%,var(--text-primary))}';
});
function fixture(student = false) {
  const now = Date.now(), opensAt = new Date(now - 60000).toISOString(), closesAt = new Date(now + 3600000).toISOString();
  const record = { id: 'record', studentId: 'student', name: 'Synthetic Student', studentNumber: 'TEST-001', required: true, eligibilityReason: '', status: null, source: '', verification: 'NOT_CHECKED', markedAt: null, presentUntil: new Date(now + 600000).toISOString(), revision: 0, approvedArrangement: true };
  return { asOf: new Date(now).toISOString(), course: { id: 'class', title: 'Synthetic class', instituteCode: 'ics', archived: false }, enabled: true, phase: 3, role: student ? 'STUDENT' : 'MANAGER', policy: { rollout: 'PILOT', phase: 3, pilotCourseIds: ['class'], locationEnabled: false, timezone: 'Asia/Manila', privacyReview: '', recordDays: 365, eventDays: 365, requestDays: 30, verificationDays: 30, arrangementDays: 90 }, settings: { liveLimit: 1, asyncLimit: 1, absenceThreshold: 3, tardyThreshold: 3, latitude: null, longitude: null, locationLabel: '' }, sessions: [{ id: 'session', title: 'Morning class', instructions: 'Check in during the attendance window.', mode: 'LIVE_REMOTE', state: 'OPEN', opensAt, closesAt, presentUntil: new Date(now + 600000).toISOString(), timezone: 'Asia/Manila', sessionDate: '2026-11-01', requiresLocation: false, radius: 150, liveCodeEnabled: false, legalHold: false, records: [record], requests: student ? [] : [{ id: 'request', recordId: 'record', studentId: 'student', name: 'Synthetic Student', submittedAt: opensAt, reason: null, state: 'PENDING', verification: 'NOT_CHECKED', revision: 0, decisionReason: null, bulkEligible: true, approvedArrangement: true }] }], page: 1, hasMore: false, summaries: [], students: [{ id: 'student', name: 'Synthetic Student', approvedArrangement: true }], helpers: [], staff: [] };
}
async function open(page: import('@playwright/test').Page, student = false, dark = false, variant: 'default' | 'late-async' | 'qr' | 'roster' | 'tabs' | 'tabs-fit' = 'default') {
  const data = fixture(student);
  if (variant === 'late-async') { data.sessions[0].mode = 'ASYNCHRONOUS'; data.sessions[0].presentUntil = new Date(Date.now() - 3600000).toISOString(); }
  if (variant === 'qr') data.sessions[0].mode = 'IN_PERSON';
  if (variant === 'roster') data.sessions[0].records = Array.from({ length: 12 }, (_, i) => ({ ...data.sessions[0].records[0], id: `record-${i}`, studentId: `student-${i}`, name: `Student ${String(i + 1).padStart(2, '0')}`, studentNumber: `S${String(i + 1).padStart(3, '0')}`, revision: 7 }));
  const qrDeadline = Date.now() + 2500;
  const posts: Array<Record<string, unknown>> = [];
  await page.route('http://attendance.test/**', async route => {
    const req = route.request();
    if (req.url().includes('/api/')) {
      if (req.url().endsWith('/codes')) { await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ token: 'synthetic-only', qrImage, code: null, serverTime: new Date().toISOString(), expiresAt: new Date(qrDeadline).toISOString() }) }); return; }
      if (req.method() === 'POST') { posts.push(req.postDataJSON()); await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ message: 'Saved synthetic attendance.' }) }); }
      else await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    } else await route.fulfill({ contentType: 'text/html', body: `<html class="${dark ? 'dark' : ''}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:Arial;background:var(--bg-canvas);color:var(--text-primary)}main{max-width:1000px;margin:auto}main>p{font-size:13px}</style><main id="root"></main></html>` });
  });
  await page.goto(variant === 'tabs' ? 'http://attendance.test/?participation=1' : variant === 'tabs-fit' ? 'http://attendance.test/?studentTabs=1' : 'http://attendance.test/'); await page.addStyleTag({ content: css }); await page.addScriptTag({ content: script });
  await expect(page.getByRole('heading', { name: 'Attendance', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Morning class' })).toBeVisible();
  return { posts, data };
}
test('student direct check-in and camera-free request are accessible without an overloaded layout', async ({ page }, info) => {
  const { posts } = await open(page, true, info.project.name.includes('dark'));
  await expect(page.getByText('Self-reported', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Check in', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved synthetic attendance.');
  await page.getByRole('button', { name: 'Request attendance approval', exact: true }).click();
  await expect.poll(() => posts.length).toBe(2);
  expect(posts.map(p => p.action)).toEqual(['CHECK_IN', 'REQUEST']);
  await expect(page.getByText('Export attendance', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.resolve(`tmp/attendance/student-${info.project.name}.png`), fullPage: true });
});
test('instructor starts an async session and explicitly acknowledges unverified bulk approval', async ({ page }, info) => {
  const { posts } = await open(page, false, info.project.name.includes('dark'));
  await page.getByRole('button', { name: 'Start attendance', exact: true }).click();
  await page.getByLabel('Session title', { exact: true }).fill('Independent practice');
  await page.getByLabel('Mode', { exact: true }).selectOption('ASYNCHRONOUS');
  await expect(page.getByLabel('Open for (minutes)', { exact: true })).toHaveValue('1440');
  await page.getByRole('button', { name: 'Start this session', exact: true }).click();
  await expect.poll(() => posts.length).toBe(1);
  expect((posts[0].input as Record<string, unknown>).mode).toBe('ASYNCHRONOUS');
  let warning = ''; page.once('dialog', dialog => { warning = dialog.message(); void dialog.accept(); });
  await page.getByRole('button', { name: 'Accept All', exact: true }).click();
  await expect.poll(() => posts.length).toBe(2);
  expect(warning).toContain('Location was not checked'); expect(posts[1].acknowledgeUnverified).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.resolve(`tmp/attendance/instructor-${info.project.name}.png`), fullPage: true });
});

test('instructor searches a compact roster and can mark a student on any results page', async ({ page }, info) => {
  const { posts } = await open(page, false, info.project.name.includes('dark'), 'roster');
  const search = page.getByRole('searchbox', { name: 'Find a student', exact: true });
  await expect(page.getByText('12 students. Search to view or mark attendance.')).toBeVisible();
  await expect(page.getByText('Student 01', { exact: true })).toHaveCount(0);
  await search.fill('student');
  await expect(page.getByText('1–5 of 12 matching students')).toBeVisible();
  await expect(page.getByText('Student 06', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next students', exact: true }).click();
  await expect(page.getByText('Student 06', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next students', exact: true }).click();
  await expect(page.getByText('11–12 of 12 matching students')).toBeVisible();
  await search.fill('s012');
  await expect(page.getByText('Student 12', { exact: true })).toBeVisible();
  await page.getByText('Mark attendance', { exact: true }).click();
  await page.getByLabel('Status for Student 12', { exact: true }).selectOption('EXCUSED');
  await page.getByLabel('Reason for marking Student 12', { exact: true }).fill('Instructor verified');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0]).toMatchObject({ action: 'MARK', recordId: 'record-11', revision: 7, status: 'EXCUSED' });
  await search.fill('Nobody matches');
  await expect(page.getByText('No students match your search.')).toBeVisible();
  await search.fill('');
  await expect(page.getByText('Student 12', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.resolve(`tmp/attendance/compact-roster-${info.project.name}.png`), fullPage: true });
});

test('instructor can submit 60-second QR grace for slow connections', async ({ page }, info) => {
  const { posts } = await open(page, false, info.project.name.includes('dark'));
  await page.getByRole('button', { name: 'Start attendance', exact: true }).click();
  await page.getByLabel('Session title', { exact: true }).fill('Slow network class');
  const grace = page.getByLabel('QR transmission grace (seconds)', { exact: true });
  await expect(grace).toHaveValue('30');
  await expect(grace).toHaveAttribute('max', '60');
  await grace.fill('60');
  await page.getByRole('button', { name: 'Start this session', exact: true }).click();
  await expect.poll(() => posts.length).toBe(1);
  expect((posts[0].input as Record<string, unknown>).qrGraceSeconds).toBe(60);
});
test('class tabs collapse to accessible icons at 320px and remember the label preference', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page, false, info.project.name.includes('dark'), 'tabs');
  const nav = page.getByRole('navigation', { name: 'Course tabs' });
  const showLabels = page.getByRole('button', { name: 'Show tab labels', exact: true });
  await expect(showLabels).toHaveAttribute('aria-expanded', 'false');
  expect(await showLabels.evaluate(e => getComputedStyle(e).borderTopWidth)).toBe('0px');
  await expect(nav.getByRole('link')).toHaveCount(7);
  const toggleBox = await showLabels.boundingBox();
  for (const name of ['Stream', 'Classwork', 'People', 'Attendance', 'Broadcast', 'Gradebook', 'Participation']) {
    const link = nav.getByRole('link', { name, exact: true });
    await expect(link).toBeVisible(); await expect(link).toHaveAttribute('title', name);
    const box = await link.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(box!.y + box!.height / 2 - (toggleBox!.y + toggleBox!.height / 2))).toBeLessThan(1);
  }
  await page.screenshot({ path: path.resolve(`tmp/attendance/compact-tabs-${info.project.name}.png`), fullPage: true });
  await showLabels.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Show icons only', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByText('Stream', { exact: true })).not.toHaveClass('sr-only');
  const scroller = nav.locator('..');
  expect(await scroller.evaluate(e => e.scrollWidth > e.clientWidth)).toBe(true);
  const rows = await nav.getByRole('link').evaluateAll(links => links.map(link => link.getBoundingClientRect().y));
  expect(new Set(rows).size).toBe(1);
  await nav.getByRole('link', { name: 'Participation', exact: true }).scrollIntoViewIfNeeded();
  const last = await nav.getByRole('link', { name: 'Participation', exact: true }).boundingBox();
  expect(last!.x + last!.width).toBeLessThanOrEqual(320);
  await expect(page.getByRole('button', { name: 'Show icons only', exact: true })).toBeInViewport();
  await page.screenshot({ path: path.resolve(`tmp/attendance/expanded-tabs-${info.project.name}.png`), fullPage: true });
  await open(page, false, info.project.name.includes('dark'), 'tabs');
  await expect(page.getByRole('button', { name: 'Show icons only', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: 'Show icons only', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Show tab labels', exact: true })).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole('button', { name: /Show tab labels|Show icons only/ })).toHaveCount(0);
  await expect(nav.getByText('Stream', { exact: true })).not.toHaveClass('sr-only');
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.getByRole('button', { name: 'Show tab labels', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 767, height: 800 });
  await open(page, true, info.project.name.includes('dark'), 'tabs-fit');
  await expect(page.getByRole('button', { name: /Show tab labels|Show icons only/ })).toHaveCount(0);
  await expect(nav.getByText('Stream', { exact: true })).not.toHaveClass('sr-only');
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(page.getByRole('button', { name: 'Show tab labels', exact: true })).toBeVisible();
});

test('navigation order, keyboard focus and text contrast hold in both themes', async ({ page }, info) => {
  await open(page, true, info.project.name.includes('dark'));
  const nav = page.getByRole('navigation', { name: 'Course tabs' });
  expect(await nav.getByRole('link').allTextContents()).toEqual(['Stream', 'Classwork', 'People', 'Attendance', 'Broadcast', 'Gradebook']);
  const attendance = nav.getByRole('link', { name: 'Attendance', exact: true }); await attendance.focus(); await expect(attendance).toBeFocused(); await expect(attendance).toHaveAttribute('aria-current', 'page');
  const contrast = await attendance.evaluate(element => {
    const rgb = (text: string) => (text.match(/[\d.]+/g) ?? []).slice(0, 3).map(value => Number(value) * (text.startsWith('color(srgb') ? 255 : 1));
    const luminance = (channels: number[]) => channels.map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
    const fg = luminance(rgb(getComputedStyle(element).color)); let node: Element | null = element; let background = 'rgb(255,255,255)';
    while (node) { const color = getComputedStyle(node).backgroundColor; if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') { background = color; break; } node = node.parentElement; }
    const bg = luminance(rgb(background)); return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test('late async students see their personal cutoff and can add an optional request note', async ({ page }, info) => {
  const { posts, data } = await open(page, true, info.project.name.includes('dark'), 'late-async');
  const personal = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.sessions[0].records[0].presentUntil));
  await expect(page.getByText(`Tardy from ${personal}.`, { exact: false })).toBeVisible();
  await page.getByText('Optional note for instructor', { exact: true }).click();
  await page.getByLabel('Optional attendance request note', { exact: true }).fill('Camera could not read the code.');
  await page.getByRole('button', { name: 'Request attendance approval', exact: true }).click();
  await expect.poll(() => posts.length).toBe(1); expect(posts[0].reason).toBe('Camera could not read the code.');
});
test('instructor QR expires visibly and settings remain progressively disclosed', async ({ page }, info) => {
  await open(page, false, info.project.name.includes('dark'), 'qr');
  await expect(page.getByRole('img', { name: 'Current attendance QR' })).toBeVisible();
  await expect(page.getByText('Closes in', { exact: false })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Current attendance QR' })).toHaveCount(0, { timeout: 6000 });
  await expect(page.getByText('Code unavailable. Reconnecting…', { exact: true })).toBeVisible();
  await page.getByText('Class settings and access', { exact: true }).click();
  await expect(page.getByText('Live sessions at once', { exact: false }).first()).toBeVisible();
});
