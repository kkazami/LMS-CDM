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
    import {ThemeProvider} from '${root}/apps/web/src/lib/theme-context';
    import {getInstituteTheme} from '${root}/apps/web/src/lib/get-institute-theme';
    const theme=getInstituteTheme('ics'), query=new URLSearchParams(location.search);
    const user={id:'student',name:'Alex Student',email:'very-long-student-email-address@department.example.invalid',role:'STUDENT',studentNumber:'2026-001',uniqueId:'student',avatarUrl:null,bio:'LongBioWithoutSpaces'.repeat(45)+'\\nSecond paragraph.',phone:'+639000000000',department:'BSIT',yearLevel:'4th Year',coverColor:'#6C4B40',createdAt:'2026-08-01',institute:{code:'ics',name:'Institute of Computing Studies'},taughtCourses:[],enrollments:[]};
    const courses=[{id:'class',code:'CS101',title:'Programming'}];
    const posts=[{id:'notice',content:'Class reminder. Please review the lesson before our next class.',authorName:'Professor Smith',authorAvatarUrl:null,courseId:'class',courseCode:'CS101',courseTitle:'Programming',createdAt:'2026-10-21T09:00:00Z'}];
    const role=query.get('role')||'PROFESSOR';
    const content=location.pathname==='/'?<Landing/>:location.pathname==='/profile-test'?<main className="p-4 sm:p-8"><Profile user={user} isOwnProfile={false} instituteCode="ics" theme={theme}/></main>:<><main className="p-4 pb-24">{location.pathname.endsWith('/announcements')?<Announcements announcements={query.has('empty')?[]:posts} enrolledCourses={query.has('empty')?[]:courses} theme={theme} instituteCode="ics" isInstructor={role!=='STUDENT'}/>:<h1>Teacher Dashboard</h1>}</main><Nav instituteCode="ics" primaryColor={theme.colors.primary} userRole={role}/></>;
    createRoot(document.getElementById('root')).render(<ThemeProvider>{content}</ThemeProvider>);
  `,loader:'tsx',resolveDir:path.resolve('apps/web')},bundle:true,write:false,jsx:'automatic',outdir:'out',tsconfig:'apps/web/tsconfig.json',nodePaths:[path.resolve('apps/web/node_modules')],
    define:{'process.env.NODE_ENV':'"production"','process.env':'{}'},
    plugins:[{name:'framework-boundaries',setup(b:any){
      b.onResolve({filter:/^next\/(image|link|navigation)$|^@\/lib\/public-fonts$/},({path}:any)=>({path,namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'},({path:name}:any)=>({loader:'tsx',resolveDir:path.resolve('apps/web'),contents:
        name==='next/link'?`export default function Link({children,prefetch,...props}){return <a {...props}>{children}</a>}`:
        name==='next/image'?`export default function Image({fill,priority,unoptimized,quality,sizes,...props}){return <img {...props} style={fill?{position:'absolute',inset:0,width:'100%',height:'100%',...props.style}:props.style}/>} `:
        name==='next/navigation'?`export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:url=>{location.href=url},prefetch:()=>{}});`:
        `export const publicDisplay={className:'',variable:''};`
      }));
    }}],
  });
  script=built.outputFiles.find((f:{path:string})=>f.path.endsWith('.js')).text;
  css=(await postcss([tailwind({base:path.resolve('apps/web')})]).process(await fs.readFile('apps/web/src/app/globals.css','utf8'),{from:path.resolve('apps/web/src/app/globals.css')})).css
    + ':root{--font-cdm-body:Arial,sans-serif}';
  await fs.mkdir(output,{recursive:true});
});

async function open(page:Page, url:string) {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://ui-regressions.test/**',async route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname.startsWith('/images/')) {
      const file=path.resolve('apps/web/public','.'+pathname);
      if(!file.startsWith(path.resolve('apps/web/public/images')+path.sep))return route.abort();
      try{return route.fulfill({path:file});}catch{return route.fulfill({status:404,body:''});}
    }
    if(pathname.startsWith('/api/'))return route.fulfill({json:{notifications:[],unreadCount:0}});
    return route.fulfill({contentType:'text/html',body:`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${script}</script></body></html>`});
  });
  await page.goto('http://ui-regressions.test'+url);
  return errors;
}

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
