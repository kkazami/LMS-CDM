const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

// Run against a local development server; no database mutation or real account is needed.
test('public policies, footer, and required login acknowledgement work on desktop and mobile', { timeout: 180000 }, async () => {
  const base = process.env.POLICY_TEST_BASE_URL || 'http://127.0.0.1:3215';
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Use a local server');
  const output = path.resolve('tmp/legal-browser');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.POLICY_TEST_BROWSER ? { executablePath: process.env.POLICY_TEST_BROWSER } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/login?institute=ics&force=1');
    const checkbox = page.getByRole('checkbox', { name: /I agree to the Terms and Conditions/ });
    await checkbox.waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('#accepted-policies').disabled);
    assert.equal(await checkbox.isChecked(), false);
    assert.equal(await checkbox.getAttribute('required'), '');
    await page.getByLabel('Email or student ID', { exact: true }).fill('synthetic@example.invalid');
    await page.getByLabel('Password', { exact: true }).fill('Synthetic-Only-12345');
    const requests = [];
    await page.route('**/api/auth/login', async route => {
      requests.push(route.request().postDataJSON());
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic login rejected.' }) });
    });
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    assert.equal(await checkbox.evaluate(input => input.validity.valueMissing), true);
    assert.equal(requests.length, 0);
    await page.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.locator('form').getByRole('alert').waitFor();
    assert.match(await page.locator('form').getByRole('alert').innerText(), /Terms and Conditions/);
    assert.equal(requests.length, 0);

    const popupPromise = context.waitForEvent('page');
    await page.locator('form').getByRole('link', { name: /Terms and Conditions/ }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.equal(new URL(popup.url()).pathname, '/terms');
    assert.equal(await page.getByLabel('Email or student ID', { exact: true }).inputValue(), 'synthetic@example.invalid');
    await popup.close();
    await checkbox.check();
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.getByText('Synthetic login rejected.', { exact: true }).waitFor();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].acceptedPolicies, true);
    await page.screenshot({ path: path.join(output, 'login-desktop.png'), fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'login-mobile.png'), fullPage: true, animations: 'disabled' });
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await page.waitForFunction(() => getComputedStyle(document.querySelector('form').closest('section')).backgroundColor === 'rgb(26, 29, 39)');
    await page.screenshot({ path: path.join(output, 'login-mobile-dark.png'), fullPage: true, animations: 'disabled' });
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);

    for (const [route, title] of [['/terms', 'Terms and Conditions'], ['/privacy', 'Privacy Policy'], ['/support', 'Contact & Support']]) {
      const response = await page.goto(base + route);
      assert.equal(response.status(), 200);
      assert.equal(new URL(page.url()).pathname, route);
      await page.getByRole('heading', { name: title, exact: true, level: 1 }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      await page.screenshot({ path: path.join(output, route.slice(1) + '-mobile.png'), fullPage: true, animations: 'disabled' });
      if (route === '/privacy') {
        await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
        await page.screenshot({ path: path.join(output, 'privacy-mobile-dark.png'), fullPage: true, animations: 'disabled' });
        await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
      }
      for (const href of await page.locator('main a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute('href')))) {
        assert.equal(await page.locator(href).count(), 1);
      }
      await page.setViewportSize({ width: 1366, height: 900 });
      await page.screenshot({ path: path.join(output, route.slice(1) + '-desktop.png'), fullPage: true, animations: 'disabled' });
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.goto(base + '/');
    const footer = page.getByRole('contentinfo');
    await footer.scrollIntoViewIfNeeded();
    for (const label of ['Terms and Conditions', 'Privacy Policy']) {
      const href = new URL(await footer.getByRole('link', { name: label, exact: true }).getAttribute('href'), base);
      assert.equal(href.searchParams.get('returnTo'), '/#site-footer');
    }
    assert.doesNotMatch(await footer.innerText(), /TODO|placeholder/i);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await footer.screenshot({ path: path.join(output, 'footer-mobile.png') });
    await page.setViewportSize({ width: 1366, height: 900 });
    await footer.screenshot({ path: path.join(output, 'footer-desktop.png') });
    for (const label of ['Terms and Conditions', 'Privacy Policy']) {
      await footer.getByRole('link', { name: label, exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('main').length === 1);
      await page.getByRole('heading', { name: label, level: 1, exact: true }).waitFor();
      // Moving between policies preserves the original destination as well.
      if (label === 'Terms and Conditions') {
        await page.locator('article').getByRole('link', { name: 'Privacy Policy', exact: true }).click();
        await page.waitForURL(url => url.pathname === '/privacy');
        await page.waitForFunction(() => document.querySelectorAll('main').length === 1);
        await page.getByRole('heading', { name: 'Privacy Policy', level: 1, exact: true }).waitFor();
      }
      await page.getByRole('link', { name: 'Back to landing page', exact: true }).click();
      await page.waitForURL(base + '/#site-footer');
      await page.waitForFunction(() => document.querySelectorAll('footer').length === 1);
      await footer.waitFor();
      await page.waitForFunction(() => document.querySelector('#site-footer').getBoundingClientRect().top < innerHeight);
      assert.ok(await page.evaluate(() => scrollY > 100), 'Return to the footer instead of the top of the landing page');
    }
    await page.goto(base + '/privacy?returnTo=' + encodeURIComponent('/ics/profile#lms-policies'));
    assert.equal(await page.getByRole('link', { name: 'Back to your profile', exact: true }).getAttribute('href'), '/ics/profile#lms-policies');
    const protectedResponse = await context.request.get(base + '/ics/students', { maxRedirects: 0 });
    assert.equal(protectedResponse.status(), 307);
    assert.match(protectedResponse.headers().location, /\/login\?/);
    assert.deepEqual(errors, []);
    await context.close();
  } finally { await browser.close(); }
});
