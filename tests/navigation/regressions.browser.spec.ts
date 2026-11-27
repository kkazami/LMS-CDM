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
    import ProfileEdit from '${root}/apps/web/src/app/(dashboard)/[institute]/profile/client';
    import {AvatarProvider} from '${root}/apps/web/src/lib/avatar-context';
    import Announcements from '${root}/apps/web/src/app/(dashboard)/[institute]/announcements/client';
    import Nav from '${root}/apps/web/src/components/layout/MobileBottomNav';
    import Sidebar from '${root}/apps/web/src/components/layout/Sidebar';
    import Topbar from '${root}/apps/web/src/components/layout/Topbar';
    import ReportProblemForm from '${root}/apps/web/src/components/support/ReportProblemForm';
    import HelpDashboardClient from '${root}/apps/web/src/app/(dashboard)/[institute]/help/client';
    import SupportTickets from '${root}/apps/web/src/app/(dashboard)/[institute]/admin/support-tickets/client';
    import PageTransition from '${root}/apps/web/src/components/common/PageTransition';
    import DocumentViewer from '${root}/apps/web/src/components/learning-materials/DocumentViewer';
    import DashboardLayout from '${root}/apps/web/src/components/layout/DashboardLayout';
    import PeopleClient from '${root}/apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/(learning)/people/client';
    import {ThemeProvider} from '${root}/apps/web/src/lib/theme-context';
    import {getInstituteTheme} from '${root}/apps/web/src/lib/get-institute-theme';
    const query=new URLSearchParams(location.search), instituteCode=query.get('institute') || 'ics', theme=getInstituteTheme(instituteCode);
    const ibeProgramCode = query.get('program') || null;
    const iteProgramTools = instituteCode === 'ite' ? [{ id:'nursery-library', title:'Nursery Library', description:'Media for class', href:'/ite/nursery-library' }] : [];
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
    const shellPage = isReport ? <ReportProblemForm theme={theme}/> : location.pathname.endsWith('/help') ? <HelpDashboardClient theme={theme} role={role}/> : location.pathname.endsWith('/admin/support-tickets') ? <SupportTickets theme={theme} instituteCode="ics"/> : null;
    const roster = Array.from({length:62}, (_,i) => {
      const number = String(i + 1).padStart(2, '0');
      return {id:'student-' + number, enrollmentId:'enrollment-' + number, name:'Student ' + number, email:'roster' + number + '@example.invalid', avatarUrl:null};
    });
    const people = <main className="p-4 md:p-8"><PeopleClient courseId="class" instituteCode={instituteCode} theme={theme} instructor={{id:'professor',name:'Class Instructor',email:'instructor@example.invalid',avatarUrl:null}} enrolledStudents={roster} pendingRequests={[]} studentGroups={[]} canManage currentUserId="professor"/></main>;
    const shell = <div className="lms-shell min-h-dvh bg-canvas" style={{'--institute-accent':theme.colors.primary}}>
      <Sidebar instituteCode={instituteCode} theme={theme} userRole={role} isEligibleForOhmward isEligibleForActivities={instituteCode==='ics' && role==='STUDENT'} isEligibleForKnowledgeExchange={instituteCode==='ics' && role==='STUDENT'} enrolledCourses={courses} ibeProgramCode={ibeProgramCode} iteProgramTools={iteProgramTools}/>
      <div className="lg:pl-72"><Topbar instituteCode={instituteCode} instituteName={theme.name} theme={theme} userName="Sample User" userRole={role}/>{shellPage && <main className="px-4 py-4 pb-24 lg:p-8">{shellPage}</main>}</div>
      <Nav instituteCode={instituteCode} primaryColor={theme.colors.primary} userRole={role} isEligibleForOhmward ibeProgramCode={ibeProgramCode} iteProgramTools={iteProgramTools}/>
    </div>;
    const reader = <main className="h-dvh p-4"><DocumentViewer url="/sample.pdf" attachmentId="sample" userId="student" /></main>;
    const workspace = <DashboardLayout instituteCode="ics" instituteName={theme.name} theme={theme} userRole={role} userId={role.toLowerCase()} userName="Sample User" isEligibleForActivities isEligibleForOhmward isEligibleForKnowledgeExchange enrolledCourses={courses}><div style={{minHeight:'75vh'}}><h1>Classwork</h1></div></DashboardLayout>;
    const profile = query.has('edit') ? <AvatarProvider initialAvatarUrl={null}><ProfileEdit user={{...user, bannerImageUrl:'', department:query.has('no-program')?'':user.department}} instituteCode="ics" theme={theme}/></AvatarProvider> : <Profile user={user} isOwnProfile={false} instituteCode="ics" theme={theme}/>;
    const content=location.pathname==='/'?<Landing/>:location.pathname==='/reader-test'?reader:location.pathname.endsWith('/people')?people:query.has('workspace')?workspace:location.pathname==='/profile-test'?<main className="p-4 sm:p-8">{profile}</main>:query.has('shell')||isReport?shell:<><main className="p-4 pb-24">{location.pathname.endsWith('/announcements')?<Announcements announcements={query.has('empty')?[]:posts} enrolledCourses={query.has('empty')?[]:courses} theme={theme} instituteCode="ics" isInstructor={role!=='STUDENT'}/>:<h1>Teacher Dashboard</h1>}</main><Nav instituteCode="ics" primaryColor={theme.colors.primary} userRole={role}/></>;
    createRoot(document.getElementById('root')).render(query.has('transition')?<PageTransition><PersistentShell/></PageTransition>:<ThemeProvider>{content}</ThemeProvider>);
  `,loader:'tsx',resolveDir:path.resolve('apps/web')},bundle:true,write:false,jsx:'automatic',outdir:'out',tsconfig:'apps/web/tsconfig.json',nodePaths:[path.resolve('apps/web/node_modules')],
    define:{'process.env.NODE_ENV':'"production"','process.env':'{}'},
    plugins:[{name:'framework-boundaries',setup(b:any){
      b.onResolve({filter:/^next\/(image|link|navigation|dynamic)$|^@\/lib\/public-fonts$|^react-pdf(?:\/dist\/Page\/.*\.css)?$/},({path}:any)=>({path,namespace:'mock'}));
      b.onResolve({filter:/^\.\/actions$/},({importer}: {importer: string}) => importer.replaceAll('\\','/').endsWith('/people/client.tsx') ? {path:'people-actions',namespace:'mock'} : undefined);
      b.onLoad({filter:/.*/,namespace:'mock'},({path:name}:any)=>({loader:'tsx',resolveDir:path.resolve('apps/web'),contents:
        name==='next/link'?`export default function Link({children,prefetch,...props}){return <a {...props}>{children}</a>}`:
        name==='next/image'?`export default function Image({fill,priority,unoptimized,quality,sizes,...props}){return <img {...props} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',...props.style}:props.style}/>} `:
        name==='next/dynamic'?`import {lazy,Suspense} from 'react';export default function dynamic(load, options){const Component=lazy(load);const Loading=options?.loading;return props=><Suspense fallback={Loading ? <Loading/> : null}><Component {...props}/></Suspense>}`:
        name==='people-actions'?`function unexpected(){throw new Error('Unexpected People mutation in roster test')} export {unexpected as approveEnrollment,unexpected as declineEnrollment,unexpected as approveAllPending,unexpected as removeStudent,unexpected as sendPrivateComment,unexpected as getPrivateComments,unexpected as createStudentGroup,unexpected as deleteStudentGroup};`:
        name==='next/navigation'?`import {useSyncExternalStore} from 'react';const subscribe=callback=>{window.addEventListener('popstate',callback);return ()=>window.removeEventListener('popstate',callback)};export const usePathname=()=>useSyncExternalStore(subscribe,()=>location.pathname);export const useParams=()=>({institute:'ics'});export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:url=>{location.href=url},prefetch:()=>{}});`:
        name==='react-pdf'?`import {useEffect} from 'react';
          export const pdfjs={version:'mock',GlobalWorkerOptions:{}};
          const pdf={numPages:2,getPage:async()=>({getViewport:()=>({width:800,height:450})})};
          export function Document({children,className,onLoadSuccess}) { useEffect(()=>{onLoadSuccess(pdf)},[]); return <div className={className}>{children}</div>; }
          export function Page({pageNumber,scale,className}) { return <div data-testid="pdf-page" className={className} style={{width:800*scale,height:450*scale}}>Sample page {pageNumber}</div>; }`:
        `export const publicDisplay={className:'',variable:''};`
      }));
    }}],
  });
  script=built.outputFiles.find((f:{path:string})=>f.path.endsWith('.js')).text;
  css=(await postcss([tailwind({base:path.resolve('apps/web')})]).process(await fs.readFile('apps/web/src/app/globals.css','utf8'),{from:path.resolve('apps/web/src/app/globals.css')})).css
    + ':root{--font-cdm-body:Arial,sans-serif}'
    + (built.outputFiles.find((file: { path: string }) => file.path.endsWith('.css'))?.text ?? '');
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
    if(pathname === '/api/materials/annotations') return route.fulfill({json:[]});
    if(pathname === '/api/workspace/notes') return route.fulfill({json:[]});
    if(pathname.startsWith('/api/'))return route.fulfill({json:{notifications:[],unreadCount:0}});
    return route.fulfill({contentType:'text/html',body:`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${loadGate ? '<img hidden src="/hold-page-load" alt="">' : ''}<div id="root"></div><script>${script}</script></body></html>`});
  });
  await page.goto('http://ui-regressions.test'+url,{waitUntil:loadGate ? 'domcontentloaded' : 'load'});
  return errors;
}

for (const width of [1440, 390]) {
  test(`People shows 30 students per page and searches the whole class at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    const errors = await open(page, '/ics/courses/class/people');
    const students = page.getByRole('region', { name: 'Students (62)' });
    const rows = students.getByRole('button', { name: /^Remove Student \d+ from class$/ });
    const search = students.getByRole('searchbox', { name: 'Search students' });
    const previous = students.getByRole('button', { name: 'Previous' });
    const next = students.getByRole('button', { name: 'Next' });
    await expect(rows).toHaveCount(30);
    await expect(students.getByText('Showing 1–30 of 62 students')).toBeVisible();
    await expect(previous).toBeDisabled();
    await next.click();
    await expect(students.getByText('Showing 31–60 of 62 students')).toBeVisible();
    await expect(rows).toHaveCount(30);
    await next.click();
    await expect(rows).toHaveCount(2);
    await expect(next).toBeDisabled();

    await search.fill('  STUDENT 31 ');
    await expect(rows).toHaveCount(1);
    await expect(students.getByText('Student 31', { exact: true })).toBeVisible();
    await search.fill('ROSTER62@');
    await expect(students.getByText('Student 62', { exact: true })).toBeVisible();
    await search.fill('no matching student');
    await expect(students.getByText('No students match your search.')).toBeVisible();
    await search.clear();
    await expect(students.getByText('Showing 1–30 of 62 students')).toBeVisible();

    await page.getByRole('button', { name: 'New Group' }).click();
    await expect(page.getByRole('checkbox', { name: /^Student 62 / })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
  });
}

for (const [width, side, role] of [
  [1600, 'right', 'STUDENT'], [1600, 'left', 'STUDENT'], [390, 'right', 'STUDENT'],
  [1600, 'right', 'PROFESSOR'], [390, 'right', 'TEACHER'],
] as const) {
  test(`ICS ${role} workspace keeps the page still when Quick Notes opens from the ${side} at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = await open(page, `/ics/${role === 'STUDENT' ? 'students' : 'teachers'}?workspace&role=${role}`);
    if (role === 'PROFESSOR') {
      const nav = page.getByRole('navigation', { name: 'LMS navigation' });
      await expect(nav.getByRole('group', { name: 'Overview' }).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
      const classes = nav.getByRole('group', { name: 'Classes' });
      await expect(classes.getByRole('link', { name: 'Gradebooks' })).toHaveAttribute('href', '/ics/gradebooks');
      await classes.getByRole('button', { name: 'My Classes' }).click();
      await expect(classes.getByRole('link', { name: 'CS101' })).toHaveAttribute('href', '/ics/courses/class');
      const teachingTools = nav.getByRole('group', { name: 'Teaching tools' });
      await expect(teachingTools.getByRole('link', { name: 'Ohmward' })).toHaveAttribute('href', '/ics/activities/ohmward/instructor');
      await expect(teachingTools.getByRole('link', { name: 'CodeLab' })).toHaveAttribute('href', '/ics/activities/codelab/instructor');
      await expect(nav.getByRole('group', { name: 'Community' }).getByRole('link', { name: 'Knowledge Exchange' })).toBeVisible();
      await expect(nav.getByRole('group', { name: 'Help' }).getByRole('link', { name: 'Help center' })).toHaveAttribute('href', '/ics/help');
    }
    const main = page.getByRole('main');
    const launcher = page.getByRole('button', { name: 'Open quick notes' });
    await expect(launcher).toBeVisible();
    if (side === 'left') await launcher.press('ArrowLeft');
    const original = await main.boundingBox();
    const binding = (await launcher.boundingBox())!;
    const x = binding.x + binding.width / 2;
    const y = binding.y + binding.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + (side === 'left' ? 210 : -210), y, { steps: 5 });
    expect(await main.boundingBox()).toEqual(original);
    await page.mouse.up();

    const panel = page.getByRole('dialog', { name: 'Quick notes' });
    await expect(panel).toBeFocused();
    expect(await main.boundingBox()).toEqual(original);
    const panelBounds = (await panel.boundingBox())!;
    const center = { x: panelBounds.x + panelBounds.width / 2, y: panelBounds.y + panelBounds.height / 2 };
    expect(center.x).toBeGreaterThan(original!.x);
    expect(center.x).toBeLessThan(original!.x + original!.width);
    expect(center.y).toBeGreaterThan(original!.y);
    expect(center.y).toBeLessThan(original!.y + original!.height);
    expect(await panel.evaluate((element, point) => element.contains(document.elementFromPoint(point.x, point.y)), center)).toBe(true);

    await page.keyboard.press('Escape');
    expect(await main.boundingBox()).toEqual(original);
    await expect(launcher).toBeFocused();
    expect(await main.boundingBox()).toEqual(original);
    expect(errors).toEqual([]);
  });
}

for (const width of [1440, 390]) {
  test(`ICS Help Center answers questions and lets students follow up with support at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    const errors = await open(page, '/ics/help?shell&role=STUDENT');
    let liveAnswer: string | null = 'Open the assignment in Classwork to check for feedback.';
    const questions: string[] = [];
    const tickets: { id: string; subject: string; message: string; status: string; createdAt: string }[] = [];
    await page.route('**/api/help/ask', (route) => {
      questions.push(route.request().postDataJSON().question);
      return route.fulfill({ json: { answer: liveAnswer, available: liveAnswer !== null } });
    });
    await page.route(/\/api\/support-tickets(?:\?|$)/, (route) => {
      if (route.request().method() === 'POST') {
        const { subject, message } = route.request().postDataJSON();
        tickets.push({ id: 'ticket-1', subject, message, status: 'OPEN', createdAt: '2026-11-27T01:00:00Z' });
        return route.fulfill({ status: 201, json: { ticket: tickets[0] } });
      }
      return route.fulfill({ json: { tickets } });
    });
    const main = page.getByRole('main');
    const ask = main.getByRole('region', { name: 'Ask a question' });
    const field = ask.getByRole('textbox', { name: 'What do you need help with?' });
    await field.fill('how to submit an attendance');
    await ask.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(ask.getByText(/select Scan QR code and scan the QR/).last()).toBeVisible();
    await expect(ask.getByRole('link', { name: 'Open My Courses' })).toHaveAttribute('href', '/ics/courses');
    await expect(ask.getByText('Find and submit classwork', { exact: true })).toHaveCount(0);
    expect(questions).toEqual([]);

    const question = 'I submitted work last week. Where do I see my feedback?';
    await field.fill(question);
    await ask.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(ask.getByText(liveAnswer, { exact: true }).last()).toBeVisible();
    expect(questions).toEqual([question]);
    await ask.getByText('Find grades and feedback', { exact: true }).click();
    await expect(ask.getByRole('link', { name: 'Open Grades' })).toHaveAttribute('href', '/ics/grades');

    liveAnswer = null;
    const followUp = 'My leaderboard photo is still visible.';
    await field.fill(followUp);
    await ask.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(ask.getByText(/Use Leaderboard visibility/).last()).toBeVisible();
    await ask.getByRole('button', { name: 'Ask support', exact: true }).click();
    const message = page.getByRole('textbox', { name: 'Message', exact: true });
    await expect(message).toHaveValue(followUp);
    expect(tickets).toHaveLength(0);
    const subject = 'Leaderboard visibility';
    const edited = 'I changed my leaderboard visibility, but my photo is still showing.';
    await page.getByRole('textbox', { name: 'Subject', exact: true }).fill(subject);
    await message.fill(edited);
    await page.getByRole('button', { name: 'Submit Ticket' }).click();
    await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(message).toHaveCount(0);
    await expect(main.getByRole('link', { name: 'Report a problem', exact: true }).first()).toHaveAttribute('href', '/ics/report-a-problem');
    await expect(main.getByRole('heading', { name: 'My tickets' })).toBeVisible();
    await expect(main.getByRole('button', { name: subject })).toBeVisible();
    expect(tickets.map(({ message }) => message)).toEqual([edited]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(errors).toEqual([]);
  });
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

for (const width of [1440, 390]) {
  test(`PDF page arrows sit beside the document at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    const errors = await open(page, '/reader-test');
    const previous = page.getByRole('button', { name: 'Previous page', exact: true });
    const next = page.getByRole('button', { name: 'Next page', exact: true });
    const pdf = page.getByTestId('pdf-page');
    await expect(pdf).toHaveText('Sample page 1');
    await expect(previous).toBeDisabled();

    const left = (await previous.boundingBox())!;
    const right = (await next.boundingBox())!;
    const pageBounds = (await pdf.boundingBox())!;
    expect(pageBounds.x - (left.x + left.width)).toBeGreaterThan(0);
    expect(right.x - (pageBounds.x + pageBounds.width)).toBeGreaterThan(0);
    expect(left.y + left.height / 2).toBeCloseTo(pageBounds.y + pageBounds.height / 2, 0);
    expect(right.y).toBeCloseTo(left.y, 0);

    const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true });
    for (let step = 0; step < 4; step++) await zoomIn.click();
    const scrollArea = page.locator('.overflow-auto').filter({ has: pdf });
    await expect.poll(() => scrollArea.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
    await scrollArea.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    expect(await scrollArea.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);

    await next.click();
    await expect(pdf).toHaveText('Sample page 2');
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(next).toBeDisabled();
    await expect(page.getByRole('button', { name: /140% zoom/ })).toBeVisible();
    await previous.focus();
    await page.keyboard.press('Enter');
    await expect(pdf).toHaveText('Sample page 1');
    await expect(previous).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    expect(errors).toEqual([]);
  });
}

for (const width of [1440, 390]) {
  test(`meeting notifications stay inside the menu at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, '/ics/students?role=STUDENT&shell');
    const notifications = Array.from({ length: 20 }, (_, index) => ({
      id: `meeting-${index}`,
      type: 'ANNOUNCEMENT',
      title: `Class meeting ${index + 1}`,
      message: 'Class meets at https://meet.google.com/abc-defg-hij.',
      link: '/ics/announcements',
      isRead: false,
      createdAt: '2026-11-27T00:00:00Z',
    }));
    await page.route(url => url.pathname === '/api/notifications', route => route.fulfill({
      json: { notifications, unreadCount: notifications.length },
    }));
    await page.reload();

    const bell = page.getByRole('button', { name: 'Notifications', exact: true });
    await expect(bell.getByText('9+')).toBeVisible();
    const documentHeight = () => page.evaluate(() => document.documentElement.scrollHeight);
    expect(await documentHeight()).toBe(900);

    await bell.click();
    const links = page.getByRole('link', { name: 'Join Google Meet (opens in a new tab)', exact: true });
    await links.last().scrollIntoViewIfNeeded();
    await expect(links.last()).toBeInViewport();
    expect(await documentHeight()).toBe(900);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
}

test('edit profile shows its saved program beside the institute', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors = await open(page, '/profile-test?edit');
  const institute = page.getByText('Institute of Computing Studies', { exact: true });
  const identity = institute.locator('..');
  const program = identity.getByText('BSIT', { exact: true });
  await expect(program).toBeVisible();
  expect((await program.boundingBox())!.x).toBeGreaterThan((await institute.boundingBox())!.x);

  await page.getByLabel('Program', { exact: true }).selectOption('BSCPE');
  await expect(program).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(program).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);

  await page.goto('http://ui-regressions.test/profile-test?edit&no-program');
  await expect(identity).toHaveText(/^Student\s*Institute of Computing Studies$/);
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

test('admin mobile More links to database, tickets and the Help Center', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, '/ics/admin/database?role=ADMIN&shell');
  await expect(page.getByRole('banner').getByRole('heading', { name: 'Database Management' })).toBeVisible();
  await page.getByRole('button', { name: 'Open more navigation options' }).click();
  const sheet = page.getByRole('dialog', { name: 'More navigation options' });
  await expect(sheet.getByRole('link', { name: /^Database Management/ })).toHaveAttribute('aria-current', 'page');
  await expect(sheet.getByRole('link', { name: /^Support Tickets/ })).toHaveAttribute('href', '/ics/admin/support-tickets');
  await expect(sheet.getByRole('link', { name: 'Help center', exact: true })).toHaveAttribute('href', '/ics/help');
  await expect(sheet.getByText('Review reported problems and reply to support requests')).toBeVisible();
  await expect(sheet.getByRole('link', { name: /^(Settings|Ohmward)\b/ })).toHaveCount(0);
});

for (const { role, question, guide, otherGuide, answer, link } of [
  { role: 'PROFESSOR', question: 'How do I start an attendance session?', guide: 'Upload and organize course materials', otherGuide: 'Mark your attendance', answer: /choose Start attendance/, link: 'Open My Courses' },
  { role: 'ADMIN', question: 'How do I check the backup status?', guide: 'Read activity and audit records', otherGuide: 'Upload and organize course materials', answer: /use Create Snapshot Now/, link: 'Open Database' },
]) {
  test(`ICS Help Center shows only the relevant guides for ${role}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 850 });
    const errors = await open(page, `/ics/help?role=${role}&shell`);
    const main = page.getByRole('main');
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().endsWith('/api/help/ask')) requests.push(request.url());
    });
    await expect(page.locator('.dashboard-sidebar').getByRole('link', { name: 'Help center', exact: true })).toHaveAttribute('aria-current', 'page');
    const guides = main.getByRole('region', { name: 'Common questions' });
    await expect(guides.getByText(guide, { exact: true })).toBeVisible();
    await expect(guides.getByText(otherGuide, { exact: true })).toHaveCount(0);
    const ask = main.getByRole('region', { name: 'Ask a question' });
    await ask.getByRole('textbox').fill(question);
    await ask.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(ask.getByText(answer).last()).toBeVisible();
    await expect(ask.getByRole('link', { name: link })).toBeVisible();
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });
}

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

for (const institute of ['ite', 'ibe']) {
  test(`${institute.toUpperCase()} keeps its flat sidebar and program tools`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const program = institute === 'ibe' ? '&program=BSBA%20HRM' : '';
    const url = `/${institute}/students?shell&institute=${institute}${program}`;
    const errors = await open(page, `${url}&role=STUDENT`);
    const nav = page.getByRole('navigation', { name: 'LMS navigation' });
    const groups = nav.getByRole('group');
    await expect(groups).toHaveCount(1);
    await expect(groups.first()).toHaveAccessibleName('Program tools');
    await expect(groups.first().getByRole('link', { name: institute === 'ite' ? 'Nursery Library' : 'Mock Interview' })).toBeVisible();
    const mainLinks = nav.locator(':scope > a');
    await expect(mainLinks).toHaveText([
      'Dashboard', 'Learning Materials', 'Announcements', 'Grades', 'Tasks & Calendar', 'Flashcards', 'Leaderboards',
      ...(institute === 'ite' ? ['Meetings', 'Lecture Videos'] : ['Consultation & Scheduling']),
    ]);
    await nav.getByRole('button', { name: 'My Courses' }).click();
    await expect(nav.getByRole('link', { name: 'CS101' })).toHaveAttribute('href', `/${institute}/courses/class`);

    for (const role of ['PROFESSOR', 'ADMIN']) {
      await page.goto(`http://ui-regressions.test${url}&role=${role}`);
      await expect(nav.getByRole('link', { name: role === 'ADMIN' ? 'Support Tickets' : 'Gradebooks' })).toBeVisible();
      await expect(groups).toHaveCount(0);
    }

    await page.setViewportSize({ width: 390, height: 850 });
    await page.getByRole('button', { name: 'Open more navigation options' }).click();
    const sheet = page.getByRole('dialog', { name: 'More navigation options' });
    await expect(sheet.getByText('Review and respond to support requests')).toBeVisible();
    await expect(sheet.getByRole('link', { name: /^(Help center|Report a problem)/ })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

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
