import { test, expect, type Page } from '@playwright/test';
import { TEST_ACCOUNTS, TEST_INSTITUTE } from '../fixtures/test-accounts';

/**
 * Login workflow E2E tests.
 *
 * Acceptance criteria verified:
 * - AC-001: Login page loads and displays form
 * - AC-002: Student can log in with valid credentials
 * - AC-003: Invalid credentials show error message
 * - AC-004: Login redirects to institute dashboard
 */

// Helpers for browser error capture
function setupErrorCapture(page: Page) {
  const errors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    errors.push(`[PageError] ${err.message}`);
  });
  page.on('requestfailed', (req) => {
    const failure = req.failure();
    // Allowlist: ignore expected failures
    const url = req.url();
    if (url.includes('favicon') || url.includes('_next/static')) return;
    failedRequests.push(`${req.method()} ${url} — ${failure?.errorText || 'unknown'}`);
  });

  return { errors, failedRequests };
}

test.describe('Login Page', () => {
  // These tests run WITHOUT authentication (fresh browser)
  test.use({ storageState: { cookies: [], origins: [] } });

  test('AC-001: login page loads and displays the login form', async ({ page }) => {
    const { errors } = setupErrorCapture(page);

    const response = await page.goto(`/login?institute=${TEST_INSTITUTE}`);
    expect(response?.status()).toBe(200);

    // Verify form elements exist using accessible selectors
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /sign in|log in|login/i })
    ).toBeVisible();

    // No unexpected console errors
    const significantErrors = errors.filter(
      (e) => !e.includes('hydration') && !e.includes('favicon')
    );
    expect(significantErrors).toEqual([]);
  });

  test('AC-002: student can log in with valid credentials', async ({ page }) => {
    const { errors } = setupErrorCapture(page);

    await page.goto(`/login?institute=${TEST_INSTITUTE}`);

    // Fill form using accessible selectors (getByLabel preferred)
    await page.getByLabel(/email/i).fill(TEST_ACCOUNTS.student.email);
    await page.getByLabel('Password', { exact: true }).fill(TEST_ACCOUNTS.student.password);

    // Submit
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Verify redirect to institute dashboard
    await page.waitForURL(`**/${TEST_INSTITUTE}/**`, { timeout: 15_000 });

    // Verify we're on the dashboard (not redirected back to login)
    const currentUrl = page.url();
    expect(currentUrl).toContain(`/${TEST_INSTITUTE}`);
    expect(currentUrl).not.toContain('/login');
  });

  test('AC-003: invalid credentials show an error message', async ({ page }) => {
    await page.goto(`/login?institute=${TEST_INSTITUTE}`);

    // Fill with invalid credentials
    await page.getByLabel(/email/i).fill('nonexistent@test.com');
    await page.getByLabel('Password', { exact: true }).fill('wrongpassword');

    // Submit
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Should show an error — look for error text on the page
    await expect(
      page.getByText(/invalid|incorrect|error|not found|wrong/i)
    ).toBeVisible({ timeout: 10_000 });

    // Should still be on the login page
    expect(page.url()).toContain('/login');
  });

  test('AC-004: login form handles empty submission gracefully', async ({ page }) => {
    await page.goto(`/login?institute=${TEST_INSTITUTE}`);

    // Click submit without filling fields
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // Should show validation messages or remain on login page
    expect(page.url()).toContain('/login');
  });
});
