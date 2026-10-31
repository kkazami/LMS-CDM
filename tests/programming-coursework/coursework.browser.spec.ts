import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
let script = '', css = '';

test.beforeAll(async () => {
  const root = process.cwd().replaceAll('\\', '/');
  const built = await build({
    stdin: { contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import Work from '${root}/apps/web/src/components/courses/YourWorkPanel';
      import Classwork from '${root}/apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/client';
      const theme={code:'ics',colors:{primary:'#f97316'}};
      if(location.pathname!=='/instructor') document.getElementById('root').style.maxWidth='320px';
      const item={id:'item',type:'QUIZ',title:'Programming quiz',description:'Build a small program.',isProgramming:true,requireGithubRepo:true,dueDate:null,maxPoints:100,targetGroups:[]};
      createRoot(document.getElementById('root')).render(location.pathname==='/instructor'
        ? <Classwork items={[item]} courseId='course' instituteCode='ics' theme={theme} canEdit={true} studentGroups={[]}/>
        : <Work submission={{id:'submission',status:'DRAFT',grade:null,isReturned:false,submittedAt:null,attachments:[]}} isPastDeadline={false} maxPoints={100} instituteCode='ics' courseId='course' itemId='item' theme={theme} requireGithubRepo={true}/>);
    `, loader: 'tsx', resolveDir: path.resolve('apps/web') }, bundle: true, write: false, jsx: 'automatic', tsconfig: 'apps/web/tsconfig.json', nodePaths: [path.resolve('apps/web/node_modules')],
    plugins: [{ name: 'browser-boundaries', setup(b: any) {
      b.onResolve({ filter: /^\.\/actions$|\/classwork\/(?:\[itemId\]\/)?actions$|^next\/(link|navigation)$|\/FocusButton$|\/AttachmentModal$|\/DeleteClassworkDialog$/ }, ({ path: name }: { path: string }) => ({ path: name, namespace: 'boundary' }));
      b.onLoad({ filter: /.*/, namespace: 'boundary' }, ({ path: name }: { path: string }) => ({ loader: 'tsx', resolveDir: path.resolve('apps/web'), contents:
        name.endsWith('/actions') ? `
          export async function createSyllabusItem(prev,data){window.savedCoursework=Object.fromEntries(data); return {message:'success'}}
          export const updateSyllabusItem=createSyllabusItem;
          export async function deleteSyllabusItem(){return {success:true}}
          export async function submitWork(){window.turnedIn=true;return {success:true}}
          export async function unsubmitWork(){return {success:true}}
          export async function addSubmissionLink(){return {success:true}}
          export async function addSubmissionFile(){return {success:true}}
          export async function removeSubmissionAttachment(){return {success:true}}
          export async function saveGithubRepository(id,url){return {success:true,attachments:[{id:'attachment',url,type:'LINK',fileName:'student/project'}]}}
        ` : name === 'next/link' ? 'export default function Link({children,...props}){return <a {...props}>{children}</a>}' :
        name === 'next/navigation' ? 'export const useRouter=()=>({refresh(){}});' : 'export default function Component(){return null;}' }));
    } }],
  });
  script = built.outputFiles[0].text;
  const webRequire = createRequire(path.resolve('apps/web/package.json'));
  const postcss = webRequire('postcss'), tailwind = webRequire('@tailwindcss/postcss');
  const stylesheet = path.resolve('apps/web/src/app/globals.css');
  const source = fs.readFileSync(stylesheet, 'utf8').replace('@import "tailwindcss";', '@import "tailwindcss" source(none);\n@source "../";');
  css = (await postcss([tailwind()]).process(source, { from: stylesheet })).css + '\n:root{--font-cdm-body:Arial;--font-sans:Arial}';
});

test.beforeEach(async ({ page }) => {
  await page.route('http://coursework.test/**', route => route.fulfill({ contentType: 'text/html', body: '<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial;margin:24px;background:#f8fafc}main{max-width:900px;margin:auto}</style><main id="root"></main>' }));
});

test('instructor can mark any ordinary assessment as programming and require a repository', async ({ page }, info) => {
  await page.goto('http://coursework.test/instructor'); await page.addStyleTag({ content: css }); await page.addScriptTag({ content: script });
  await page.getByRole('button', { name: 'Add Material / Task' }).click();
  await expect(page.getByRole('checkbox', { name: /Require GitHub repository/ })).toHaveCount(0);
  await page.getByRole('checkbox', { name: /Programming coursework/ }).check();
  await page.getByRole('checkbox', { name: /Require GitHub repository/ }).check();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Programming exam');
  await page.screenshot({ path: path.resolve(`tmp/programming-coursework/instructor-${info.project.name}.png`), fullPage: true });
  await page.getByRole('button', { name: 'Add Item', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).savedCoursework)).toMatchObject({ isProgramming: 'true', requireGithubRepo: 'true' });
  await page.getByRole('button', { name: 'Edit Programming quiz' }).click();
  await expect(page.getByRole('checkbox', { name: /Require GitHub repository/ })).toBeChecked();
  await page.getByRole('checkbox', { name: /Programming coursework/ }).uncheck();
  await expect(page.getByRole('checkbox', { name: /Require GitHub repository/ })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Type', exact: true }).selectOption('MATERIAL');
  await expect(page.getByRole('checkbox', { name: /Programming coursework/ })).toHaveCount(0);
});

test('student sees repository-only input, rejects other links, saves and turns in', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://coursework.test/student'); await page.addStyleTag({ content: css }); await page.addScriptTag({ content: script });
  await expect(page.getByRole('button', { name: 'Add or create' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Turn in', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'GitHub repository URL' }).fill('https://example.com/student/project');
  await page.getByRole('button', { name: 'Save repository', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enter a GitHub repository URL');
  await page.getByRole('textbox', { name: 'GitHub repository URL' }).fill('https://github.com/student/project');
  await page.getByRole('button', { name: 'Save repository', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Repository saved');
  await page.screenshot({ path: path.resolve(`tmp/programming-coursework/student-${info.project.name}.png`), fullPage: true });
  await page.getByRole('button', { name: 'Turn in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Unsubmit', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'GitHub repository URL' })).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
