import type { Page } from '@playwright/test';
import { TEST_INSTITUTE } from '../fixtures/test-accounts';

/**
 * Navigation helpers for E2E tests.
 * Use these instead of raw page.goto() for common routes.
 */

export async function goToLogin(page: Page, institute: string = TEST_INSTITUTE) {
  await page.goto(`/login?institute=${institute}`);
}

export async function goToRegister(page: Page, institute: string = TEST_INSTITUTE) {
  await page.goto(`/register?institute=${institute}`);
}

export async function goToDashboard(page: Page, institute: string = TEST_INSTITUTE) {
  await page.goto(`/${institute}`);
}

export async function goToCourses(page: Page, institute: string = TEST_INSTITUTE) {
  await page.goto(`/${institute}/courses`);
}

/**
 * Wait for page to finish loading (network idle + no pending navigations).
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
}
