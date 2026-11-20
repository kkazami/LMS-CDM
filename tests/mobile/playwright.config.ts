import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '.', testMatch: 'embedded.browser.spec.ts', workers: 1, outputDir: '../../tmp/mobile-embedded-results', reporter: 'list', use: { channel: 'msedge', headless: true, reducedMotion: 'reduce' } });
