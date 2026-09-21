import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for the CdM LMS E2E test suite.
 *
 * Key design decisions:
 * - webServer auto-starts Next.js dev server (no manual startup)
 * - trace + screenshot captured on failure for harness evidence
 * - HTML + JSON reporters for human + machine consumption
 * - Mobile viewport project for responsive verification
 * - Auth setup project for reusable authenticated state
 * - Sequential execution (workers: 1) for DB-dependent tests
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './playwright/results',

  /* Run tests sequentially — the LMS has shared DB state */
  fullyParallel: false,
  workers: 1,

  /* Fail CI if test.only is left in source */
  forbidOnly: !!process.env.CI,

  /* Retry on CI to handle flakiness */
  retries: process.env.CI ? 2 : 0,

  /* Reporters: HTML for humans, JSON for QA agent, list for terminal */
  reporter: [
    ['list'],
    ['html', { outputFolder: './playwright/report', open: 'never' }],
    ['json', { outputFile: './playwright/results/results.json' }],
  ],

  /* Shared settings for all projects */
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',

    /* Evidence capture on failure */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',

    /* Timeout for actions */
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },

  /* Test timeout */
  timeout: 60_000,

  /* Expect timeout */
  expect: {
    timeout: 10_000,
  },

  projects: [
    /* Authentication setup — runs first, saves storageState */
    {
      name: 'auth-setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        channel: 'chrome',
      },
    },

    /* Desktop Chrome — uses system-installed Chrome */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        storageState: path.resolve('./playwright/.auth/student.json'),
      },
      dependencies: ['auth-setup'],
      testIgnore: /.*\.setup\.ts/,
    },

    /* Mobile Chrome — responsive viewport testing */
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        channel: 'chrome',
        storageState: path.resolve('./playwright/.auth/student.json'),
      },
      dependencies: ['auth-setup'],
      testMatch: /.*\.responsive\.spec\.ts/,
    },
  ],

  /* Auto-start the Next.js dev server */
  webServer: {
    command: process.env.E2E_USE_BUILD
      ? 'pnpm --filter web start'
      : 'pnpm dev:web',
    url: process.env.E2E_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
