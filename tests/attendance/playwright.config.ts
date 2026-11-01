import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: '*.browser.spec.ts', outputDir: '../../tmp/attendance/browser-results', workers: 1, reporter: 'list',
  use: { channel: 'chrome', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop-light', use: { viewport: { width: 1280, height: 900 }, colorScheme: 'light' } },
    { name: 'desktop-dark', use: { viewport: { width: 1280, height: 900 }, colorScheme: 'dark' } },
    { name: 'mobile-light', use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true, colorScheme: 'light' } },
    { name: 'mobile-dark', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'dark' } },
  ],
});
