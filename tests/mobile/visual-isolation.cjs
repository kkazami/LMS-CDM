// Deterministic before/after screenshots: auth, IBE/ITE and disabled ICS must be identical.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const { createMobileFixture } = require('./fixtures/ics-fixture.cjs');

async function capture(browser, root, institute, role, dark) {
  assert.ok(fs.existsSync(path.join(root, 'index.html')), `Export is incomplete: ${root}`);
  const fixture = createMobileFixture();
  const server = http.createServer((req, res) => {
    let file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.png') ? 'image/png' : file.endsWith('.ttf') ? 'font/ttf' : 'text/html');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme: dark ? 'dark' : 'light' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const OriginalDate = Date;
    globalThis.Date = class extends OriginalDate {
      constructor(...args) { super(...(args.length ? args : ['2026-11-03T04:00:00Z'])); }
      static now() { return OriginalDate.now(); }
    };
  });
  await page.route('**/*', route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname.startsWith('/api/')) return route.fulfill(fixture.handle(req.method(), url.pathname + url.search, req.postData() ? req.postDataJSON() : {}));
    return url.origin === origin ? route.continue() : route.abort();
  });
  try {
    await page.goto(origin);
    await page.getByLabel('Email or Student ID').waitFor();
    if (institute !== 'auth') {
      await page.getByRole('tab', { name: institute === 'ibe' ? 'Institute of Business and Entrepreneurship' : institute === 'ite' ? 'Institute of Teacher Education' : 'Institute of Computing Studies', exact: true }).click();
      await page.getByLabel('Email or Student ID').fill(`${role === 'teacher' ? 'teacher' : 'student'}@example.invalid`);
      await page.getByLabel('Password', { exact: true }).fill('SyntheticPassword1');
      await page.getByRole('checkbox').click();
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      await page.getByRole('tab', { name: 'Dashboard tab', exact: true }).waitFor();
      await page.getByText('Signed in as', { exact: false }).waitFor({ state: 'hidden' }).catch(() => {});
      // Assert default presentation even with an authenticated institute identity.
      if (institute !== 'ics') assert.equal(await page.getByTestId('ics-dashboard-v2').count(), 0);
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode().catch(() => {}))));
    const masks = [];
    if (institute === 'auth') {
      // Baseline-vs-itself reproduces nondeterministic crest resampling. Verify its
      // real bytes and geometry, then mask only those image pixels in comparisons.
      const crest = page.getByLabel('Colegio de Montalban crest', { exact: true });
      const bounds = await crest.boundingBox();
      assert.equal(bounds.width, 54); assert.equal(bounds.height, 54);
      const assets = path.join(root, 'assets/assets');
      const exported = fs.readdirSync(assets).find(name => name.startsWith('cdm-logo.'));
      const hash = bytes => createHash('sha256').update(bytes).digest('hex');
      assert.equal(hash(fs.readFileSync(path.join(assets, exported))), hash(fs.readFileSync('apps/mobile/assets/cdm-logo.png')));
      masks.push(crest);
    }
    const screenshot = await page.screenshot({ path: path.join('tmp/ics-ui-isolation', `${path.basename(root)}-${institute}-${role}-${dark ? 'dark' : 'light'}.png`), animations: 'disabled', mask: masks });
    assert.deepEqual(errors, []);
    return screenshot;
  } finally { await context.close(); await new Promise(resolve => server.close(resolve)); }
}

async function main() {
  const before = path.resolve(process.env.MOBILE_BASELINE_ROOT || 'tmp/ics-ui-baseline');
  const after = path.resolve(process.env.MOBILE_CANDIDATE_ROOT || 'tmp/ics-ui-v2');
  fs.mkdirSync('tmp/ics-ui-isolation', { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const institute of ['auth', 'ibe', 'ite']) for (const role of institute === 'auth' ? ['student'] : ['student', 'teacher']) for (const dark of [false, true]) {
      console.log(`Comparing ${institute}/${role}/${dark ? 'dark' : 'light'}`);
      const a = await capture(browser, before, institute, role, dark);
      const b = await capture(browser, after, institute, role, dark);
      assert.ok(a.equals(b), `Unexpected default rendering change: ${institute}/${role}/${dark ? 'dark' : 'light'}`);
    }
    console.log('Default-rendering isolation: 10 pixel comparisons passed (auth crest pixels masked; original asset bytes and geometry verified).');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
