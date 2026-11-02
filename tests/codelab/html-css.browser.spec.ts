import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';
import { getSecurityHeaders } from '../../apps/web/src/lib/security-headers';

const require = createRequire(path.resolve('package.json'));
const { build } = require(require.resolve('esbuild', { paths:[path.dirname(require.resolve('tsx'))] }));
let script = '';
test.beforeAll(async () => {
  const result = await build({ stdin:{contents:`import { runHtmlTests, runCssTests, buildStaticPreviewDocument } from './apps/web/src/features/interactive-activities/codelab/utils/html-css-runner';
    window.htmlTests=runHtmlTests; window.cssTests=runCssTests; window.previewDocument=buildStaticPreviewDocument;`,resolveDir:process.cwd()},
    bundle:true,write:false });
  script = result.outputFiles[0].text;
});
test.beforeEach(async ({page}) => {
  await page.route('http://localhost/**', route => route.fulfill({ contentType:'text/html',
    headers:getSecurityHeaders('static-tests'),
    body:`<!doctype html><title>Static HTML/CSS tests</title><script nonce="static-tests">${script}</script>` }));
  await page.goto('http://localhost/static-tests');
});

test('HTML document with a correct heading passes and missing selectors fail', async ({page}) => {
  const results = await page.evaluate(() => (window as any).htmlTests(
    '<!DOCTYPE html><html><head><title>My Page</title></head><body><h1>Welcome to CodeLab.</h1></body></html>',
    [{label:'Heading',expectedOutputTemplate:'h1',isHidden:false}, {label:'Paragraph',expectedOutputTemplate:'p',isHidden:false}]));
  expect(results[0]).toEqual({label:'Heading',passed:true,error:undefined});
  expect(results[1].passed).toBe(false);
  expect(results[1].error).toContain('was not found');
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('CSS tests inspect computed styles and preserve useful failure diagnostics', async ({page}) => {
  const results = await page.evaluate(() => (window as any).cssTests(
    'h1 { color: red; } .box { background-color: blue; }',
    '<!doctype html><html><head></head><body><h1>Title</h1><div class="box">Box</div></body></html>',
    [{label:'Red heading',expectedOutputTemplate:'h1:color:rgb(255, 0, 0)',isHidden:false},
     {label:'Blue box',expectedOutputTemplate:'.box:background-color:rgb(0, 0, 255)',isHidden:false},
     {label:'Wrong size',expectedOutputTemplate:'h1:font-size:99px',isHidden:false}]));
  expect(results.map((r:any)=>r.passed)).toEqual([true,true,false]);
  expect(results[2].error).toContain('99px');
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('readable static test frames block student scripts and external requests', async ({page}) => {
  let requests = 0;
  await page.route('**/private-probe**', route=>{ requests++; return route.fulfill({body:'private'}); });
  const results = await page.evaluate(() => {
    (window as any).compromised = false;
    return (window as any).htmlTests(`<h1>Heading</h1>
      <script>parent.compromised=true; fetch('/private-probe')</script>
      <img src="/private-probe.png" onerror="parent.compromised=true">
      <link rel="stylesheet" href="/private-probe.css">
      <iframe src="/private-probe"></iframe>
      <meta http-equiv="refresh" content="0;url=/private-probe">`,
      [{label:'Heading',expectedOutputTemplate:'h1',isHidden:false}]);
  });
  expect(results[0].passed).toBe(true);
  expect(await page.evaluate(()=>(window as any).compromised)).toBe(false);
  expect(requests).toBe(0);
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('invalid selectors and malformed CSS tests fail without leaking frames', async ({page}) => {
  const html = await page.evaluate(() => (window as any).htmlTests('<h1>Title</h1>',
    [{label:'Invalid selector',expectedOutputTemplate:'[',isHidden:false}]));
  const css = await page.evaluate(() => (window as any).cssTests('h1{color:red}', '<h1>Title</h1>',
    [{label:'Invalid test',expectedOutputTemplate:'bad-format',isHidden:false}]));
  expect(html[0].passed).toBe(false); expect(css[0].passed).toBe(false);
  await expect(page.locator('iframe')).toHaveCount(0);
});
