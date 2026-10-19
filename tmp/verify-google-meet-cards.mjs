import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
const req=createRequire(import.meta.url),requireWeb=createRequire(path.resolve('apps/web/package.json'));
const {build}=req(path.resolve('node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild'));
const app=path.resolve('apps/web');
const code=`import React from 'react';import {createRoot} from 'react-dom/client';import AnnouncementCard from './src/components/courses/AnnouncementCard';
const original='https://meet.google.com/jpy-mhvi-xjf\\n\\nPlease join the meet by 8:30 AM';
function Demo(){const [content,setContent]=React.useState(original);const base={id:'post',createdAt:'2026-10-03T12:07:00Z',author:{id:'professor',name:'Professor Smith',avatarUrl:null}};const theme={colors:{primary:'#c2410c'}};return <main style={{padding:24,maxWidth:820,margin:'auto',fontFamily:'Arial,sans-serif'}}><section aria-label="Instructor view"><h2>Instructor view</h2><AnnouncementCard announcement={{...base,content}} theme={theme} canEditDelete onUpdate={async(id,value)=>{setContent(value);return {success:true}}}/></section><section aria-label="Student view"><h2 style={{marginTop:24}}>Student view</h2><AnnouncementCard announcement={{...base,content:original}} theme={theme}/></section><section aria-label="No meeting"><AnnouncementCard announcement={{...base,content:'Plain announcement'}} theme={theme}/></section></main>};createRoot(document.getElementById('root')).render(<Demo/>);`;
const built=await build({stdin:{contents:code,resolveDir:app,loader:'tsx'},tsconfig:path.join(app,'tsconfig.json'),bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'preview-next',setup(build){build.onResolve({filter:/^next\/(navigation|link|image)$/},args=>({path:args.path,namespace:'preview'}));build.onLoad({filter:/.*/,namespace:'preview'},args=>({contents:args.path.endsWith('navigation')?`export const useParams=()=>({institute:'ics'});`:`import React from 'react';export default function Component({children,...props}){return React.createElement('${args.path.endsWith('image')?'img':'a'}',props,children);}`,loader:'jsx',resolveDir:app}));}}]});
const postcss=requireWeb('postcss'),tailwind=requireWeb('@tailwindcss/postcss');
const css=(await postcss([tailwind({base:app})]).process('@import "tailwindcss";',{from:path.join(app,'src/app/meet-preview.css')})).css;
const output=path.resolve('tmp/google-meet-preview');fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:850}});const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setContent(`<style>${css}</style><div id="root"></div>`);
 await page.addScriptTag({content:built.outputFiles[0].text});
 for(const label of ['Instructor view','Student view']){
  const region=page.getByRole('region',{name:label,exact:true});
  const link=region.getByRole('link',{name:/Join Google Meet/});await link.waitFor();
  assert.equal(await link.getAttribute('href'),'https://meet.google.com/jpy-mhvi-xjf');
  assert.equal(await link.getAttribute('target'),'_blank');assert.match(await link.getAttribute('rel'),/noopener/);
  assert.ok((await link.boundingBox()).height>=44);
 }
 assert.equal(await page.getByRole('region',{name:'No meeting'}).getByRole('link',{name:/Join Google Meet/}).count(),0);
 await page.screenshot({path:path.join(output,'desktop.png')});
 await page.setViewportSize({width:390,height:900});await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
 const instructor=page.getByRole('region',{name:'Instructor view',exact:true});
 await instructor.getByTitle('Edit Announcement',{exact:true}).click();
 assert.equal(await instructor.getByRole('link',{name:/Join Google Meet/}).count(),0);
 await instructor.getByRole('textbox').fill('New meeting https://meet.google.com/abc-defg-hij');
 await instructor.getByRole('button',{name:'Save',exact:true}).click();
 await instructor.getByRole('link',{name:/Join Google Meet/}).waitFor();
 assert.equal(await instructor.getByRole('link',{name:/Join Google Meet/}).getAttribute('href'),'https://meet.google.com/abc-defg-hij');
 await instructor.getByTitle('Edit Announcement',{exact:true}).click();
 await instructor.getByRole('textbox').fill('No meeting now');await instructor.getByRole('button',{name:'Save',exact:true}).click();
 await instructor.getByRole('link',{name:/Join Google Meet/}).waitFor({state:'hidden'});
 assert.deepEqual(errors,[]);console.log('PASS instructor/student Meet buttons, destinations, new-tab attributes, editing/removal, mobile sizing and browser runtime.');
}finally{await browser.close();}
