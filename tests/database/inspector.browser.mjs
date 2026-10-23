// Render the shipped inspector with synthetic responses; never connect to an LMS database.
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
const output = path.resolve('tmp/database-inspector-review');
await fs.mkdir(output, { recursive: true });
const bundle = await build({
  stdin: { contents: `
    import React, {useState} from 'react'; import {createRoot} from 'react-dom/client';
    import {TableInspectorModal} from '${root}/apps/web/src/components/admin/database/TableInspectorModal';
    import {getInstituteTheme} from '${root}/apps/web/src/lib/get-institute-theme';
    import AdminDatabaseClient from '${root}/apps/web/src/app/(dashboard)/[institute]/admin/database/client';
    function App(){const [model,setModel]=useState(null);window.inspectModel=setModel;
      if(location.pathname==='/ics/admin/database')return <main className="lms-shell" style={{padding:16,marginLeft:innerWidth>=1024?288:0,minHeight:2200}}><AdminDatabaseClient theme={getInstituteTheme('ics')} instituteCode="ics"/></main>;
      return <div className="page-enter" style={{marginLeft:'10%',paddingTop:800,minHeight:2400}}>
      <button id="inspect" onClick={()=>setModel('User')}>Inspect User</button>
      <TableInspectorModal theme={getInstituteTheme('ics')} modelName={model} onClose={()=>setModel(null)}/>
    </div>} createRoot(document.getElementById('root')).render(<App/>);
  `, loader: 'tsx', resolveDir: path.resolve('apps/web') },
  bundle: true, write: false, jsx: 'automatic', tsconfig: 'apps/web/tsconfig.json',
  nodePaths: [path.resolve('apps/web/node_modules')], define: { 'process.env.NODE_ENV': '"production"' },
});
const globalPath = path.resolve('apps/web/src/app/globals.css');
const css = (await postcss([tailwind({ base: path.resolve('apps/web') })]).process(await fs.readFile(globalPath, 'utf8'), { from: globalPath })).css;
const columns = ['id', 'name', 'email', 'password', ...Array.from({ length: 22 }, (_, i) => 'attribute' + i)];
const rows = Array.from({ length: 25 }, (_, i) => Object.fromEntries(columns.map(col => [col, col === 'id' ? 'synthetic-user-' + i : col === 'password' ? '[REDACTED]' : col + '-synthetic-value-' + i])));
const attachmentColumns = ['id', 'syllabusItemId', 'type', 'url', 'fileName', 'fileSize', 'createdAt'];
const attachmentRows = Array.from({ length: 10 }, (_, i) => ({ id: 'synthetic-attachment-' + i, syllabusItemId: 'synthetic-material-' + i, type: 'LINK', url: 'https://example.invalid/material/' + 'a'.repeat(160) + i, fileName: 'Sample learning material ' + i, fileSize: null, createdAt: '2026-10-23T00:00:00.000Z' }));
const errors = [], checks = [];
let fail = false;
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on('pageerror', error => errors.push(error.message));
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.origin !== 'http://inspector.test') return route.abort();
  if (!url.pathname.startsWith('/api/')) return route.fulfill({ contentType: 'text/html', body: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body style="font-family:Arial,sans-serif"><div id="root"></div><script>${bundle.outputFiles[0].text}</script></body></html>` });
  if (url.pathname.endsWith('/overview')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'HEALTHY', database: { provider: 'PostgreSQL', driver: '@prisma/adapter-pg', connection: 'CONNECTED', lastChecked: '2026-10-23T00:00:00.000Z' }, metrics: { totalCategories: 1, totalTables: 2, totalRecords: 67 }, categories: [{ id: 'academic', name: 'Academic & Curricula', description: 'Synthetic course resources', color: '#3B82F6', tables: [{ name: 'Attachment', model: 'Attachment', description: 'Learning PDFs, documents, and media', count: 10 }, { name: 'User', model: 'User', description: 'Synthetic user records', count: 57 }] }] }) });
  if (url.pathname.endsWith('/backup')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ snapshots: [], schedule: null }) });
  const model = url.pathname.split('/').at(-1);
  if (model === 'Attachment') return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ model, totalCount: 10, sampleCount: 10, columns: attachmentColumns, rows: attachmentRows }) });
  if (model === 'Slow') await new Promise(resolve => setTimeout(resolve, 250));
  return route.fulfill({ status: fail ? 503 : 200, contentType: 'application/json', body: JSON.stringify({ model, totalCount: model === 'Empty' ? 0 : 57, sampleCount: model === 'Empty' ? 0 : 25, columns, rows: model === 'Empty' ? [] : rows }) }).catch(() => {});
});
async function check(name, work) { await work(); checks.push(name); console.log('PASS ' + name); }
async function open() {
  await page.goto('http://inspector.test');
  await page.locator('#inspect').click();
  await page.getByRole('region').waitFor();
}
try {
  for (const [width, height] of [[1912, 911], [1366, 768], [390, 844], [320, 568]]) {
    await check(`inspector stays in ${width}x${height} viewport after parent scroll and transform; both scroll axes and close remain reachable`, async () => {
      await page.setViewportSize({ width, height });
      await open();
      const dialog = page.getByRole('dialog');
      const box = await dialog.boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height);
      assert.equal(await dialog.evaluate(el => el.parentElement.parentElement === document.body), true);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const region = page.getByRole('region');
      assert.equal(await region.evaluate(el => el.scrollWidth > el.clientWidth && el.scrollHeight > el.clientHeight), true);
      await region.evaluate(el => { el.scrollLeft = el.scrollWidth; el.scrollTop = el.scrollHeight; });
      const last = page.getByRole('columnheader').last();
      assert.equal(await last.innerText(), 'ATTRIBUTE21');
      const headerBox = await last.boundingBox(), regionBox = await region.boundingBox();
      assert.ok(headerBox.y >= regionBox.y && headerBox.y < regionBox.y + 5, 'header remains visible while scrolling');
      const close = page.getByRole('button', { name: 'Close', exact: true });
      const closeBox = await close.boundingBox();
      assert.ok(closeBox.y + closeBox.height <= height);
      await page.screenshot({ path: path.join(output, `${width}x${height}.png`) });
      await close.click();
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      assert.equal(await page.locator('#inspect').evaluate(el => el === document.activeElement), true);
    });
  }
  await check('keyboard focus cycles inside the dialog; Escape closes and restores focus', async () => {
    await open();
    await page.getByRole('button', { name: 'Close', exact: true }).focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button', { name: 'Export JSON' }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.getByRole('button', { name: 'Close', exact: true }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
  });
  await check('empty tables still show their detected fields; model changes reset the selected view', async () => {
    await open();
    await page.evaluate(() => window.inspectModel('Empty'));
    await page.getByText('No records found', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Detected Fields' }).click();
    await page.getByText('Model Attribute Schema Columns', { exact: true }).waitFor();
    await page.evaluate(() => window.inspectModel('Session'));
    await page.getByRole('region', { name: /Session sample/ }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Sample Records' }).getAttribute('aria-pressed'), 'true');
  });
  await check('a late response cannot replace a newly selected model, and failed requests support retry', async () => {
    await page.evaluate(() => window.inspectModel('Slow'));
    await page.getByText('Querying Slow records from PostgreSQL...').waitFor();
    await page.evaluate(() => window.inspectModel('User'));
    await page.getByRole('region', { name: /User sample/ }).waitFor();
    await page.waitForTimeout(350);
    assert.equal(await page.getByRole('heading', { name: 'User', exact: true }).count(), 1);
    fail = true;
    await page.evaluate(() => window.inspectModel('Error'));
    await page.getByRole('alert').waitFor();
    fail = false;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.getByRole('region', { name: /Error sample/ }).waitFor();
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: path.join(output, 'dark.png') });
  });
  for (const [width, height] of [[1914, 915], [390, 844]]) {
    await check(`actual Database Management page opens its Attachment inspector within ${width}x${height}, including after scrolling`, async () => {
      await page.setViewportSize({ width, height });
      await page.goto('http://inspector.test/ics/admin/database');
      const inspect = page.getByRole('button', { name: 'Inspect', exact: true }).first();
      await inspect.waitFor();
      await inspect.scrollIntoViewIfNeeded();
      await inspect.click();
      const dialog = page.getByRole('dialog', { name: 'Attachment', exact: true });
      await page.getByRole('region', { name: /Attachment sample records/ }).waitFor();
      const box = await dialog.boundingBox();
      assert.ok(box.y >= 0 && box.y + box.height <= height && box.x >= 0 && box.x + box.width <= width);
      assert.ok(Math.abs(box.y + box.height / 2 - height / 2) <= 1, 'centered on the viewport rather than the scrolled content');
      assert.equal(await dialog.locator('tbody tr').count(), 10);
      const close = dialog.getByRole('button', { name: 'Close', exact: true });
      const closeBox = await close.boundingBox();
      assert.ok(closeBox.y + closeBox.height <= height);
      await page.screenshot({ path: path.join(output, `admin-page-${width}x${height}.png`) });
      await close.click();
      assert.equal(await page.getByRole('dialog').count(), 0);
    });
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify({ checks, errors, data: 'Synthetic only; no application server or database.' }, null, 2));
} finally { await browser.close(); }

