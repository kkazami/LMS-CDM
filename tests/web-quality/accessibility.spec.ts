import { test, expect } from '@playwright/test';
import { login } from './browser-helpers';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

test('search has an accessible name, traps keyboard focus and restores it after Escape', async ({ page }, info) => {
  await login(page, 'teacher', info);
  const trigger = page.getByRole('button', { name: /Search courses, notes, or peers|^Search$/ }).filter({ visible: true }).first();
  // Narrow web uses the same keyboard command when the compact trigger is hidden.
  if (await trigger.count()) { await trigger.focus(); await trigger.click(); }
  else { await page.getByRole('button', { name: 'Toggle theme' }).focus(); await page.keyboard.press('Control+k'); }
  const before = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  const dialog = page.getByRole('dialog', { name: 'Search CdM LMS' }); await expect(dialog).toBeVisible();
  const input = dialog.getByRole('textbox', { name: 'Search courses and tools' }); await expect(input).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(dialog.getByRole('button').last()).toBeFocused();
  await page.keyboard.press('Tab'); await expect(input).toBeFocused();
  await input.fill('zz-no-matching-tool'); await expect(dialog.getByText(/No results found/)).toBeVisible();
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await expect(input).toBeFocused();
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  if (await trigger.count()) await expect(trigger).toBeFocused();
  else await expect(page.getByRole('button', { name: 'Toggle theme' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('CodeLab Monaco editor loads and accepts edits under the production CSP', async ({ page, context }, info) => {
  // Serve the installed, unmodified Monaco distribution at its configured CDN URLs.
  // This isolates CSP compatibility from the availability of the external CDN.
  const root = path.join(path.dirname(createRequire(path.resolve('apps/web/package.json')).resolve('monaco-editor/package.json')), 'min/vs');
  await context.route('https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/**', async route => {
    const suffix = decodeURIComponent(new URL(route.request().url()).pathname.split('/min/vs/')[1] || '');
    const file = path.resolve(root, suffix);
    if (!file.startsWith(root + path.sep)) return route.abort();
    try { await route.fulfill({ body: await fs.readFile(file), contentType: file.endsWith('.css') ? 'text/css' : file.endsWith('.woff') ? 'font/woff' : 'application/javascript', headers: { 'Access-Control-Allow-Origin': '*' } }); }
    catch { await route.abort(); }
  });
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', event => { (window as any).__cspViolations ||= []; (window as any).__cspViolations.push(`${event.effectiveDirective}: ${event.blockedURI}`); }));
  await login(page, 'student', info);
  await page.goto('/ics/activities/codelab/javascript/1');
  const editorTab = page.getByRole('button', { name: 'Editor', exact: true });
  if (await editorTab.count()) await editorTab.click();
  await expect(page.locator('.monaco-editor').first()).toBeVisible();
  const input = page.locator('.monaco-editor textarea').first(); await input.focus();
  await page.keyboard.press('Control+End'); await page.keyboard.insertText('\n// Synthetic CSP edit');
  await expect.poll(() => page.evaluate(() => (window as any).monaco?.editor.getModels().some((model: any) => model.getValue().includes('Synthetic CSP edit')))).toBe(true);
  expect((await page.evaluate(() => (window as any).__cspViolations || [])).filter((value: string) => value.startsWith('script-src'))).toEqual([]);
});

test('production nonce policy permits real hydration and authenticated navigation', async ({ page }, info) => {
  const violations: string[] = [];
  await page.addInitScript(() => document.addEventListener('securitypolicyviolation', event => { (window as any).__cspViolations ||= []; (window as any).__cspViolations.push(`${event.effectiveDirective}: ${event.blockedURI}`); }));
  const response = await page.goto('/login?institute=ics');
  const csp = response!.headers()['content-security-policy']; expect(csp).toMatch(/nonce-/); expect(csp).not.toMatch(/script-src[^;]*unsafe-(inline|eval)/);
  const scripts = await page.locator('script').evaluateAll(nodes => nodes.filter(node => node.textContent?.trim() || node.src).map(node => node.nonce));
  expect(scripts.length).toBeGreaterThan(0); expect(scripts.every(Boolean)).toBe(true);
  const teacher = await login(page, 'teacher', info); await page.goto('/ics/analytics');
  await expect(page.getByRole('heading', { name: 'Student Analytics & Risk Identification' })).toBeVisible();
  const risk = await page.request.get('/api/analytics/at-risk?page=1'); expect(risk.status()).toBe(200);
  const analysis = await risk.json(); expect(analysis.pagination.total).toBe(1); expect(analysis.atRiskStudents[0].courseId).toBe(teacher.courseId);
  violations.push(...await page.evaluate(() => (window as any).__cspViolations || []));
  expect(violations.filter(value => value.startsWith('script-src'))).toEqual([]);
});
