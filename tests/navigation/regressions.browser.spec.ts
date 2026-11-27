import {test, expect, type Page} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(path.resolve('package.json'));
const requireWeb = createRequire(path.resolve('apps/web/package.json'));
const {build} = require(require.resolve('esbuild',{paths:[path.dirname(require.resolve('tsx'))]}));
const postcss = requireWeb('postcss'), tailwind = requireWeb('@tailwindcss/postcss');
let script = '', css = '';
const output = 'tmp/oct22-ui-review';

test.beforeAll(async () => {
  const root = process.cwd().replaceAll('\\','/');
  const built = await build({stdin:{contents:`
    import React from 'react';import {createRoot} from 'react-dom/client';
    import Landing from '${root}/apps/web/src/app/page';
    import Profile from '${root}/apps/web/src/app/(dashboard)/[institute]/users/[userId]/client';
    import Announcements from '${root}/apps/web/src/app/(dashboard)/[institute]/announcements/client';
    import Nav from '${root}/apps/web/src/components/layout/MobileBottomNav';
    import Sidebar from '${root}/apps/web/src/components/layout/Sidebar';
    import Topbar from '${root}/apps/web/src/components/layout/Topbar';
    import ReportProblemForm from '${root}/apps/web/src/components/support/ReportProblemForm';
    import SupportTickets from '${root}/apps/web/src/app/(dashboard)/[institute]/admin/support-tickets/client';
    import PageTransition from '${root}/apps/web/src/components/common/PageTransition';
    import {ThemeProvider} from '${root}/apps/web/src/lib/theme-context';
    import {getInstituteTheme} from '${root}/apps/web/src/lib/get-institute-theme';
    const theme=getInstituteTheme('ics'), query=new URLSearchParams(location.search);
    const user={id:'student',name:'Alex Student',email:'very-long-student-email-address@department.example.invalid',role:'STUDENT',studentNumber:'2026-001',uniqueId:'student',avatarUrl:null,bio:'LongBioWithoutSpaces'.repeat(45)+'\\nSecond paragraph.',phone:'+639000000000',department:'BSIT',yearLevel:'4th Year',coverColor:'#6C4B40',createdAt:'2026-08-01',institute:{code:'ics',name:'Institute of Computing Studies'},taughtCourses:[],enrollments:[]};
    const courses=[{id:'class',code:'CS101',title:'Programming'}];
    const posts=[{id:'notice',content:'Class reminder. Please review the lesson before our next class.',authorName:'Professor Smith',authorAvatarUrl:null,courseId:'class',courseCode:'CS101',courseTitle:'Programming',createdAt:'2026-10-21T09:00:00Z'}];
    const isReport=location.pathname.endsWith('/report-a-problem');
    const role=query.get('role')||(isReport?'STUDENT':'PROFESSOR');
    function PersistentShell(){
      const [expanded,setExpanded] = React.useState(false);
      return <><button onClick={()=>setExpanded(true)}>Open workspace</button>{expanded && <p>Workspace open</p>}
        <button onClick={()=>{history.pushState(null,'','/transition-test/next');window.dispatchEvent(new PopStateEvent('popstate'));}}>Next page</button></>;
    }
    const shellPage = isReport ? <ReportProblemForm theme={theme}/> : location.pathname.endsWith('/admin/support-tickets') ? <SupportTickets theme={theme} instituteCode="ics"/> : null;
    const shell = <div className="lms-shell min-h-dvh bg-canvas" style={{'--institute-accent':theme.colors.primary}}><Sidebar instituteCode="ics" theme={theme} userRole={role} isEligibleForOhmward isEligibleForActivities={role==='STUDENT'} isEligibleForKnowledgeExchange={role==='STUDENT'} enrolledCourses={courses}/><div className="lg:pl-72"><Topbar instituteCode="ics" instituteName="Institute of Computing Studies" theme={theme} userName="Sample User" userRole={role}/>{shellPage && <main className="px-4 py-4 pb-24 lg:p-8">{shellPage}</main>}</div><Nav instituteCode="ics" primaryColor={theme.colors.primary} userRole={role} isEligibleForOhmward/></div>;
    const content=location.pathname==='/'?<Landing/>:location.pathname==='/profile-test'?<main className="p-4 sm:p-8"><Profile user={user} isOwnProfile={false} instituteCode="ics" theme={theme}/></main>:query.has('shell')||isReport?shell:<><main className="p-4 pb-24">{location.pathname.endsWith('/announcements')?<Announcements announcements={query.has('empty')?[]:posts} enrolledCourses={query.has('empty')?[]:courses} theme={theme} instituteCode="ics" isInstructor={role!=='STUDENT'}/>:<h1>Teacher Dashboard</h1>}</main><Nav instituteCode="ics" primaryColor={theme.colors.primary} userRole={role}/></>;
    createRoot(document.getElementById('root')).render(query.has('transition')?<PageTransition><PersistentShell/></PageTransition>:<ThemeProvider>{content}</ThemeProvider>);
  `,loader:'tsx',resolveDir:path.resolve('apps/web')},bundle:true,write:false,jsx:'automatic',outdir:'out',tsconfig:'apps/web/tsconfig.json',nodePaths:[path.resolve('apps/web/node_modules')],
    define:{'process.env.NODE_ENV':'"production"','process.env':'{}'},
    plugins:[{name:'framework-boundaries',setup(b:any){
      b.onResolve({filter:/^next\/(image|link|navigation)$|^@\/lib\/public-fonts$/},({path}:any)=>({path,namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'},({path:name}:any)=>({loader:'tsx',resolveDir:path.resolve('apps/web'),contents:
        name==='next/link'?`export default function Link({children,prefetch,...props}){return <a {...props}>{children}</a>}`:
        name==='next/image'?`export default function Image({fill,priority,unoptimized,quality,sizes,...props}){return <img {...props} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',...props.style}:props.style}/>} `:
        name==='next/navigation'?`import {useSyncExternalStore} from 'react';const subscribe=callback=>{window.addEventListener('popstate',callback);return ()=>window.removeEventListener('popstate',callback)};export const usePathname=()=>useSyncExternalStore(subscribe,()=>location.pathname);export const useParams=()=>({institute:'ics'});export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:url=>{location.href=url},prefetch:()=>{}});`:
        `export const publicDisplay={className:'',variable:''};`
      }));
    }}],
  });
  script=built.outputFiles.find((f:{path:string})=>f.path.endsWith('.js')).text;
  css=(await postcss([tailwind({base:path.resolve('apps/web')})]).process(await fs.readFile('apps/web/src/app/globals.css','utf8'),{from:path.resolve('apps/web/src/app/globals.css')})).css
    + ':root{--font-cdm-body:Arial,sans-serif}';
  await fs.mkdir(output,{recursive:true});
});

async function open(page:Page, url:string, loadGate?:Promise<void>) {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://ui-regressions.test/**',async route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname === '/hold-page-load') {
      await loadGate;
      return route.fulfill({ status: 204 });
    }
    if(pathname === '/videos/hero-bg.mp4') return route.fulfill({ path: 'apps/web/public/videos/hero-bg.mp4' });
    if(pathname.startsWith('/images/')) {
      const file=path.resolve('apps/web/public','.'+pathname);
      if(!file.startsWith(path.resolve('apps/web/public/images')+path.sep))return route.abort();
      try{return route.fulfill({path:file});}catch{return route.fulfill({status:404,body:''});}
    }
    if(pathname.startsWith('/api/'))return route.fulfill({json:{notifications:[],unreadCount:0}});
    return route.fulfill({contentType:'text/html',body:`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${loadGate ? '<img hidden src="/hold-page-load" alt="">' : ''}<div id="root"></div><script>${script}</script></body></html>`});
  });
  await page.goto('http://ui-regressions.test'+url,{waitUntil:loadGate ? 'domcontentloaded' : 'load'});
  return errors;
}

test('the landing video waits for page load and respects reduced motion', async ({ page }) => {
  const gate = Promise.withResolvers<void>();
  const videoRequests: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/videos/hero-bg.mp4') videoRequests.push(request.url());
  });
  const video = page.locator('video[poster="/images/cdm-background.jpg"]');
  try {
    await open(page, '/', gate.promise);
    await expect(video).toBeVisible();
    expect(await page.evaluate(() => document.readyState)).toBe('interactive');
    await expect(video.locator('source[src]')).toHaveCount(0, { timeout: 1000 });
    expect(videoRequests).toHaveLength(0);
  } finally {
    gate.resolve();
  }
  await page.waitForLoadState('load');
  await expect(video).toHaveAttribute('src', '/videos/hero-bg.mp4');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused && element.readyState >= 2)).toBe(true);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(video).not.toHaveAttribute('src');
  expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  videoRequests.length = 0;
  await page.reload();
  await expect(video).toBeVisible();
  await expect(video).not.toHaveAttribute('src');
  expect(videoRequests).toHaveLength(0);
});

test('route transitions preserve mounted workspace state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await open(page, '/transition-test?transition');
  await page.getByRole('button', { name: 'Open workspace' }).click();
  await expect(page.getByText('Workspace open')).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page).toHaveURL(/\/transition-test\/next$/);
  await expect(page.getByText('Workspace open')).toBeVisible({ timeout: 1500 });
  expect(errors).toEqual([]);
});

for(const width of [1440,390]) {
  test(`long profile bio wraps inside About at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    const errors=await open(page,'/profile-test');
    const bio=page.getByText(/^LongBioWithoutSpaces/);
    await expect(bio).toBeVisible();
    expect(await bio.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    expect(await bio.evaluate(el=>el.textContent!.endsWith('Second paragraph.'))).toBe(true);
    expect(await bio.evaluate(el=>getComputedStyle(el).whiteSpace)).toBe('pre-wrap');
    await page.screenshot({path:`${output}/profile-${width}.png`,fullPage:true,animations:'disabled'});
    expect(errors).toEqual([]);
  });
  test(`all institute portals remain visible after the heading scrolls away at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:844});
    const errors=await open(page,'/');
    const section=page.locator('#departments');
    await section.scrollIntoViewIfNeeded();
    if(width<1024) {
      for(const code of ['ICS','ITE','IBE']) {
        const cta=section.getByText(`Tap To Enter ${code} Portal`,{exact:true});
        await cta.scrollIntoViewIfNeeded();
        await expect(cta).toBeInViewport();
        await expect.poll(()=>cta.evaluate(el=>{
          let opacity=1;for(let p:Element|null=el;p&&p!==document.body;p=p.parentElement)opacity*=Number(getComputedStyle(p).opacity);
          return opacity;
        })).toBeGreaterThan(.99);
      }
      const heading=section.getByRole('heading',{name:'Select Your Department Portal',exact:true});
      expect((await heading.boundingBox())!.y).toBeLessThan(0);
      await page.mouse.wheel(0,220);await page.mouse.wheel(0,-220);
      await expect(section.getByText('Tap To Enter IBE Portal',{exact:true})).toBeInViewport();
    } else {
      for(const code of ['ICS','ITE','IBE']) {
        await section.getByRole('button',{name:`Select ${code} Department`,exact:true}).click();
        const active=section.getByRole('button',{name:new RegExp(`\\(${code}\\) Portal - Active$`)});
        await expect(active).toBeVisible();
        await expect.poll(()=>active.evaluate(el=>getComputedStyle(el).filter)).toBe('blur(0px)');
      }
      await section.getByRole('button',{name:/\(IBE\) Portal - Active$/}).scrollIntoViewIfNeeded();
    }
    await page.screenshot({path:`${output}/institutes-${width}.png`,animations:'disabled'});
    expect(errors).toEqual([]);
  });
}

test('faculty Alerts opens the announcement feed and shows the active navigation state',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const errors=await open(page,'/ics/teachers');
  await page.getByRole('link',{name:'Alerts',exact:true}).click();
  await expect(page).toHaveURL(/\/ics\/announcements$/);
  await expect(page.getByRole('heading',{name:'Announcements',exact:true})).toBeVisible();
  await expect(page.getByText('Announcements from the classes you teach')).toBeVisible();
  await expect(page.getByRole('link',{name:'Alerts',exact:true})).toHaveAttribute('aria-current','page');
  await page.screenshot({path:`${output}/faculty-alerts-390.png`,fullPage:true,animations:'disabled'});
  await page.goto('http://ui-regressions.test/ics/announcements?empty');
  await expect(page.getByRole('heading',{name:'No assigned classes',exact:true})).toBeVisible();
  await expect(page.getByText(/Join a class using/)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('reduced motion keeps the last mobile institute portal visible',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
  await open(page,'/');
  const ibe=page.locator('#departments').getByText('Tap To Enter IBE Portal',{exact:true});
  await ibe.scrollIntoViewIfNeeded();await expect(ibe).toBeInViewport();
  expect(await ibe.evaluate(el=>{let opacity=1;for(let p:Element|null=el;p&&p!==document.body;p=p.parentElement)opacity*=Number(getComputedStyle(p).opacity);return opacity;})).toBe(1);
});

test('admin tools show their own titles and the sidebar only links to admin navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await open(page, '/ics/admin?role=ADMIN&shell');
  const header = page.getByRole('banner');
  await expect(header.getByRole('heading', { name: 'Administrator Dashboard' })).toBeVisible();
  const sidebar = page.locator('.dashboard-sidebar');
  for (const name of ['Ohmward', 'Settings', 'Help']) {
    await expect(sidebar.getByRole('link', { name, exact: true })).toHaveCount(0);
  }
  await page.route('**/api/support-tickets', route => route.fulfill({ json: { tickets: [{
    id: 'report', subject: 'Blank grades page', message: 'Page: Grades\n\nThe page stays blank.',
    category: 'TECHNICAL', status: 'OPEN', priority: 'NORMAL', createdAt: '2026-11-27T00:00:00Z',
    author: { id: 'student', name: 'Sample Student', email: 'student@example.invalid', role: 'STUDENT' },
    attachment: { fileName: 'grades.png' },
  }] } }));
  for (const [route, title] of [
    ['courses', 'Course Management'],
    ['faculty', 'Faculty & Program Heads'],
    ['database', 'Database Management'],
    ['support-tickets', 'Support Tickets'],
    ['onboarding', 'Students and Classes'],
  ]) {
    await page.goto(`http://ui-regressions.test/ics/admin/${route}?role=ADMIN&shell`);
    await expect(header.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Back to previous section' })).toHaveAttribute('href', '/ics/admin');
    if (route === 'support-tickets') {
      const inbox = page.getByRole('main');
      await expect(inbox.getByText('Reports from Report a problem show up here with other support requests.')).toBeVisible();
      await expect(inbox.getByRole('heading', { name: 'Blank grades page' })).toBeVisible();
      await expect(inbox.getByRole('link', { name: 'Download grades.png' })).toHaveAttribute('href', '/api/support-tickets/report/attachment');
    }
  }
  await page.goto('http://ui-regressions.test/ics/courses?role=STUDENT&shell');
  await expect(header.getByRole('heading', { name: 'My Courses' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Ohmward', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('admin mobile More links to database and tickets without Settings, Help or Ohmward', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, '/ics/admin/database?role=ADMIN&shell');
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Database Management' })).toBeVisible();
  await page.getByRole('button', { name: 'Open more navigation options' }).click();
  const sheet = page.getByRole('dialog', { name: 'More navigation options' });
  await expect(sheet.getByRole('link', { name: /^Database Management/ })).toHaveAttribute('aria-current', 'page');
  await expect(sheet.getByRole('link', { name: /^Support Tickets/ })).toHaveAttribute('href', '/ics/admin/support-tickets');
  await expect(sheet.getByText('Review reported problems and reply to support requests')).toBeVisible();
  await expect(sheet.getByRole('link', { name: /^(Settings|Help|Ohmward)\b/ })).toHaveCount(0);
});

test('student sidebar groups class links, study tools and support', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, '/ics/students?role=STUDENT&shell');
  const sidebar = page.getByRole('navigation', { name: 'LMS navigation' });
  const classes = sidebar.getByRole('group', { name: 'Classes' });
  await expect(classes.getByRole('link', { name: 'Grades' })).toBeVisible();
  await classes.getByRole('button', { name: 'My Courses' }).click();
  await expect(classes.getByRole('link', { name: 'CS101' })).toBeVisible();
  await expect(sidebar.getByRole('group', { name: 'Study tools' }).getByRole('link', { name: 'Ohmward' })).toBeVisible();
  const report = sidebar.getByRole('group', { name: 'Help' }).getByRole('link', { name: 'Report a problem' });
  await report.click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Report a problem' })).toBeVisible();
  await expect(report).toHaveAttribute('aria-current', 'page');
  const title = page.getByLabel('Issue title');
  const file = page.getByRole('button', { name: /Choose file/ });
  const titleBounds = (await title.boundingBox())!;
  expect(titleBounds.x).toBeGreaterThan(288);
  expect((await file.boundingBox())!.x).toBeGreaterThan(titleBounds.x + titleBounds.width);
  await page.screenshot({ path: `${output}/report-desktop.png`, animations: 'disabled' });
});

test('mobile report keeps the draft after a failed send and confirms a retry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await open(page, '/ics/students?role=STUDENT&shell');
  await page.getByRole('button', { name: 'Open more navigation options' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Report a problem' }).click();
  await expect(page).toHaveURL(/\/ics\/report-a-problem$/);
  await expect(page.getByRole('main').getByRole('heading', { name: 'Report a problem' })).toBeVisible();
  const main = page.getByRole('main');
  const title = main.getByLabel('Issue title');
  const file = main.getByRole('button', { name: /Choose file/ });
  expect((await file.boundingBox())!.y).toBeGreaterThan((await title.boundingBox())!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: `${output}/report-mobile.png`, fullPage: true, animations: 'disabled' });

  let attempts = 0;
  await page.route('**/api/support-tickets', async route => {
    attempts++;
    const request = route.request();
    expect(request.method()).toBe('POST');
    expect(request.headers()['content-type']).toContain('multipart/form-data');
    expect(request.postData()).toContain('Grades page stays blank');
    expect(request.postData()).toContain('screenshot.png');
    await route.fulfill(attempts === 1
      ? { status: 503, json: { message: 'Try again in a moment.' } }
      : { status: 201, json: { ticket: { id: 'report' } } });
  });
  await title.fill('Grades page stays blank');
  await main.getByLabel('Where did it happen?').selectOption('grades');
  await main.getByLabel('What happened?').fill('The page stays blank when I open it.');
  const picker = main.locator('input[type=file]');
  await picker.setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('notes') });
  await expect(main.getByRole('alert')).toContainText('Choose a JPG');
  await picker.setInputFiles({ name: 'screenshot.png', mimeType: 'image/png', buffer: Buffer.from('test attachment') });
  await expect(main.getByText('screenshot.png')).toBeVisible();
  await main.getByRole('button', { name: 'Send report' }).click();
  await expect(main.getByRole('alert')).toHaveText('Try again in a moment.');
  await expect(title).toHaveValue('Grades page stays blank');
  await expect(main.getByText('screenshot.png')).toBeVisible();
  await main.getByRole('button', { name: 'Send report' }).click();
  await expect(main.getByRole('heading', { name: 'Report sent' })).toBeFocused();
  await expect(main.getByRole('link', { name: 'View my tickets' })).toHaveAttribute('href', '/ics/help#my-tickets');
  expect(attempts).toBe(2);
  expect(errors).toEqual([]);
});
