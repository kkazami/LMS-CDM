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
      import {CodeLabInstructorClient} from '${root}/apps/web/src/features/interactive-activities/codelab/components/CodeLabInstructorClient';
      const submissions=Array.from({length:21},(_,index)=>{
        const n=index+1; return {id:'submission-'+n,studentId:'student-'+n,studentName:'Student '+String(n).padStart(2,'0'),studentNumber:'24-'+n,templateId:'python-level-1',problemTitle:'Print a message',language:n>15?'cpp':'python',level:1,score:80,attempts:1,passed:true,completionTimeSeconds:60,submittedAt:'2026-10-19T00:00:00Z',pasteCount:0,typingVelocityCpm:100,isFlagged:n%2===0,flagReasons:[],isRejected:n===15};
      });
      createRoot(document.getElementById('root')).render(<CodeLabInstructorClient institute='ics' problems={[]} submissions={submissions}/>);
    `, resolveDir: path.resolve("apps/web"), loader: "tsx" },
    bundle: true, write: false, jsx: "automatic", tsconfig: "apps/web/tsconfig.json",
    nodePaths: [path.resolve("apps/web/node_modules")],
    plugins: [{ name: "browser-boundaries", setup(b: any) {
      b.onResolve({ filter: /^next\/link$|common\/Toast$/ }, ({ path: name }: { path: string }) => ({ path: name, namespace: "mock" }));
      b.onLoad({ filter: /.*/, namespace: "mock" }, ({ path: name }: { path: string }) => ({ loader: "tsx", resolveDir: path.resolve("apps/web"), contents:
        name === "next/link" ? "export default function Link({children,...props}){return <a {...props}>{children}</a>}" : "export const toast={success(){},error(){}};" }));
    } }],
  });
  script = built.outputFiles[0].text;
});

test("submissions paginate by ten, reset with filters, and recover after deleting the last page", async ({ page }) => {
  await page.route("http://analytics.test/**", route => route.request().method() === "POST"
    ? route.fulfill({ json: { message: "Submission deleted." } })
    : route.fulfill({ contentType: "text/html", body: '<main id="root"></main>' }));
  await page.goto("http://analytics.test/");
  await page.addScriptTag({ content: script });
  const rows = page.locator("table tbody tr");
  const pagination = page.getByRole("navigation", { name: "Student submission pages" });
  const next = pagination.getByRole("button", { name: "Next", exact: true });
  const previous = pagination.getByRole("button", { name: "Previous", exact: true });
  await expect(rows).toHaveCount(10);
  await expect(rows.first()).toContainText("Student 01");
  await expect(pagination).toContainText("Showing 1–10 of 21 submissions");
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(rows).toHaveCount(10); await expect(rows.first()).toContainText("Student 11");
  await next.click();
  await expect(rows).toHaveCount(1); await expect(rows.first()).toContainText("Student 21");
  await expect(next).toBeDisabled();

  await rows.getByRole("button", { name: "Manage", exact: true }).click();
  await page.getByRole("button", { name: "Delete submission", exact: true }).first().click();
  await page.getByRole("button", { name: "Delete submission", exact: true }).last().click();
  await expect(pagination).toContainText("Page 2 of 2");
  await expect(rows).toHaveCount(10); await expect(rows.first()).toContainText("Student 11");
  await expect(page.getByRole("heading", { name: "Review submission", exact: true })).toHaveCount(0);

  const search = page.getByPlaceholder("Search students or problems");
  await search.fill("Student 01");
  await expect(rows).toHaveCount(1); await expect(pagination).toContainText("Page 1 of 1");
  await search.fill("no matching student");
  await expect(rows).toHaveCount(0); await expect(pagination).toHaveCount(0);
  await search.fill(""); await next.click();
  await page.locator("select").last().selectOption("cpp");
  await expect(rows).toHaveCount(5); await expect(rows.first()).toContainText("Student 16");
  await expect(pagination).toContainText("Page 1 of 1");
  await page.locator("select").last().selectOption("all"); await next.click();
  await page.getByRole("button", { name: "Needs review", exact: true }).click();
  await expect(rows).toHaveCount(10); await expect(pagination).toContainText("Page 1 of 1");
  await page.getByRole("button", { name: "Needs review", exact: true }).click(); await next.click();
  await page.getByRole("button", { name: "Rejected submissions", exact: true }).click();
  await expect(rows).toHaveCount(1); await expect(rows.first()).toContainText("Student 15");
  await expect(previous).toBeDisabled(); await expect(next).toBeDisabled();
});
