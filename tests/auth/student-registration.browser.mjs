import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { createWebWorkspace } from '../roster/web-workspace.mjs';

export async function browserChecks({ cluster, output, check, existingGoogleProfileCookie }) {
  const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); }); });
  const base = `http://127.0.0.1:${port}`;
  const workspace = createWebWorkspace(output);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(key)));
  const server = spawn(process.execPath, ['tests/roster/browser-server.mjs'], { env: { ...env, NODE_ENV: 'development', DATABASE_URL: cluster.url, APP_BASE_URL: base, GOOGLE_CLIENT_ID: 'synthetic-client.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'SYNTHETIC_TEST_SECRET', NEXT_TELEMETRY_DISABLED: '1', ROSTER_TEST_APP_DIR: workspace.appDir, ROSTER_TEST_PORT: String(port) }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '', browser;
  server.stdout.on('data', value => { log += value; }); server.stderr.on('data', value => { log += value; });
  try {
    const deadline = Date.now() + 120000;
    let ready = false;
    while (Date.now() < deadline) {
      try { if ((await fetch(base + '/api/auth/register')).status === 405) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    assert.equal(ready, true, 'isolated Next.js server starts');
    browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    await cluster.owner.query('DELETE FROM "RateLimitBucket"');
    await check('existing Google email connects and signs into the original ICS account through the browser', async () => {
      const existingContext = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
      await existingContext.addCookies([{ name: 'lms_google_profile', value: existingGoogleProfileCookie, url: base, httpOnly: true, sameSite: 'Lax' }]);
      const existing = await existingContext.newPage();
      await existing.goto(base + '/register?google=1');
      await existing.getByRole('heading', { name: 'Sign in and connect Google' }).waitFor();
      await existing.getByText('An account already exists for this email in ICS.', { exact: true }).waitFor();
      assert.equal(await existing.getByLabel('Full name', { exact: true }).getAttribute('readonly'), '');
      assert.equal(await existing.getByLabel('Student ID', { exact: true }).inputValue(), 'LEGACY-ICS-7');
      assert.equal(await existing.getByLabel('Student ID', { exact: true }).getAttribute('readonly'), '');
      assert.equal(await existing.locator('input[name=confirmPassword]').count(), 0);
      assert.equal(await existing.getByRole('button', { name: 'ITE', exact: true }).isDisabled(), true);
      await existing.getByRole('link', { name: 'Forgot your LMS password?' }).waitFor();
      await existing.getByLabel('Existing password', { exact: true }).fill('wrong');
      await existing.locator('input[name=acceptedPolicies]').check();
      await existing.getByRole('button', { name: 'Connect Google and sign in' }).click();
      await existing.getByRole('alert').filter({ hasText: 'Your LMS password is incorrect' }).waitFor();
      await existing.getByLabel('Existing password', { exact: true }).fill('BrowserExisting123!');
      await existing.screenshot({ path: path.join(output, 'existing-google-desktop.png'), fullPage: true });
      await existing.setViewportSize({ width: 390, height: 844 });
      assert.ok(await existing.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await existing.screenshot({ path: path.join(output, 'existing-google-mobile.png'), fullPage: true });
      await existing.getByRole('button', { name: 'Connect Google and sign in' }).click();
      await existing.waitForURL('**/join-class');
      const result = await cluster.owner.query(`SELECT id, name, "studentNumber", "googleSubject" FROM "User" WHERE email = $1`, ['browser-existing@example.invalid']);
      assert.equal(result.rowCount, 1); assert.equal(result.rows[0].googleSubject, 'browser-existing-google');
      assert.equal(result.rows[0].name, 'Existing Browser Student'); assert.equal(result.rows[0].studentNumber, 'LEGACY-ICS-7');
      const me = await (await existingContext.request.get(base + '/api/auth/me')).json();
      assert.equal(me.user.id, result.rows[0].id); assert.equal(me.user.institute.code, 'ics');
      await existingContext.close();
    });
    await cluster.owner.query('DELETE FROM "RateLimitBucket"');
    await check('desktop and mobile registration forms fit, validate, and show Google sign-in', async () => {
      await page.goto(base + '/register?institute=ite');
      await page.getByRole('heading', { name: 'Create your student account' }).waitFor();
      await page.getByRole('button', { name: 'Continue with Google' }).waitFor();
      assert.equal(await page.locator('input[name=acceptedPolicies]').count(), 1);
      await page.getByRole('button', { name: 'Continue with Google' }).click();
      await page.getByRole('alert').filter({ hasText: 'Agree to the Terms' }).waitFor();
      assert.equal(await page.locator('input[name=name]').inputValue(), '');
      await page.getByRole('button', { name: 'ICS', exact: true }).click();
      await page.getByRole('button', { name: 'ITE', exact: true }).click();
      assert.equal(await page.locator('input[name=instituteCode]').inputValue(), 'ite');
      await page.screenshot({ path: path.join(output, 'registration-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(output, 'registration-mobile.png'), fullPage: true });
      await page.getByLabel('Full name', { exact: true }).fill('Browser Student');
      await page.getByLabel('Student ID', { exact: false }).fill('bad-id');
      assert.equal(await page.locator('input[name=studentNumber]').evaluate(input => input.checkValidity()), false);
      await page.getByLabel('Student ID', { exact: false }).fill('26-45678');
      await page.getByLabel('Email', { exact: true }).fill('browser@example.invalid');
      await page.getByLabel('Password', { exact: true }).fill('Browser123!');
      await page.getByLabel('Confirm password', { exact: true }).fill('Browser123!');
      await page.locator('input[name=acceptedPolicies]').first().check();
      await page.getByRole('button', { name: 'Create account', exact: true }).click();
      await page.waitForURL('**/join-class');
      await page.getByRole('heading', { name: 'Join your first class' }).waitFor();
      await page.screenshot({ path: path.join(output, 'join-class-mobile.png'), fullPage: true });
    });
    await check('direct institute URLs and feature APIs remain blocked before a class code', async () => {
      await page.goto(base + '/ite/students'); await page.waitForURL('**/join-class');
      for (const route of ['/api/courses?institute=ite', '/api/workspace/notes', '/api/gamification/badges', '/api/flashcards/decks', '/api/ite/focus/summary', '/api/practicum/placements', '/api/ite/meetings']) {
        const response = await context.request.get(base + route);
        assert.ok([401, 403].includes(response.status()), route + ' must not expose feature data');
      }
      await page.getByLabel('Class code', { exact: true }).fill('ICS123');
      await page.getByRole('button', { name: 'Join class and continue' }).click();
      await page.getByRole('alert').filter({ hasText: 'not available in your institute' }).waitFor();
      assert.ok(page.url().endsWith('/join-class'));
    });
    await check('correct institute code unlocks the dashboard and class list in the browser', async () => {
      await page.getByLabel('Class code', { exact: true }).fill('ITE123');
      await page.getByRole('button', { name: 'Join class and continue' }).click();
      await page.waitForURL('**/ite/students');
      const response = await context.request.get(base + '/api/courses?institute=ite'); assert.equal(response.status(), 200);
      const courses = await response.json(); assert.ok(courses.courses.some(course => course.id === 'ite-class'));
      assert.equal((await context.request.get(base + '/api/announcements?institute=ics')).status(), 403);
      for (const route of ['/api/ite/focus/summary', '/api/practicum/placements', '/api/ite/meetings']) assert.equal((await context.request.get(base + route)).status(), 200, route + ' unlocks after same-institute enrollment');
      await page.setViewportSize({ width: 1366, height: 900 });
      await page.goto(base + '/join-class'); assert.ok(!page.url().endsWith('/join-class'));
    });
    await check('Google button starts the server OAuth flow and sets an HttpOnly state cookie', async () => {
      const fresh = await browser.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
      await fresh.route('https://accounts.google.com/**', route => route.abort());
      const login = await fresh.newPage(); await login.goto(base + '/login?institute=ite');
      const form = login.locator('form').filter({ has: login.getByRole('button', { name: 'Continue with Google' }) });
      assert.equal(await login.locator('input[name=acceptedPolicies]').count(), 1);
      assert.equal(await login.getByRole('link', { name: 'Request a New Activation Link' }).count(), 0);
      await form.getByRole('button', { name: 'Continue with Google' }).click();
      await login.getByRole('alert').filter({ hasText: 'Agree to the Terms' }).waitFor();
      await form.locator('input[name=acceptedPolicies]').check();
      const consentBox = await form.locator('input[name=acceptedPolicies]').boundingBox();
      const registerBox = await form.getByRole('link', { name: 'Create student account' }).boundingBox();
      const signInBox = await form.getByRole('button', { name: 'Sign In', exact: true }).boundingBox();
      const googleBox = await form.getByRole('button', { name: 'Continue with Google' }).boundingBox();
      assert.ok(consentBox.y < registerBox.y && registerBox.y < signInBox.y && signInBox.y + signInBox.height <= googleBox.y);
      await login.screenshot({ path: path.join(output, 'login-desktop.png'), fullPage: true });
      await login.setViewportSize({ width: 390, height: 844 });
      assert.ok(await login.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await login.screenshot({ path: path.join(output, 'login-mobile.png'), fullPage: true });
      await login.route('**/api/auth/google', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Test provider temporarily unavailable' }) }));
      await form.getByRole('button', { name: 'Continue with Google' }).click();
      await login.getByRole('alert').filter({ hasText: 'Test provider temporarily unavailable' }).waitFor();
      assert.equal(await form.getByRole('button', { name: 'Continue with Google' }).isEnabled(), true);
      await login.unroute('**/api/auth/google');
      const request = login.waitForRequest('https://accounts.google.com/**');
      await form.getByRole('button', { name: 'Continue with Google' }).click();
      const url = new URL((await request).url()); assert.equal(url.searchParams.get('redirect_uri'), base + '/api/auth/callback/google');
      assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
      assert.ok((await fresh.cookies()).some(cookie => cookie.name === 'lms_google_flow' && cookie.httpOnly));
      const registration = await fresh.newPage();
      await registration.goto(base + '/register?institute=ics');
      await registration.getByRole('button', { name: 'IBE', exact: true }).click();
      await registration.locator('input[name=acceptedPolicies]').check();
      const registrationRequest = registration.waitForRequest('https://accounts.google.com/**');
      const registrationPost = registration.waitForRequest(request => request.url() === base + '/api/auth/google' && request.method() === 'POST');
      await registration.getByRole('button', { name: 'Continue with Google' }).click();
      const post = await registrationPost;
      assert.match(post.postData(), /name="instituteCode"\r?\n\r?\nibe/);
      assert.equal(new URL((await registrationRequest).url()).searchParams.get('redirect_uri'), base + '/api/auth/callback/google');
      await fresh.close();
    });
  } finally {
    fs.writeFileSync(path.join(output, 'browser-server.log'), log.replaceAll(cluster.url, '[LOCAL_DATABASE]'));
    await browser?.close();
    if (server.exitCode === null) { const stopped = new Promise(resolve => server.once('close', resolve)); server.kill(); await stopped; }
    workspace.dispose();
  }
}
