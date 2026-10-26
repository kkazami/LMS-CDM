import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

const file = process.env.LAB_E2E_STATE;
if (!file || !path.resolve(file).startsWith(path.resolve('tmp/roster-import/labs-browser-'))) throw Error('Use node tests/labs/browser.mjs to create an owned synthetic target.');
const state = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!state.owned || state.runId !== process.env.LAB_E2E_RUN || new URL(state.origin).hostname !== '127.0.0.1') throw Error('Owned loopback browser target required.');

export default defineConfig({
  testDir: '.', testMatch: 'pilot.spec.ts', workers: 1, fullyParallel: false, retries: 0, timeout: 300000,
  expect: { timeout: 20000 }, outputDir: path.join(state.output, 'browser-artifacts'),
  reporter: [['list'], ['json', { outputFile: path.join(state.output, 'playwright.json') }]],
  use: { baseURL: state.origin, ignoreHTTPSErrors: true, actionTimeout: 15000, navigationTimeout: 30000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'chrome', viewport: { width: 1440, height: 960 } } }],
});
