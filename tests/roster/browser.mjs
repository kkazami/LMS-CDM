import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

export async function browserChecks({
  url,
  token,
  actor,
  invitations,
  driver,
  sent,
  check,
  output,
  safeEnv,
  termId,
  previewMatches,
}) {
  const port = await new Promise((resolve) => {
    const listener = net.createServer();
    listener.listen(0, "127.0.0.1", () => {
      const port = listener.address().port;
      listener.close(() => resolve(port));
    });
  });
  const base = "http://127.0.0.1:" + port;
  const workspace = fs.mkdtempSync(path.join(output, "browser-workspace-"));
  const appDir = path.join(workspace, "apps/web");
  fs.mkdirSync(appDir, { recursive: true });
  for (const dir of ["src", "public"])
    fs.cpSync(path.resolve("apps/web", dir), path.join(appDir, dir), {
      recursive: true,
      filter: (source) =>
        !source.replaceAll("\\", "/").includes("/public/uploads"),
    });
  for (const file of [
    "package.json",
    "tsconfig.json",
    "postcss.config.js",
    "postcss.config.mjs",
    "next.config.ts",
  ])
    if (fs.existsSync(path.resolve("apps/web", file)))
      fs.copyFileSync(path.resolve("apps/web", file), path.join(appDir, file));
  for (const file of [
    "package.json",
    "tsconfig.base.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
  ])
    fs.copyFileSync(path.resolve(file), path.join(workspace, file));
  fs.symlinkSync(
    path.resolve("apps/web/node_modules"),
    path.join(appDir, "node_modules"),
    "junction",
  );
  fs.symlinkSync(
    path.resolve("node_modules"),
    path.join(workspace, "node_modules"),
    "junction",
  );
  fs.symlinkSync(
    path.resolve("packages"),
    path.join(workspace, "packages"),
    "junction",
  );
  const server = spawn(process.execPath, ["tests/roster/browser-server.mjs"], {
    env: {
      ...safeEnv,
      NODE_ENV: "development",
      DATABASE_URL: url,
      POSTGRES_URL: url,
      POSTGRES_PRISMA_URL: url,
      NEXT_TELEMETRY_DISABLED: "1",
      ROSTER_TEST_PORT: String(port),
      ROSTER_TEST_APP_DIR: appDir,
      SMTP_HOST: "synthetic.invalid",
      SMTP_USER: "synthetic@example.invalid",
      SMTP_PASS: "SYNTHETIC_NOT_REAL",
      EMAIL_INVITATIONS_ENABLED: "true",
      APP_BASE_URL: base,
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "",
    closed = false,
    browser;
  server.stdout.on("data", (value) => (log += value));
  server.stderr.on("data", (value) => (log += value));
  server.on("close", () => (closed = true));
  try {
    const deadline = Date.now() + 120000;
    let ready = false;
    while (Date.now() < deadline && !closed) {
      try {
        const response = await fetch(base + "/api/auth/register");
        if (response.status === 405) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.equal(ready, true, "Isolated Next dev server starts.");
    browser = await chromium.launch({
      executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
      headless: true,
    });
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    });
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === base
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await check(
      "Browser registration page provides Registrar guidance at desktop and mobile sizes",
      async () => {
        await page.goto(base + "/register");
        await page
          .getByRole("heading", { name: "Request LMS Access" })
          .waitFor();
        assert.equal(await page.locator("input[type=password]").count(), 0);
        await page
          .getByRole("link", { name: "Request a New Activation Link" })
          .waitFor();
        await page.screenshot({
          path: path.join(output, "registration-desktop.png"),
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({
          path: path.join(output, "registration-mobile.png"),
          fullPage: true,
        });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.setViewportSize({ width: 1366, height: 900 });
      },
    );
    await context.addCookies([
      { name: "lumina_session", value: token, url: base },
    ]);
    await check(
      "Browser imports a student and course, confirms enrollment, and queues an invitation",
      async () => {
        await page.goto(base + "/ics/admin/onboarding");
        await page.locator('main')
          .getByRole("heading", { name: "Students and Classes" })
          .waitFor();
        assert.equal(await page.getByRole('link', { name: 'Account Management', exact: true }).getAttribute('aria-current'), 'page');
        assert.equal(await page.getByRole('link', { name: 'Dashboard', exact: true }).getAttribute('aria-current'), null);
        await page
          .getByLabel("Or paste CSV")
          .fill(
            "student_Id,last_name,first_name,email,program,section\n0024-00008,Student,Browser,browser@example.invalid,BSIT,BSIT-1A",
          );
        await page
          .getByRole("button", { name: "Review import", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Import selected rows", exact: true })
          .waitFor();
        await page.screenshot({
          path: path.join(output, "student-preview-desktop.png"),
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction(() => {
          const shell = document.querySelector('.dashboard-workspace-shell');
          return !shell || parseFloat(getComputedStyle(shell).paddingLeft) === 0;
        });
        assert.ok(await page.getByRole('navigation', { name: 'Student and class setup' }).evaluate(nav =>
          [...nav.querySelectorAll('button')].every(button => button.getBoundingClientRect().right <= innerWidth + 1)),
          'Every setup tab fits on the mobile screen');
        assert.ok(await page.getByRole('table', { name: 'Import preview and row validation results' }).locator('..').evaluate(container =>
          container.getBoundingClientRect().right <= innerWidth + 1), 'Only the preview table scrolls horizontally');
        await page.screenshot({
          path: path.join(output, "student-preview-mobile.png"),
          fullPage: true,
        });
        assert.equal(await page.locator('[data-mobile-bottom-nav]').getByRole('link', { name: 'Accounts', exact: true }).getAttribute('aria-current'), 'page');
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.setViewportSize({ width: 1366, height: 900 });
        await page.waitForFunction(() => {
          const shell = document.querySelector('.dashboard-workspace-shell');
          return shell && parseFloat(getComputedStyle(shell).paddingLeft) === 288;
        });
        await page
          .getByRole("button", { name: "Import selected rows", exact: true })
          .click();
        await page.getByText(/Import complete\./).waitFor();
        await page
          .getByRole("button", { name: "Import classes", exact: true })
          .click();
        await page
          .getByLabel("Academic term", { exact: true })
          .selectOption(termId);
        await page
          .getByLabel("Or paste CSV")
          .fill(
            "courseCode,subject,title,section,room,description,instructorEmail,program\nIT201,Computing,Browser Course,BSIT-1A,Room 302,,faculty@example.invalid,BSIT",
          );
        await page
          .getByRole("button", { name: "Review import", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Import selected rows", exact: true })
          .click();
        await page.getByText(/Import complete\./).waitFor();
        await page
          .getByRole("button", { name: "Enroll students", exact: true })
          .click();
        await previewMatches();
        await page
          .getByLabel("Academic term", { exact: true })
          .selectOption(termId);
        await page
          .getByRole("button", { name: "Match students to classes" })
          .click();
        await page
          .getByRole("button", { name: "Import selected rows", exact: true })
          .click();
        await page.getByText(/Import complete\./).waitFor();
        await invitations.processInvitations(driver);
        await page
          .getByRole("button", { name: "Account invitations", exact: true })
          .click();
        await page
          .getByRole("searchbox", { name: "Search", exact: true })
          .fill("browser@example.invalid");
        await page.getByRole('row').filter({ hasText: 'browser@example.invalid' }).waitFor();
        await page
          .getByRole("button", { name: "Select this page", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Send invitations (1)" })
          .click();
        await page
          .getByRole("button", { name: "Send invitations", exact: true })
          .click();
        await page.getByText("1 invitation is waiting to send.").waitFor();
        await invitations.processInvitations(driver);
        await page.getByRole("button", { name: "Refresh" }).click();
        await page.getByRole("cell", { name: "Invitation sent", exact: true }).waitFor();
        await page.getByRole("button", { name: "Refresh", exact: true }).waitFor();
        await page.screenshot({
          path: path.join(output, "invitations-desktop.png"),
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('.dashboard-workspace-shell')).paddingLeft) < 1);
        await page.screenshot({ path: path.join(output, "invitations-mobile.png"), fullPage: true });
        await page.setViewportSize({ width: 1366, height: 900 });
      },
    );
    await check(
      "Browser activation sets a password and student ID login succeeds",
      async () => {
        const email = sent.findLast(
          (message) => message.to === "browser@example.invalid",
        );
        assert.ok(email);
        const fragment = new URL(email.text.match(/https:\/\/\S+/)[0]).hash;
        const guest = await browser.newContext({
          viewport: { width: 390, height: 844 },
        });
        await guest.route("**/*", (route) =>
          new URL(route.request().url()).origin === base
            ? route.continue()
            : route.abort(),
        );
        const student = await guest.newPage();
        student.setDefaultTimeout(60000);
        await student.goto(base + "/activate" + fragment);
        await student
          .getByRole("heading", { name: "Set Your Password" })
          .waitFor();
        assert.equal(new URL(student.url()).hash, "");
        await student.screenshot({
          path: path.join(output, "activation-mobile.png"),
          fullPage: true,
        });
        await student
          .getByLabel("New password", { exact: true })
          .fill("Synthetic-Browser-12345");
        await student
          .getByLabel("Confirm password", { exact: true })
          .fill("Synthetic-Browser-12345");
        await student
          .getByRole("button", { name: "Activate Account", exact: true })
          .click();
        await student.waitForURL(/\/login\?activated=1/);
        await student
          .getByText("Account activated. You can now sign in.")
          .waitFor();
        await student
          .getByLabel("Email or student ID", { exact: true })
          .fill("0024-00008");
        await student
          .getByLabel("Password", { exact: true })
          .fill("Synthetic-Browser-12345");
        const login = student.waitForResponse(
          (response) =>
            response.url().endsWith("/api/auth/login") &&
            response.request().method() === "POST",
        );
        await student
          .getByRole("button", { name: "Sign In", exact: true })
          .click();
        assert.equal((await login).status(), 200);
        await guest.close();
      },
    );
    assert.deepEqual(errors, [], "No browser runtime errors.");
  } finally {
    if (browser) await browser.close();
    server.kill();
    const deadline = Date.now() + 10000;
    while (!closed && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 100));
    if (!closed) server.kill("SIGKILL");
    fs.writeFileSync(path.join(output, "browser-server.log"), log);
    if (
      !path.resolve(workspace).startsWith(path.resolve(output) + path.sep) ||
      fs.lstatSync(workspace).isSymbolicLink()
    )
      throw new Error("Test workspace cleanup boundary mismatch.");
    for (const link of [
      path.join(appDir, "node_modules"),
      path.join(workspace, "node_modules"),
      path.join(workspace, "packages"),
    ])
      if (fs.lstatSync(link).isSymbolicLink()) fs.unlinkSync(link);
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}
