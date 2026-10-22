const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');

test('login redesign preserves institute context, consent, recovery, and form feedback', { timeout: 180000 }, async () => {
  const base = process.env.LOGIN_TEST_BASE_URL || 'http://127.0.0.1:3231';
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Use a local server');
  const output = path.resolve('.impeccable/review');
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.LOGIN_TEST_CHANNEL || 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1024, height: 1100 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/login?institute=ics&force=1');
    const identifier = page.getByLabel('Email or student ID', { exact: true });
    const password = page.getByLabel('Password', { exact: true });
    const consent = page.getByRole('checkbox', { name: /I agree to the Terms and Conditions/ });
    await expect(identifier).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { name: 'Your next chapter starts here.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ICS', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: path.join(output, 'hero-repro.png'), animations: 'disabled' });
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true, animations: 'disabled' });

    for (const [width, height] of [[1366, 900], [736, 1024], [390, 844], [320, 720]]) {
      await page.setViewportSize({ width, height });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow at ' + width);
      await expect(identifier).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true, animations: 'disabled' });
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    const panel = page.getByRole('region', { name: 'Welcome back.', exact: true });
    await expect.poll(() => panel.evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(26, 29, 39)');
    await page.screenshot({ path: path.join(output, 'mobile-dark.png'), fullPage: true, animations: 'disabled' });
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });

    await identifier.fill('synthetic@example.invalid');
    await password.fill('Synthetic-Only-12345');
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'password');
    for (const code of ['IBE', 'ITE']) {
      await page.getByRole('button', { name: code, exact: true }).click();
      await expect(page.getByRole('button', { name: code, exact: true })).toHaveAttribute('aria-pressed', 'true');
      assert.equal(new URL(page.url()).searchParams.get('institute'), code.toLowerCase());
      assert.equal(new URL(page.url()).searchParams.get('force'), '1');
      await expect(identifier).toHaveValue('synthetic@example.invalid');
    }
    await expect(page.getByRole('link', { name: 'Forgot Password?', exact: true })).toHaveAttribute('href', '/forgot-password?institute=ite');
    await expect(page.locator('form').getByRole('link', { name: 'Contact the Registrar', exact: true })).toHaveAttribute('href', '/register?institute=ite');
    const terms = page.locator('form').getByRole('link', { name: /Terms and Conditions/ });
    await expect(terms).toHaveAttribute('target', '_blank');
    assert.equal(new URL(await terms.getAttribute('href'), base).searchParams.get('returnTo'), '/login?institute=ite&force=1');

    let releaseResponse;
    const pendingResponse = new Promise(resolve => { releaseResponse = resolve; });
    const requests = [];
    await page.route('**/api/auth/login', async route => {
      requests.push(route.request().postDataJSON());
      await pendingResponse;
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic login rejected.' }) });
    });
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    assert.equal(await consent.evaluate(input => input.validity.valueMissing), true);
    assert.equal(requests.length, 0);
    await consent.check();
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Signing In...', exact: true })).toBeDisabled();
    await expect.poll(() => requests.length).toBe(1);
    assert.deepEqual(requests[0], { identifier: 'synthetic@example.invalid', password: 'Synthetic-Only-12345', instituteCode: 'ite', acceptedPolicies: true });
    releaseResponse();
    await expect(page.locator('form').getByRole('alert')).toHaveText('Synthetic login rejected.');
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeEnabled();

    await page.goto(base + '/login?institute=ibe&desktop=admin&force=1');
    await expect(page.getByRole('heading', { name: 'Administrator sign in', exact: true })).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toBeEnabled();
    await expect(page.locator('form').getByRole('link', { name: 'Contact the Registrar', exact: true })).toHaveAttribute('href', '/register?institute=ibe&desktop=admin');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('#login-title em').evaluate(element => getComputedStyle(element, '::after').animationName), 'none');
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser.close();
  }
});
