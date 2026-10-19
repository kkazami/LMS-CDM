import { test, expect } from "@playwright/test";
import path from "node:path";
import { createRequire } from "node:module";
import fs from "node:fs/promises";

const require = createRequire(path.resolve("package.json"));
const { build } = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsx"))] }));
const requireWeb = createRequire(path.resolve("apps/web/package.json"));
const postcss = requireWeb("postcss");
const tailwind = requireWeb("@tailwindcss/postcss");
const screenshots = path.resolve("tmp/codelab-responsive-review");
let script = "", css = "";

test.beforeAll(async () => {
  const root = process.cwd().replaceAll("\\", "/");
  const built = await build({
    stdin: { contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import Scene from '${root}/apps/web/src/features/interactive-activities/codelab/components/CodeLabScene';
      const tests=[{input:'',expectedOutput:'Hello',isHidden:false}];
      const query=new URL(location.href).searchParams, language=query.get('language')||'python';
      createRoot(document.getElementById('root')).render(<Scene assignmentId='python-level-1' studentId='student' variantSeed='seed' startedAt='2026-10-19T00:00:00.000Z' descriptionMarkdown='Print Hello' publicTestCases={tests} fixedLanguage={language} fixedLanguageId={language==='java'?62:71} templateTitle={query.get('title')||'CodeLab Problem'} level={language==='java'?2:1}/>);
    `, resolveDir: path.resolve("apps/web"), loader: "tsx" },
    bundle: true, write: false, jsx: "automatic", tsconfig: "apps/web/tsconfig.json",
    nodePaths: [path.resolve("apps/web/node_modules")],
    plugins: [{ name: "browser-boundaries", setup(b: any) {
      b.onResolve({ filter: /^next\/link$|^\.\/CodeEditor$|^\.\/HTMLPreviewEditor$|common\/Toast$/ }, ({ path: name }: { path: string }) => ({ path: name, namespace: "mock" }));
      b.onLoad({ filter: /.*/, namespace: "mock" }, ({ path: name }: { path: string }) => ({ loader: "tsx", resolveDir: path.resolve("apps/web"), contents:
        name === "next/link" ? "export default function Link({children,...props}){return <a {...props}>{children}</a>}" :
        name.endsWith("CodeEditor") ? `import {useCodeLabStore} from '${root}/apps/web/src/features/interactive-activities/codelab/stores/codelab-store'; export function CodeEditor(){const s=useCodeLabStore();return <textarea aria-label='Code' value={s.codeByLanguage[s.language]} onChange={e=>s.updateCode(e.target.value)}/>} ` :
        name.endsWith("HTMLPreviewEditor") ? "export default function Preview(){return null}" :
        "export const toast={success(message,detail){window.notifications.push([message,detail])},error(message,detail){window.notifications.push([message,detail])}};" }));
    } }],
  });
  script = built.outputFiles[0].text;
  css = (await postcss([tailwind({ base: path.resolve("apps/web") })]).process(await fs.readFile("apps/web/src/app/globals.css", "utf8"), { from: path.resolve("apps/web/src/app/globals.css") })).css;
  await fs.mkdir(screenshots, { recursive: true });
});

test("saved completion survives reload while code remains editable and runnable", async ({ page }) => {
  let saved: { score: number; stateCheck: { sourceCode: string } } | null = null;
  let evaluations = 0, runs = 0;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("http://codelab.test/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/codelab/progress") return route.fulfill({ json: { completed: Boolean(saved), submission: saved } });
    if (url.pathname === "/api/codelab/evaluate") {
      evaluations++;
      saved = { score: 100, stateCheck: { sourceCode: route.request().postDataJSON().sourceCode } };
      return route.fulfill({ json: { publicResults: [{ passed: true, actualOutput: "Hello", time: "0" }], hiddenResults: [], totalPassed: 1, totalCases: 1, score: 100, grantedExp: 80 } });
    }
    if (url.pathname === "/api/judge0/submit") { runs++; return route.fulfill({ json: { stdout: "Practice", stderr: null, time: "0", status: { id: 3 } } }); }
    return route.fulfill({ contentType: "text/html; charset=utf-8", body: "<html><body><main id='root'></main></body></html>" });
  });
  async function mount() {
    await page.goto("http://codelab.test/level");
    await page.addStyleTag({ content: css });
    await page.evaluate(() => { (window as any).notifications = []; });
    await page.addScriptTag({ content: script });
  }
  await mount();
  await page.getByRole("button", { name: "Submit Solution", exact: true }).waitFor();
  await page.getByLabel("Code", { exact: true }).fill("print('Hello')");
  await page.getByRole("button", { name: "Submit Solution", exact: true }).click();
  await expect(page.getByRole("button", { name: "Completed", exact: true })).toBeDisabled();
  expect(evaluations).toBe(1);
  await mount();
  await expect(page.getByRole("button", { name: "Completed", exact: true })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Saved · 100/100");
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByLabel("Code", { exact: true })).toHaveValue("print('Hello')");
  await page.getByLabel("Code", { exact: true }).fill("print('Practice')");
  await page.getByRole("button", { name: "Run Tests", exact: true }).click();
  await expect.poll(() => runs).toBe(1);
  expect(evaluations).toBe(1);
  expect(saved!.stateCheck.sourceCode).toBe("print('Hello')");
  expect(await page.evaluate(() => (window as any).notifications)).toEqual([]);
  expect(errors).toEqual([]);
});

test("compiler diagnostics are visible and runner outages are not failed student tests", async ({ page }) => {
  let runs = 0;
  await page.route("http://codelab.test/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/codelab/progress") return route.fulfill({ json: { completed: false } });
    if (url.pathname === "/api/judge0/submit") {
      runs++;
      if (runs === 1) return route.fulfill({ json: { stdout: null, stderr: null, compile_output: "main.cpp: error: expected semicolon", time: "0", status: { id: 6, description: "Compilation Error" } } });
      return route.fulfill({ status: 503, json: { code: "RUNNER_UNAVAILABLE", error: "The code runner is temporarily unavailable. Please try again." } });
    }
    return route.fulfill({ contentType: "text/html", body: "<html><body><main id='root'></main></body></html>" });
  });
  await page.goto("http://codelab.test/level");
  await page.addStyleTag({ content: css });
  await page.evaluate(() => { (window as any).notifications = []; });
  await page.addScriptTag({ content: script });
  const run = page.getByRole("button", { name: "Run Tests", exact: true });
  await expect(run).toBeEnabled();
  await run.click();
  await expect(page.getByText("Compilation Error", { exact: true })).toBeVisible();
  await expect(page.getByText("main.cpp: error: expected semicolon", { exact: true })).toBeVisible();
  await run.click();
  await expect(page.getByText("Code runner unavailable", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Test Case #1 Failed" })).toHaveCount(0);
  await expect(run).toBeEnabled();
});

test("a failed save remains retryable and never celebrates an unsaved completion", async ({ page }) => {
  let attempts = 0;
  await page.route("http://codelab.test/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/codelab/progress") return route.fulfill({ json: { completed: false } });
    if (url.pathname === "/api/codelab/evaluate") {
      attempts++;
      if (attempts === 1) return route.fulfill({ status: 503, json: { error: "Unable to save. Please try again." } });
      return route.fulfill({ json: { publicResults: [{ passed: true, actualOutput: "Hello", time: "0" }], hiddenResults: [], totalPassed: 1, totalCases: 1, score: 100, grantedExp: 0 } });
    }
    return route.fulfill({ contentType: "text/html", body: "<html><body><main id='root'></main></body></html>" });
  });
  await page.goto("http://codelab.test/level");
  await page.addStyleTag({ content: css });
  await page.evaluate(() => { (window as any).notifications = []; });
  await page.addScriptTag({ content: script });
  const submit = page.getByRole("button", { name: "Submit Solution", exact: true });
  await submit.click();
  await expect(page.getByText("Code runner unavailable", { exact: true })).toBeVisible();
  await expect(page.getByText("Unable to save. Please try again.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Test Case #1 Failed" })).toHaveCount(0);
  await expect(submit).toBeEnabled();
  await expect(page.getByText("Level completed", { exact: true })).toHaveCount(0);
  await expect(page.locator("canvas")).toHaveCount(0);
  await submit.click();
  await expect(page.getByRole("status")).toContainText("Saved · 100/100");
  expect(attempts).toBe(2);
});

for (const viewport of [
  { width: 320, height: 667, language: 'java', dark: false },
  { width: 390, height: 844, language: 'java', dark: true },
  { width: 500, height: 780, language: 'javascript', dark: false },
  { width: 667, height: 375, language: 'java', dark: false },
  { width: 768, height: 900, language: 'python', dark: false },
  { width: 1366, height: 900, language: 'java', dark: false },
]) {
  test(`CodeLab actions stay visible and work at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: viewport.width === 320 ? 'reduce' : 'no-preference' });
    let releaseProgress!: () => void, releaseRun!: () => void;
    const progress = new Promise<void>(resolve => { releaseProgress = resolve; });
    const execution = new Promise<void>(resolve => { releaseRun = resolve; });
    let runs = 0, submissions = 0;
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://codelab.test/**', async route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/codelab/progress') { await progress; return route.fulfill({ json: { completed: false, submission: null } }); }
      if (url.pathname === '/api/judge0/submit') { runs++; await execution; return route.fulfill({ json: { stdout: 'Hello', stderr: null, time: '0', status: { id: 3 } } }); }
      if (url.pathname === '/api/codelab/evaluate') {
        submissions++;
        return route.fulfill({ json: { publicResults: [{ passed: true, actualOutput: 'Hello', time: '0' }], hiddenResults: [], totalPassed: 1, totalCases: 1, score: 100, grantedExp: 80 } });
      }
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div class="dashboard-workspace-shell"><header id="app-header">CdM LMS · CodeLab</header><main><div id="root" data-codelab-workspace></div></main></div><nav id="bottom-nav">Dashboard · Courses · Grades · Alerts · More</nav></body></html>' });
    });
    const title = viewport.language === 'javascript' ? 'Build a JavaScript solution with variables and correctly formatted console output' : 'Sum Two Numbers with Scanner';
    await page.goto('http://codelab.test/level?' + new URLSearchParams({ language: viewport.language, title }));
    await page.addStyleTag({ content: css + `html,body{height:100%;margin:0}#app-header{height:56px;padding:16px;border-bottom:1px solid var(--border-color)}#root{height:100%;width:100%}#bottom-nav{position:fixed;bottom:0;left:0;right:0;height:56px;background:var(--bg-surface);border-top:1px solid var(--border-color);display:grid;place-items:center;font-size:11px}textarea[aria-label=Code]{min-height:100px;width:100%;padding:16px;color:var(--text-primary);background:var(--bg-surface)}@media(min-width:1024px){.dashboard-workspace-shell{margin-left:288px;width:calc(100% - 288px)}#bottom-nav{display:none}}` });
    await page.evaluate(dark => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.documentElement.classList.toggle('dark', dark); (window as any).notifications = []; }, viewport.dark);
    await page.addScriptTag({ content: script });
    const run = page.getByRole('button', { name: 'Run Tests', exact: true });
    const submit = page.getByRole('button', { name: 'Submit Solution', exact: true });
    const loading = page.getByRole('button', { name: 'Loading progress…', exact: true });
    await expect(loading).toBeDisabled();
    async function withinViewport(button: ReturnType<typeof page.getByRole>) {
      const bounds = (await button.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.y).toBeGreaterThanOrEqual(56);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width); expect(bounds.y + bounds.height).toBeLessThan(viewport.height - (viewport.width < 1024 ? 56 : 0));
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(await button.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    }
    await withinViewport(run); await withinViewport(loading);
    releaseProgress(); await expect(submit).toBeEnabled();
    for (const tab of viewport.width < 768 ? ['Editor', 'Results', 'Tutorial'] : []) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      await withinViewport(run); await withinViewport(submit);
    }
    if (viewport.width < 768) await page.getByRole('button', { name: 'Editor', exact: true }).click();
    await page.getByLabel('Code', { exact: true }).fill('// Synthetic mobile layout fixture');
    await page.screenshot({ path: path.join(screenshots, `toolbar-${viewport.width}.png`) });
    await run.click(); await expect.poll(() => runs).toBe(1);
    await expect(run).toBeDisabled(); await expect(submit).toBeDisabled();
    releaseRun(); await expect(run).toBeEnabled();
    await submit.click(); await expect.poll(() => submissions).toBe(1);
    await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeDisabled();
    const status = page.getByRole('status');
    await expect(status).toContainText('Level completed');
    await expect(status).toContainText('Saved · 100/100');
    const next = page.getByRole('link', { name: /^Level [23]$/ });
    await withinViewport(next);
    const bounds = (await status.boundingBox())!;
    expect(bounds.y + bounds.height).toBeLessThan(viewport.height - (viewport.width < 1024 ? 56 : 0));
    await expect(page.getByText('Perfect Score!', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Test Case #1 Passed' })).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Test Case #1 Passed' }).click();
    await expect(page.getByRole('button', { name: 'Test Case #1 Passed' })).toHaveAttribute('aria-expanded', 'true');
    await page.waitForTimeout(300);
    if (viewport.width === 320) await expect(page.locator('canvas')).toHaveCount(0);
    else { await expect(page.locator('canvas')).toHaveCount(1); await expect(page.locator('canvas')).toHaveCSS('pointer-events', 'none'); }
    await page.screenshot({ path: path.join(screenshots, `completed-${viewport.width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    expect(errors).toEqual([]);
  });
}
