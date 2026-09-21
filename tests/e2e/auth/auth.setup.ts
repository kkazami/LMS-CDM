import { test as setup, expect } from '@playwright/test';
import { TEST_ACCOUNTS, TEST_INSTITUTE } from '../fixtures/test-accounts';
import path from 'path';

const AUTH_DIR = path.resolve('./playwright/.auth');

/**
 * Authentication setup — runs before all test projects.
 * Logs in as each role and saves the authenticated browser state
 * to reusable storageState files in playwright/.auth/ (gitignored).
 */

setup('authenticate as student', async ({ page }) => {
  await page.goto(`/login?institute=${TEST_INSTITUTE}`);

  // Fill login form using accessible selectors
  await page.getByLabel(/email/i).fill(TEST_ACCOUNTS.student.email);
  await page.getByLabel('Password', { exact: true }).fill(TEST_ACCOUNTS.student.password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(`**/${TEST_INSTITUTE}/**`, { timeout: 15_000 });

  // Save authenticated state
  await page.context().storageState({
    path: path.join(AUTH_DIR, 'student.json'),
  });
});

setup('authenticate as instructor', async ({ page }) => {
  await page.goto(`/login?institute=${TEST_INSTITUTE}`);

  await page.getByLabel(/email/i).fill(TEST_ACCOUNTS.instructor.email);
  await page.getByLabel('Password', { exact: true }).fill(TEST_ACCOUNTS.instructor.password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();

  await page.waitForURL(`**/${TEST_INSTITUTE}/**`, { timeout: 15_000 });

  await page.context().storageState({
    path: path.join(AUTH_DIR, 'instructor.json'),
  });
});

setup('authenticate as admin', async ({ page }) => {
  await page.goto(`/login?institute=${TEST_INSTITUTE}`);

  await page.getByLabel(/email/i).fill(TEST_ACCOUNTS.admin.email);
  await page.getByLabel('Password', { exact: true }).fill(TEST_ACCOUNTS.admin.password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();

  await page.waitForURL(`**/${TEST_INSTITUTE}/**`, { timeout: 15_000 });

  await page.context().storageState({
    path: path.join(AUTH_DIR, 'admin.json'),
  });
});
