import { test, expect, type Page, type Locator } from '@playwright/test';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs/promises';

const require = createRequire(path.resolve('package.json'));
const { build } = require(require.resolve('esbuild', { paths:[path.dirname(require.resolve('tsx'))] }));
const web = createRequire(path.resolve('apps/web/package.json'));
let script = '', css = '';
const shots = path.resolve('tmp/codelab-layout-review');

test.beforeAll(async () => {
  const result = await build({ stdin:{contents:`
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import Scene from './apps/web/src/features/interactive-activities/codelab/components/CodeLabScene';
    import {getProblemById} from './apps/web/src/features/interactive-activities/codelab/problems';
    import DashboardLayout from './apps/web/src/components/layout/DashboardLayout';
    import PageTransition from './apps/web/src/components/common/PageTransition';
    const language=new URL(location.href).searchParams.get('language')||'html';
    const problem=getProblemById(language+'-level-1');
    const tests=problem.testCases.map(tc=>({input:tc.inputTemplate,expectedOutput:tc.expectedOutputTemplate,isHidden:tc.isHidden}));
    const scene=<Scene assignmentId={problem.id} studentId='student' variantSeed='seed'
      startedAt='2026-11-02T00:00:00Z' descriptionMarkdown={problem.descriptionTemplate} publicTestCases={tests}
      fixedLanguage={language} fixedLanguageId={problem.languageId} executionMethod={problem.executionMethod}
      htmlTemplate={problem.htmlTemplate} hints={problem.hints} tags={problem.tags} templateTitle={problem.title} />;
    const mode=new URL(location.href).searchParams.get('mode');
    const content=mode==='page' ? <article data-long-page style={{height:1800,display:'flex',flexDirection:'column',justifyContent:'space-between'}}><h1>Dashboard / Courses</h1><button>Last page action</button></article>
      : <div data-codelab-workspace className='flex h-full min-h-0 w-full flex-col overflow-hidden'>{scene}</div>;
    createRoot(document.getElementById('root')).render(<PageTransition><DashboardLayout instituteCode='ics' instituteName='Institute of Computing Studies'
      userName='Student' userRole='INSTRUCTOR' theme={{colors:{primary:'#F97316'}}} isEligibleForActivities>{content}</DashboardLayout></PageTransition>);`,
    resolveDir:process.cwd(),loader:'tsx'}, bundle:true,write:false,jsx:'automatic', tsconfig:'apps/web/tsconfig.json',nodePaths:[path.resolve('apps/web/node_modules')],
    plugins:[{name:'browser-adapters',setup(b:any){
      b.onResolve({filter:/^next\/link$|^next\/dynamic$|^@monaco-editor\/react$|^next\/navigation$|MonacoInit$|common\/(Toast|ChatbotWidget|BadgeToast|LoginRewardModal|FloatingStudyTimer)$|^@\/components\/layout\/(Sidebar|Topbar|NavigationProgress|MobileBottomNav)$|^@\/lib\/(theme-context|chatbot-context)$|FocusModeProvider$|OfflineBootstrap$|DraftRecovery$/},({path:name}:{path:string})=>({path:name,namespace:'fixture'}));
      b.onLoad({filter:/.*/,namespace:'fixture'},({path:name}:{path:string})=>({loader:'tsx',resolveDir:path.resolve('apps/web'),contents:
        name==='next/navigation' ? 'export const usePathname=()=>location.pathname;' :
        name.endsWith('/Sidebar') ? `export default function Sidebar(){return <aside id='sidebar' className='fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white p-6 dark:bg-slate-950 lg:block'>CdM LMS</aside>}` :
        name.endsWith('/Topbar') ? `export default function Topbar(){return <header className='sticky top-0 z-50 h-16 shrink-0 border-b border-slate-200 bg-white p-5 dark:bg-slate-950'>ICS / CodeLab</header>}` :
        name.endsWith('/MobileBottomNav') ? `export default function Nav(){return <nav aria-label='Mobile navigation' className='fixed inset-x-0 bottom-0 h-14 border-t border-slate-200 bg-white p-4 lg:hidden'>Dashboard · Courses · Grades</nav>}` :
        name.endsWith('theme-context') ? `export function ThemeProvider({children}){return children}; export function useTheme(){return {themeMode:document.documentElement.dataset.theme||'light'}}` :
        name.endsWith('chatbot-context') ? 'export function ChatbotProvider({children}){return children}' :
        name.endsWith('FocusModeProvider') || name.endsWith('OfflineBootstrap') ? 'export default function Provider({children}){return children}' :
        name.endsWith('DraftRecovery') ? 'export function DraftRecoveryProvider({children}){return children}' :
        name==='next/link' ? 'export default function Link({children,...props}){return <a {...props}>{children}</a>}' :
        name==='next/dynamic' ? `export default function dynamic(){return function Editor({value,onChange}){if(!onChange)return null;return <textarea aria-label='Source code editor' style={{height:'100%',width:'100%',resize:'none',fontFamily:'monospace',padding:16,background:'var(--bg-surface)',color:'var(--text-primary)'}} value={value} onChange={e=>onChange(e.target.value)}/>}}` :
        name.endsWith('Toast') ? 'export default function Toast(){return null}; export const toast={success(){},error(){}};' : 'export default function Empty(){return null}'}));
    }}] });
  script = result.outputFiles[0].text;
  css = (await web('postcss')([web('@tailwindcss/postcss')({base:path.resolve('apps/web')})])
    .process(await fs.readFile('apps/web/src/app/globals.css','utf8'),{from:path.resolve('apps/web/src/app/globals.css')})).css;
  await fs.mkdir(shots,{recursive:true});
});

async function mount(page: Page, language: 'html'|'css', width: number, height=900, dark=false, mode='workspace') {
  await page.setViewportSize({width,height});
  await page.route('http://localhost/**', route=> {
    if (new URL(route.request().url()).pathname==='/api/codelab/progress') return route.fulfill({json:{completed:false}});
    return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>'});
  });
  await page.goto(`http://localhost/level?language=${language}&mode=${mode}`);
  await page.addStyleTag({content:css+`html,body{margin:0;--font-cdm-body:Arial}body{font-family:Arial,sans-serif}`});
  await page.evaluate(dark=>{document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.classList.toggle('dark',dark)},dark);
  await page.addScriptTag({content:script});
  if(mode==='workspace') await expect(page.getByRole('button',{name:'Run Tests',exact:true})).toBeEnabled();
  else await expect(page.getByRole('button',{name:'Last page action'})).toBeAttached();
}
async function fits(page: Page) {
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight)).toBe(true);
  const viewport = page.viewportSize()!;
  for (const pane of ['tutorial','source','preview','results']) {
    const locator=page.locator(`[data-codelab-${pane}]`);
    if (!await locator.isVisible()) continue;
    const box=(await locator.boundingBox())!;
    expect(box.width).toBeGreaterThan(0); expect(box.height).toBeGreaterThan(0);
    expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+1);
    expect(box.y+box.height).toBeLessThanOrEqual(viewport.height+1);
  }
}
async function drag(page:Page, handle:Locator, x:number, y=0) {
  await handle.hover();
  const box=(await handle.boundingBox())!;
  await page.mouse.down();
  await expect(page.locator('[data-codelab-resize-shield]')).toBeAttached();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.mouse.move(box.x+box.width/2+x,box.y+box.height/2+y,{steps:12}); await page.mouse.up();
  await expect(page.locator('[data-codelab-resize-shield]')).toHaveCount(0);
}

test('all four desktop columns fit, resize, and preserve width when tutorial is restored',async({page})=>{
  await mount(page,'html',1920,1000);
  await fits(page);
  const tutorial=page.locator('[data-codelab-tutorial]'),source=page.locator('[data-codelab-source]');
  const initial=(await tutorial.boundingBox())!.width;
  const editorInitial=(await source.boundingBox())!.width;
  const hide=page.getByRole('button',{name:'Hide Tutorial & Challenge',exact:true});
  expect(await hide.evaluate(el=>getComputedStyle(el).borderWidth)).toBe('0px');
  await hide.click(); await expect(tutorial).toBeHidden();
  expect((await source.boundingBox())!.width).toBeGreaterThan(editorInitial);
  await page.getByRole('button',{name:'Show Tutorial & Challenge',exact:true}).click();
  expect((await tutorial.boundingBox())!.width).toBeCloseTo(initial,0);
  await drag(page,page.getByRole('separator',{name:'Resize tutorial and editor panels'}),60);
  await expect.poll(async()=>(await tutorial.boundingBox())!.width).toBeGreaterThan(initial+40);
  const results=page.locator('[data-codelab-results]'),resultsBefore=(await results.boundingBox())!.width;
  await drag(page,page.getByRole('separator',{name:'Resize editor and results panels'}),-55);
  await expect.poll(async()=>(await results.boundingBox())!.width).toBeGreaterThan(resultsBefore+35);
  const sourceBefore=(await source.boundingBox())!.width;
  await drag(page,page.getByRole('separator',{name:'Resize source and preview panels'}),45);
  await expect.poll(async()=>(await source.boundingBox())!.width).toBeGreaterThan(sourceBefore+25);
  await page.getByRole('separator',{name:'Resize source and preview panels'}).dblclick();
  await expect(page.getByRole('separator',{name:'Resize source and preview panels'})).toHaveAttribute('aria-valuenow','50');
  await fits(page);
  await page.screenshot({path:path.join(shots,'html-desktop.png')});
});

test('CSS laptop layout keeps all information accessible and live styles still run',async({page})=>{
  await mount(page,'css',1366,900,true);
  await page.locator('[data-codelab-source] textarea').fill('h1 { color: red; }');
  await expect(page.frameLocator('iframe[title="HTML/CSS Live Sandbox Preview"]').locator('h1')).toHaveCSS('color','rgb(255, 0, 0)');
  await page.getByRole('button',{name:'Run Tests',exact:true}).click();
  await expect(page.getByRole('button',{name:'Test Case #1 Passed'})).toBeVisible();
  const tutorial=page.locator('[data-codelab-tutorial]');
  await tutorial.locator('text=Tier 3: Step-by-Step Breakdown').scrollIntoViewIfNeeded();
  await fits(page);
  await page.screenshot({path:path.join(shots,'css-laptop-dark.png')});
});

test('narrow editor stacks source and preview with keyboard and pointer resizing',async({page})=>{
  await mount(page,'html',1024,900);
  const handle=page.getByRole('separator',{name:'Resize source and preview panels'});
  await expect(handle).toHaveAttribute('aria-orientation','horizontal');
  const source=page.locator('[data-codelab-source]'),before=(await source.boundingBox())!.height;
  await drag(page,handle,0,35);
  await expect.poll(async()=>(await source.boundingBox())!.height).toBeGreaterThan(before+20);
  await handle.focus(); await handle.press('ArrowUp');
  const outer=page.getByRole('separator',{name:'Resize editor and results panels'});
  await outer.focus(); const value=Number(await outer.getAttribute('aria-valuenow'));
  await outer.press('ArrowLeft');
  expect(Number(await outer.getAttribute('aria-valuenow'))).toBeLessThan(value);
  await drag(page,outer,-1000);
  await fits(page);
  await page.screenshot({path:path.join(shots,'html-small-laptop.png')});
});

test('phone workspace uses tabs for tutorial, source, preview and results without overflow',async({page})=>{
  await mount(page,'html',390,844);
  await expect(page.getByRole('separator')).toHaveCount(0);
  await page.getByRole('button',{name:'Editor',exact:true}).click();
  await page.locator('[data-codelab-source] textarea').fill('<h1>Welcome to CodeLab</h1>');
  await page.getByRole('button',{name:'Live preview',exact:true}).click();
  await expect(page.frameLocator('iframe[title="HTML/CSS Live Sandbox Preview"]').locator('h1')).toHaveText('Welcome to CodeLab');
  await fits(page);
  await page.screenshot({path:path.join(shots,'html-phone-preview.png')});
  await page.getByRole('button',{name:'Results',exact:true}).click(); await fits(page);
  await page.getByRole('button',{name:'Tutorial',exact:true}).click(); await fits(page);
});

for (const width of [1366,390]) test(`shared shell has one document scrollbar and reachable content at ${width}px`,async({page})=>{
  await mount(page,'html',width,900,false,'page');
  const shell=page.locator('.dashboard-workspace-shell');
  expect(await shell.evaluate(el=>getComputedStyle(el).overflowY)).toBe('visible');
  const scrollContainers=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>{
    const style=getComputedStyle(el);
    return ['auto','scroll'].includes(style.overflowY) && el.scrollHeight>el.clientHeight+1;
  }).map(el=>el.className));
  expect(scrollContainers).toEqual([]);
  await page.getByRole('button',{name:'Last page action'}).scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>window.scrollY)).toBeGreaterThan(0);
  await expect(page.getByRole('button',{name:'Last page action'})).toBeInViewport();
  expect((await shell.locator('header').boundingBox())!.y).toBe(0);
  await page.screenshot({path:path.join(shots,`single-page-scrollbar-${width}.png`)});
});

test('CodeLab fills the actual shell without a blank footer or document scrolling',async({page})=>{
  await mount(page,'html',1366,900);
  const root=page.locator('[data-codelab-workspace]');
  const box=(await root.boundingBox())!;
  expect(Math.abs(box.y+box.height-900)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(900);
  await page.mouse.wheel(0,1000);
  expect(await page.evaluate(()=>window.scrollY)).toBe(0);
  await fits(page);
});
