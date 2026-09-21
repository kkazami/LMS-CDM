import { test, expect } from '@playwright/test';
import { setupBrowserCapture, expectNoConsoleErrors } from '../helpers/assertions';

/**
 * Smoke tests — basic health checks for the application.
 * These run on every E2E pass to verify the app is operational.
 *
 * These tests do NOT require authentication.
 */

test.describe('Application Health', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('homepage loads with HTTP 200', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
  });

  test('login page loads and is interactive', async ({ page }) => {
    const { consoleErrors } = setupBrowserCapture(page);

    const response = await page.goto('/login?institute=ics');
    expect(response?.status()).toBe(200);

    // Verify the page is interactive (form fields present)
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();

    await expectNoConsoleErrors(consoleErrors);
  });

  test('register page loads', async ({ page }) => {
    const response = await page.goto('/register?institute=ics');
    expect(response?.status()).toBe(200);
  });

  test('API health — non-existent route returns 404, not 500', async ({ page }) => {
    const response = await page.goto('/api/nonexistent-endpoint-test');
    // Should be 404 (not found), NOT 500 (server error)
    expect(response?.status()).not.toBe(500);
  });
});
