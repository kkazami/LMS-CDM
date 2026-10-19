import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "*.browser.spec.ts", workers: 1,
  outputDir: "../../tmp/calendar-browser-results", reporter: "list",
  use: { channel: "chrome", headless: true, screenshot: "only-on-failure" },
});
