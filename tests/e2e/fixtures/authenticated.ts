import { test as base, expect, type Page } from '@playwright/test';
import path from 'path';

/**
 * Custom test fixtures for authenticated E2E testing.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/authenticated';
 *
 *   test('authenticated student test', async ({ studentPage }) => { ... });
 *   test('authenticated instructor test', async ({ instructorPage }) => { ... });
 *   test('authenticated admin test', async ({ adminPage }) => { ... });
 */

type AuthFixtures = {
  studentPage: Page;
  instructorPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  studentPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve('./playwright/.auth/student.json'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  instructorPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve('./playwright/.auth/instructor.json'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.resolve('./playwright/.auth/admin.json'),
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
