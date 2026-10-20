// UI behavior tests use the shipped components and synthetic API responses; no database access.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const requireRoot = createRequire(path.resolve('package.json'));
const requireWeb = createRequire(path.resolve('apps/web/package.json'));
const { build } = requireRoot(requireRoot.resolve('esbuild', { paths: [path.dirname(requireRoot.resolve('tsx'))] }));
const postcss = requireWeb('postcss');
const tailwind = requireWeb('@tailwindcss/postcss');
const root = process.cwd().replaceAll('\\', '/');
const output = path.resolve('tmp/super-user-ui-review');
await fs.mkdir(output, { recursive: true });
const bundle = await build({
  stdin: { contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import Shell from '${root}/apps/web/src/components/super-user-v1/SuperUserShell';
    import Overview from '${root}/apps/web/src/components/super-user-v1/SuperUserOverview';
    import Courses from '${root}/apps/web/src/components/super-user-v1/InstituteCourseList';
    import Admins from '${root}/apps/web/src/components/super-user-v1/InstituteAdminManagement';
    const segments=location.pathname.split('/');const institute=segments[1]||'ics';
    const screen=segments[3];const id=segments[4];
    createRoot(document.getElementById('root')).render(<Shell institute={institute} userName='Alex Reyes'>{screen==='courses'?<Courses institute={institute} courseId={id} initialAssignment={new URLSearchParams(location.search).get('assignment')==='unassigned'?'unassigned':'all'}/>:screen==='institute-admins'?<Admins institute={institute} selectedId={id}/>:<Overview institute={institute}/>}</Shell>);
  `, loader: 'tsx', resolveDir: path.resolve('apps/web') },
  bundle: true, write: false, outdir: 'out', jsx: 'automatic', tsconfig: 'apps/web/tsconfig.json', nodePaths: [path.resolve('apps/web/node_modules')],
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'next-browser-fixture', setup(builder) {
    builder.onResolve({ filter: /^next\/(link|navigation|image)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'next/navigation' ? 'export const usePathname=()=>location.pathname;' : args.path === 'next/image' ? "import React from 'react';export default function Image({unoptimized,...props}){return React.createElement('img',props)}" : "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}", loader: 'js', resolveDir: path.resolve('apps/web') }));
  } }],
});
const script = bundle.outputFiles.find(file => file.path.endsWith('.js')).text;
const globalPath = path.resolve('apps/web/src/app/globals.css');
const globalCss = await postcss([tailwind({ base: path.resolve('apps/web') })]).process(await fs.readFile(globalPath, 'utf8'), { from: globalPath });
const css = globalCss.css + bundle.outputFiles.find(file => file.path.endsWith('.css')).text;
const course = (id, title, instructor) => ({ id, title, code: id.toUpperCase(), subject: 'Computing', section: 'BSIT 2A', room: 'Lab 2', instructor: instructor ? { id: 'faculty', name: 'Maria Santos' } : null });
const records = [course('cs101', 'Introduction to Programming', true), course('cs202', 'Data Structures', false)];
let accounts = [{ id: 'admin-1', name: 'Jamie Cruz', email: 'jamie@example.invalid', isActive: true, createdAt: '2026-10-01T00:00:00Z', instituteCode: 'ics', role: 'ADMIN' }];
let failure = false, empty = false, hold = false, accountFailure = false;
const requests = [], errors = [], checks = [];
const base = 'http://super-user.test';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on('pageerror', error => errors.push(error.message));
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url());
  if (url.origin !== base) return route.abort();
  if (!url.pathname.startsWith('/api/')) return route.fulfill({ contentType: 'text/html', body: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${script}</script></body></html>` });
  requests.push({ path: url.pathname, method: request.method(), body: request.postDataJSON() });
  const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  if (url.pathname.includes('/academic-oversight/')) {
    if (hold) await new Promise(resolve => setTimeout(resolve, 300));
    if (failure) return send({ message: 'Operation unavailable.' }, 503);
    const selected = url.pathname.split('/')[3];
    const list = selected === 'ics' && !empty ? records : [];
    const id = url.pathname.split('/')[5];
    return send(id ? { course: { ...records.find(item => item.id === id), schedule: [{ id: 'event', title: 'Lab orientation', eventDate: '2026-10-20T01:00:00Z', eventType: 'GENERAL' }], materials: [{ id: 'material', title: 'Programming handbook' }], announcements: [{ id: 'announcement', createdAt: '2026-10-18T01:00:00Z' }] } } : { courses: list });
  }
  if (url.pathname.includes('/institute-admins')) {
    if (accountFailure) return send({ error: { message: 'Unavailable.' } }, 503);
    if (request.method() === 'PATCH') {
      const body = request.postDataJSON();
      if (body.currentPassword !== 'Synthetic-Super-Only-12345') return send({ error: { message: 'REAUTH_FAILED' } }, 403);
      const id = url.pathname.split('/')[5];
      const account = accounts.find(item => item.id === id);
      const sessionsEnded = Boolean(body.newPassword) || body.email !== account.email;
      account.name = body.name; account.email = body.email;
      return send({ instituteAdmin: account, sessionsEnded });
    }
    if (request.method() === 'POST') {
      if (url.pathname.endsWith('/reactivate')) return send({ error: { message: 'HANDOFF_INCOMPLETE' } }, 409);
      if (url.pathname.endsWith('/suspend')) { accounts = accounts.map(item => ({ ...item, isActive: false })); return send({ warnings: ['NO_ACTIVE_ADMIN'] }); }
      const body = request.postDataJSON();
      const account = { ...accounts[0], ...body, id: 'admin-2', isActive: false };
      accounts.push(account); return send({ instituteAdmin: account }, 201);
    }
    const id = url.pathname.split('/')[5];
    return send(id ? { instituteAdmin: accounts.find(item => item.id === id) } : { instituteAdmins: accounts });
  }
  if (url.pathname === '/api/auth/logout') return send({ error: 'test failure' }, 503);
  return send({}, 404);
});
async function visible(locator) { await locator.waitFor({ state: 'visible' }); }
async function open(route) { await page.goto(base + route); }
async function screenshot(name) { await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true }); }
async function check(name, work) { await work(); checks.push(name); console.log('PASS ' + name); }
try {
  await check('overview uses API data, flags missing assignments, and opens the filtered directory', async () => {
    await open('/ics/academic-operations');
    await visible(page.getByText('Introduction to Programming', { exact: true }));
    assert.equal(await page.getByText('Active courses', { exact: true }).locator('..').locator('dd > span[aria-hidden]').innerText(), '2');
    await screenshot('desktop-overview');
    await page.getByRole('link', { name: 'View courses', exact: true }).click();
    await visible(page.getByRole('link', { name: 'Data Structures', exact: true }));
    assert.equal(await page.getByRole('combobox', { name: 'Instructor assignment' }).inputValue(), 'unassigned');
    assert.equal(await page.getByRole('link', { name: 'Introduction to Programming', exact: true }).count(), 0);
    await page.getByRole('combobox', { name: 'Instructor assignment' }).selectOption('all');
    await page.getByRole('searchbox', { name: 'Search courses' }).fill('Maria');
    assert.equal(await page.getByRole('link', { name: 'Data Structures', exact: true }).count(), 0);
    await page.getByRole('searchbox', { name: 'Search courses' }).fill('not a course');
    await visible(page.getByRole('heading', { name: 'No matching courses' }));
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await screenshot('desktop-courses');
    await page.getByRole('link', { name: 'Introduction to Programming', exact: true }).click();
    await visible(page.getByRole('heading', { name: 'Introduction to Programming' }));
    await visible(page.getByText('Programming handbook'));
    await visible(page.getByText('Lab orientation'));
    assert.equal(await page.getByRole('button', { name: /edit course|grade|submit/i }).count(), 0);
    await screenshot('desktop-course-details');
  });
  await check('administrator creation and access changes show clear outcomes and preserve request payloads', async () => {
    await open('/ics/academic-operations/institute-admins');
    await visible(page.getByRole('link', { name: 'Jamie Cruz', exact: true }));
    await page.getByRole('button', { name: 'Add administrator', exact: true }).click();
    await page.getByRole('textbox', { name: 'Full name' }).fill('Sam Rivera');
    await page.getByRole('textbox', { name: 'Email address' }).fill('sam@example.invalid');
    await page.locator('form').getByRole('button', { name: 'Add administrator', exact: true }).click();
    await visible(page.getByRole('link', { name: 'Sam Rivera', exact: true }));
    assert.deepEqual(requests.find(item => item.method === 'POST' && item.path.endsWith('/institute-admins')).body, { name: 'Sam Rivera', email: 'sam@example.invalid' });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reactivate Sam Rivera', exact: true }).click();
    await visible(page.getByRole('alert').getByText(/login details set up/));
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Suspend Jamie Cruz', exact: true }).click();
    assert.equal(requests.filter(item => item.path.endsWith('/suspend')).length, 0);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Suspend Jamie Cruz', exact: true }).click();
    await visible(page.getByRole('button', { name: 'Reactivate Jamie Cruz', exact: true }));
    await screenshot('desktop-administrators');
    await page.getByRole('searchbox', { name: 'Search administrators' }).fill('sam@');
    assert.equal(await page.getByRole('link', { name: 'Jamie Cruz', exact: true }).count(), 0);
  });
  await check('administrator editing validates confirmation, reauthenticates and clears credential fields after saving', async () => {
    await open('/ics/academic-operations/institute-admins');
    await page.getByRole('link', { name: 'Edit', exact: true }).first().click();
    await visible(page.getByRole('heading', { name: 'Edit administrator', exact: true }));
    await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('Jamie Updated');
    await page.getByRole('textbox', { name: 'Sign-in email', exact: true }).fill('jamie-updated@example.invalid');
    await page.locator('input[name="newPassword"]').fill('Synthetic-New-Password-12345');
    await page.locator('input[name="confirmPassword"]').fill('Mismatch-12345');
    await page.locator('input[name="currentPassword"]').fill('incorrect');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await visible(page.getByRole('alert').getByText('The new passwords do not match.'));
    assert.equal(requests.filter(item => item.method === 'PATCH').length, 0);
    await page.locator('input[name="confirmPassword"]').fill('Synthetic-New-Password-12345');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await visible(page.getByRole('alert').getByText('Your current password is incorrect. Try again.'));
    await page.locator('input[name="currentPassword"]').fill('Synthetic-Super-Only-12345');
    await screenshot('desktop-administrator-editor');
    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot('mobile-administrator-editor');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await visible(page.getByRole('heading', { name: 'Jamie Updated', exact: true }));
    await visible(page.getByRole('status').getByText('Administrator updated. Their active sessions have ended.'));
    assert.equal(await page.locator('input[name="newPassword"]').inputValue(), '');
    assert.equal(await page.locator('input[name="currentPassword"]').inputValue(), '');
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await check('unavailable data has retry controls, unknown counts, and no false empty state', async () => {
    failure = true; accountFailure = true;
    await open('/ics/academic-operations');
    await visible(page.getByRole('heading', { name: 'Information unavailable', exact: true }).first());
    assert.equal(await page.getByText('Active courses', { exact: true }).locator('..').locator('dd > span[aria-hidden]').innerText(), '—');
    assert.equal(await page.getByRole('heading', { name: 'No active courses' }).count(), 0);
    await screenshot('desktop-error');
    failure = false; accountFailure = false;
    await page.getByRole('button', { name: 'Try again' }).first().click();
    await visible(page.getByText('Introduction to Programming', { exact: true }));
  });
  await check('mobile navigation, theme persistence, institute switching, and sign-out error handling', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open('/ics/academic-operations');
    await visible(page.getByText('Introduction to Programming', { exact: true }));
    await screenshot('mobile-overview');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await screenshot('mobile-dark-overview');
    await page.reload(); await visible(page.getByRole('button', { name: 'Switch to light mode' }));
    await page.getByRole('navigation', { name: 'Super User mobile', exact: true }).getByRole('link', { name: 'Courses', exact: true }).click();
    await visible(page.getByRole('link', { name: 'Data Structures', exact: true }));
    await screenshot('mobile-dark-courses');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('combobox', { name: 'Switch institute' }).selectOption('ibe');
    await visible(page.getByText('Super User · IBE', { exact: true }));
    await visible(page.getByRole('heading', { name: 'No active courses' }));
    await page.getByRole('combobox', { name: 'Switch institute' }).selectOption('ite');
    await visible(page.getByText('Super User · ITE', { exact: true }));
    await page.locator('summary').click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await visible(page.getByRole('alert').getByText('Could not sign out. Try again.'));
  });
  await check('loading state and empty-state recovery remain usable on small screens', async () => {
    hold = true; empty = true;
    await open('/ics/academic-operations/courses');
    await visible(page.getByRole('status').getByText('Loading courses'));
    await visible(page.getByRole('heading', { name: 'No active courses' }));
    await screenshot('mobile-empty-courses');
    empty = false; hold = false;
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await visible(page.getByRole('link', { name: 'Data Structures', exact: true }));
    await page.setViewportSize({ width: 320, height: 740 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  });
  await check('counters animate through intermediate values and settle on the real counts', async () => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
      window.metricFrames = [];
      new MutationObserver(() => {
        const value = document.querySelector('dd > span[aria-hidden]')?.textContent;
        if (value && value !== window.metricFrames.at(-1)) window.metricFrames.push(value);
      }).observe(document, { childList: true, characterData: true, subtree: true });
    });
    await open('/ics/academic-operations');
    await page.waitForFunction(() => document.querySelector('dd > span[aria-hidden]')?.textContent === '2');
    assert.ok((await page.evaluate(() => window.metricFrames)).includes('1'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open('/ics/academic-operations');
    await visible(page.getByText('Introduction to Programming', { exact: true }));
    assert.equal(await page.locator('dd > span[aria-hidden]').first().innerText(), '2');
    assert.ok(!(await page.evaluate(() => window.metricFrames)).includes('1'));
  });
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ checks, browserErrors: errors, data: 'Synthetic API responses. No database access.' }, null, 2));
} finally { await browser.close(); }
