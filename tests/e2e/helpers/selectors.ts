/**
 * Centralized test selector helpers.
 *
 * Preferred selector strategy (in order):
 * 1. getByRole — accessible role queries
 * 2. getByLabel — form field labels
 * 3. getByText — visible text content
 * 4. getByPlaceholder — placeholder text
 * 5. getByTestId — data-testid attributes
 * 6. CSS/XPath — only when absolutely necessary
 *
 * Use this module for selectors that are reused across multiple test files.
 */

import type { Page, Locator } from '@playwright/test';

/** Login form selectors */
export function loginForm(page: Page) {
  return {
    email: page.getByLabel(/email/i),
    password: page.getByLabel('Password', { exact: true }),
    submitButton: page.getByRole('button', { name: /sign in|log in|login/i }),
  };
}

/** Navigation/header selectors */
export function mainNav(page: Page) {
  return {
    nav: page.getByRole('navigation'),
    logo: page.getByRole('link', { name: /lumina|cdm|lms|home/i }),
    userMenu: page.getByRole('button', { name: /menu|profile|account/i }),
  };
}

/** Sidebar selectors (dashboard) */
export function sidebar(page: Page) {
  return {
    sidebar: page.getByRole('complementary').or(page.locator('[data-testid="sidebar"]')),
    dashboardLink: page.getByRole('link', { name: /dashboard/i }),
    coursesLink: page.getByRole('link', { name: /courses/i }),
  };
}

/** Generic helpers */
export function getLoadingSpinner(page: Page): Locator {
  return page.getByRole('status').or(page.locator('[data-testid="loading"]'));
}

export function getToast(page: Page): Locator {
  return page.getByRole('alert').or(page.locator('[data-testid="toast"]'));
}
