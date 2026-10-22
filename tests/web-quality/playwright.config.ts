import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@playwright/test';
const file = process.env.WEB_QUALITY_STATE;
if (!file || !path.resolve(file).startsWith(path.resolve('tmp/roster-import') + path.sep)) throw new Error('Use node --import tsx tests/web-quality/sprint2.mjs to create an owned test target.');
const state = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!state.owned || state.runId !== process.env.WEB_QUALITY_OWNED_RUN || new URL(state.origin).hostname !== '127.0.0.1') throw new Error('Owned loopback target provenance failed.');
export default defineConfig({
  testDir: '.', testMatch: ['workflows.spec.ts', 'accessibility.spec.ts'], workers: 1, fullyParallel: false, timeout: 60000, maxFailures: 2,
  expect: { timeout: 15000 }, outputDir: path.join(state.output, 'browser-artifacts'),
  reporter: [['list'], ['json', { outputFile: path.join(state.output, 'playwright.json') }]],
  use: { baseURL: state.origin, ignoreHTTPSErrors: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', channel: 'chrome', viewport: { width: 1440, height: 900 } } },
    { name: 'firefox', use: { browserName: 'firefox', viewport: { width: 1440, height: 900 } } },
    { name: 'webkit', use: { browserName: 'webkit', viewport: { width: 1440, height: 900 } } },
    { name: 'narrow-web', use: { browserName: 'chromium', channel: 'chrome', viewport: { width: 390, height: 844 } } },
  ],
});
