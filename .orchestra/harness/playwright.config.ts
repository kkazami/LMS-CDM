import config from '../../playwright.config';
import { defineConfig } from '@playwright/test';
import path from 'node:path';

// Dedicated evidence capture; ordinary developer Playwright behavior stays intact.
const fixture = process.env.HARNESS_BROWSER_FIXTURE === '1';
if (!process.env.HARNESS_RESULT_PATH || (!fixture && !process.env.HARNESS_TEST_DATABASE_URL)) throw new Error('Use the harness runner with a disposable database or isolated harness HTML fixture');
export default defineConfig({
  ...config,
  testDir: fixture ? '../../tests/harness-fixtures' : '../../tests/e2e',
  outputDir: process.env.HARNESS_RESULT_PATH + '.assets',
  forbidOnly: true,
  retries: 0,
  reporter: [['json', { outputFile: process.env.HARNESS_RESULT_PATH }]],
  ...(fixture ? { projects: [{ name: 'fixture-chromium', use: { channel: 'chrome', baseURL: process.env.E2E_BASE_URL } }],
    webServer: { command: 'node .orchestra/harness/fixture-server.cjs', cwd: path.resolve(__dirname, '../..'), url: process.env.E2E_BASE_URL + '/health', reuseExistingServer: false, timeout: 15000 } }
    : { webServer: config.webServer && !Array.isArray(config.webServer) ? { ...config.webServer, cwd: path.resolve(__dirname, '../..'), reuseExistingServer: false, env: { DATABASE_URL: process.env.HARNESS_TEST_DATABASE_URL! } } : undefined }),
});
