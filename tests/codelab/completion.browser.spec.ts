import { test, expect } from "@playwright/test";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.resolve("package.json"));
const { build } = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsx"))] }));
let script = "";

test.beforeAll(async () => {
  const root = process.cwd().replaceAll("\\", "/");
  const built = await build({
    stdin: { contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import Scene from '${root}/apps/web/src/features/interactive-activities/codelab/components/CodeLabScene';
      const tests=[{input:'',expectedOutput:'Hello',isHidden:false}];
      createRoot(document.getElementById('root')).render(<Scene assignmentId='python-level-1' studentId='student' variantSeed='seed' startedAt='2026-10-19T00:00:00.000Z' descriptionMarkdown='Print Hello' publicTestCases={tests}/>);
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
    return route.fulfill({ contentType: "text/html", body: "<html><body><main id='root'></main></body></html>" });
  });
  async function mount() {
    await page.goto("http://codelab.test/level");
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
  await expect(page.getByLabel("Code", { exact: true })).toHaveValue("print('Hello')");
  await page.getByLabel("Code", { exact: true }).fill("print('Practice')");
  await page.getByRole("button", { name: "Run Tests", exact: true }).click();
  await expect.poll(() => runs).toBe(1);
  expect(evaluations).toBe(1);
  expect(saved!.stateCheck.sourceCode).toBe("print('Hello')");
  expect(await page.evaluate(() => (window as any).notifications)).toEqual([]);
  expect(errors).toEqual([]);
});
