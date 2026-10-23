// Render real internal page components with synthetic data. No database or sessions are modified.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const rootRequire = createRequire(path.resolve('package.json'));
const { build } = rootRequire(rootRequire.resolve('esbuild', { paths: [path.dirname(rootRequire.resolve('tsx'))] }));
const { chromium } = require('@playwright/test');
const base = process.env.LOGIN_TEST_BASE_URL || 'http://localhost:3000';
const output = path.resolve('tmp/brand-cohesion-review');

async function main() {
  const root = process.cwd().replaceAll('\\', '/');
  const bundle = await build({
    stdin: { contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import Shell from '${root}/apps/web/src/components/layout/DashboardLayout';
      import Dashboard from '${root}/apps/web/src/app/(dashboard)/[institute]/students/client';
      import Courses from '${root}/apps/web/src/app/(dashboard)/[institute]/courses/client';
      import Announcements from '${root}/apps/web/src/app/(dashboard)/[institute]/announcements/client';
      import Settings from '${root}/apps/web/src/app/(dashboard)/[institute]/settings/client';
      import {getInstituteTheme} from '${root}/apps/web/src/lib/get-institute-theme';
      const [code,view]=location.pathname.slice(1).split('/');
      const query=new URLSearchParams(location.search),role=query.get('role')||'STUDENT';
      const theme=getInstituteTheme(code),name={ics:'Institute of Computing Studies',ite:'Institute of Teacher Education',ibe:'Institute of Business and Entrepreneurship'}[code];
      const courses=[{id:'course-a',title:'Systems Administration',code:'SYSADMIN',courseCode:'SYSADMIN',section:'3A',subject:'Computing',room:'301',instructorName:'Alex Rivera',description:'Explore connected systems.',enrolledCount:24},{id:'course-b',title:'Web Application Development',code:'WEBDEV',courseCode:'WEBDEV',section:'3A',subject:'Computing',room:'302',instructorName:'Sam Reyes',description:'Build for the web.',enrolledCount:26}];
      const now='2026-10-21T02:00:00Z';
      localStorage.setItem('cdm-theme-mode',query.get('theme')||'light');
      window.fetch=async()=>new Response(JSON.stringify({notifications:[],unreadCount:0,count:0,events:[],success:true}),{headers:{'Content-Type':'application/json'}});
      const user={id:'fixture-user',name:'Jamie Santos',email:'jamie@example.invalid',role,avatarUrl:null,preferences:{}};
      function App(){let page;
        if(view==='courses')page=<Courses courses={courses} instituteCode={code} theme={theme} userRole={role} canEdit={role!=='STUDENT'}/>;
        else if(view==='announcements')page=<Announcements announcements={[{id:'announcement',content:'Project consultation this week. Bring your draft and questions to our next class.',authorName:'Alex Rivera',authorAvatarUrl:null,courseId:'course-a',courseTitle:courses[0].title,courseCode:'SYSADMIN',createdAt:now}]} enrolledCourses={courses} instituteCode={code} theme={theme}/>;
        else if(view==='settings')page=<Settings user={user} enrolledCourses={courses} taughtCourses={[]} instituteCode={code} theme={theme}/>;
        else page=<Dashboard userName='Jamie Santos' instituteName={name} instituteCode={code} theme={theme} initialCourses={courses} calendar={{events:[],schedules:[]}} userId={user.id} today='2026-10-21' dueSoonItems={[{id:'assignment',title:'System architecture proposal',type:'ASSIGNMENT',dueDate:'2026-10-22T08:00:00Z',courseId:'course-a',courseTitle:courses[0].title,courseCode:'SYSADMIN',courseSection:'3A'}]} serverNow={now} exp={1712} streakCurrent={5} level={6} greeting='A quiet moment to learn, Jamie.'/>;
        return <Shell instituteCode={code} instituteName={name} userName={user.name} userRole={role} studentNumber='26-00123' theme={theme} enrolledCourses={courses} isEligibleForActivities isEligibleForKnowledgeExchange exp={1712}>{page}</Shell>;
      }
      createRoot(document.getElementById('root')).render(<App/>);
    `, loader: 'tsx', resolveDir: path.resolve('apps/web') },
    bundle: true, write: false, outdir: 'out', jsx: 'automatic', tsconfig: 'apps/web/tsconfig.json',
    nodePaths: [path.resolve('apps/web/node_modules')], define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'framework-fixture', setup(builder) {
      builder.onResolve({ filter: /^next\/(link|image|navigation|dynamic)$/ }, args => ({ path: args.path, namespace: 'framework' }));
      builder.onLoad({ filter: /.*/, namespace: 'framework' }, args => ({ loader: 'jsx', resolveDir: path.resolve('apps/web'), contents:
        args.path === 'next/navigation' ? `export const usePathname=()=>location.pathname,useSearchParams=()=>new URLSearchParams(location.search),useRouter=()=>({push(){},replace(){},refresh(){},prefetch(){}});` :
        args.path === 'next/dynamic' ? `export default function dynamic(){return function DeferredWidget(){return null}}` :
        args.path === 'next/link' ? `import React from 'react';export default function Link({href,prefetch,replace,scroll,...props}){return <a href={typeof href==='string'?href:'#'} {...props}/>}` :
        `import React from 'react';export default function Image({src,priority,fill,quality,sizes,unoptimized,...props}){return <img src={src} {...props}/>} `
      }));
      builder.onResolve({ filter: /\/actions$/ }, () => ({ path: 'actions', namespace: 'fixture-actions' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture-actions' }, () => ({ contents: `export const unenrollFromCourse=async()=>({success:true}),archiveCourse=unenrollFromCourse,reorderCourseCards=unenrollFromCourse,updateCourseCoverImage=unenrollFromCourse,requestEnrollment=unenrollFromCourse,joinWithCode=unenrollFromCourse,instructorCreateCourse=unenrollFromCourse,getClassPrograms=async()=>[],getCourseTerms=async()=>[],getDiscoverableCourses=async()=>[];` }));
    } }],
  });
  const script = bundle.outputFiles.find(file => file.path.endsWith('.js')).text;
  const css = bundle.outputFiles.find(file => file.path.endsWith('.css'))?.text || '';
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    const assets = await page.evaluate(() => ({ htmlClass: document.documentElement.className, css: [...document.styleSheets].map(sheet => [...sheet.cssRules].map(rule => rule.cssText).join('\n')).join('\n') }));
    await page.route('http://lms-brand.test/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.startsWith('/images/') || pathname.startsWith('/_next/static/')) {
        const response = await page.request.get(base + pathname);
        return route.fulfill({ response });
      }
      return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="en" class="${assets.htmlClass}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${assets.css}\n${css}</style></head><body><div id="root"></div><script>${script.replaceAll('</script>', '<\\/script>')}</script></body></html>` });
    });
    const matrix = [];
    for (const width of [1440, 390]) for (const mode of ['light', 'dark']) for (const view of ['students', 'courses', 'announcements', 'settings']) matrix.push({ code: 'ics', width, mode, view });
    for (const code of ['ibe', 'ite']) for (const mode of ['light', 'dark']) matrix.push({ code, width: 1440, mode, view: 'courses' });
    matrix.push({ code: 'ics', width: 1920, mode: 'light', view: 'students' });
    for (const role of ['PROFESSOR', 'ADMIN']) matrix.push({ code: 'ics', width: 1440, mode: 'light', view: 'courses', role });
    for (const entry of matrix) {
      const { code, width, mode, view, role = 'STUDENT' } = entry;
      await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
      await page.goto(`http://lms-brand.test/${code}/${view}?theme=${mode}&role=${role}`, { waitUntil: 'networkidle' });
      await page.locator('main').waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.locator('aside img').first().evaluate(image => image.complete && image.naturalWidth > 0), 'Campus crest should load');
      const metrics = await page.evaluate(() => {
        const shell = document.querySelector('.lms-shell'), main = document.querySelector('main');
        const button=[...main.querySelectorAll('button')].find(node => /Join (Course|Class)|Save Theme/.test(node.textContent));
        const luminance = color => {
          const context = document.createElement('canvas').getContext('2d');
          context.fillStyle = color; context.fillRect(0, 0, 1, 1);
          const rgb = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
          return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
        };
        const style=button&&getComputedStyle(button), bg=style&&luminance(style.backgroundColor), fg=style&&luminance(style.color);
        return { font: getComputedStyle(document.body).fontFamily, buttonContrast: style ? (Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05) : null, overflow: document.documentElement.scrollWidth - innerWidth, mainOverflow: main.scrollWidth - main.clientWidth, text: main.innerText, theme: document.documentElement.dataset.theme };
      });
      assert.match(metrics.font, /Manrope/i);
      assert.equal(metrics.theme, mode);
      assert.ok(metrics.overflow <= 1 && metrics.mainOverflow <= 1, `${JSON.stringify(entry)} overflow ${JSON.stringify(metrics)}`);
      assert.ok(metrics.text.length > 50);
      if(metrics.buttonContrast!==null) assert.ok(metrics.buttonContrast>=4.5, `Primary button contrast: ${metrics.buttonContrast}`);
      if(view==='settings') assert.equal(await page.getByRole('button',{name:`${mode==='dark'?'Dark':'Light'} Mode`,exact:true}).getAttribute('aria-pressed'),'true');
      if (view === 'students') {
        const order = await page.locator('main').innerText();
        const coursesIndex=order.indexOf('My Enrolled Classes'),calendarIndex=order.indexOf('Calendar');
        assert.ok(coursesIndex>=0 && calendarIndex>coursesIndex, 'Courses should precede the calendar');
        if(width===390){
          const course=await page.locator('main').getByRole('heading',{name:'Systems Administration',exact:true}).boundingBox();
          const navTop=await page.locator('[data-mobile-bottom-nav]').evaluate(node=>node.getBoundingClientRect().top);
          assert.ok(course && course.y+course.height<navTop,'Enrolled coursework should appear above mobile navigation in the first viewport');
        }
      }
      if (code === 'ics' && role === 'STUDENT') {
        await page.screenshot({ path: path.join(output, `${view}-${width}-${mode}.png`), fullPage: true });
        if (view === 'students' || view === 'settings') await page.screenshot({ path: path.join(output, `${view}-${width}-${mode}-viewport.png`) });
      }
      console.log(`${code} ${view} ${width}px ${mode} ${role}: passed`);
    }
    assert.deepEqual(errors, []);
    console.log(`${matrix.length} real component fixture checks passed; server authentication and deferred widgets are outside this test's scope.`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
