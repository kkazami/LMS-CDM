import { expect, type Page } from '@playwright/test';

/**
 * Custom assertion helpers for E2E tests.
 * These verify USER BEHAVIOR, not implementation details.
 */

/**
 * Assert the page has no unexpected console errors.
 * Uses an allowlist for known/expected noise (hydration warnings, favicon, etc.).
 */
export async function expectNoConsoleErrors(
  errors: string[],
  allowlist: RegExp[] = [/hydration/i, /favicon/i, /chunk/i]
) {
  const significant = errors.filter(
    (e) => !allowlist.some((pattern) => pattern.test(e))
  );
  expect(significant).toEqual([]);
}

/**
 * Assert the page has no failed network requests.
 * Ignores expected failures (favicon, analytics, etc.).
 */
export async function expectNoFailedRequests(
  failedRequests: string[],
  allowlist: RegExp[] = [/favicon/i, /analytics/i, /_next\/static/i]
) {
  const significant = failedRequests.filter(
    (r) => !allowlist.some((pattern) => pattern.test(r))
  );
  expect(significant).toEqual([]);
}

/**
 * Assert user is on an authenticated dashboard page.
 */
export async function expectOnDashboard(page: Page, institute: string) {
  const url = page.url();
  expect(url).toContain(`/${institute}`);
  expect(url).not.toContain('/login');
  expect(url).not.toContain('/register');
}

/**
 * Assert user is on the login page.
 */
export async function expectOnLoginPage(page: Page) {
  expect(page.url()).toContain('/login');
}

/**
 * Assert a form validation error is visible.
 */
export async function expectValidationError(page: Page, messagePattern?: RegExp) {
  if (messagePattern) {
    await expect(page.getByText(messagePattern)).toBeVisible();
  } else {
    // Generic: look for any error-like text
    await expect(
      page.getByText(/error|invalid|required|must|cannot/i)
    ).toBeVisible();
  }
}

/**
 * Set up comprehensive browser error and network failure capture.
 * Call at the start of each test for thorough evidence collection.
 */
export function setupBrowserCapture(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(`[PageError] ${err.message}`);
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    const url = req.url();
    // Allowlist known noise
    if (url.includes('favicon') || url.includes('_next/static')) return;
    failedRequests.push(
      `${req.method()} ${url} — ${failure?.errorText || 'unknown'}`
    );
  });

  return { consoleErrors, pageErrors, failedRequests };
}
