import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const requireTsx=createRequire(path.resolve('node_modules/tsx/package.json'));
const {build}=requireTsx(path.resolve('node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild'));
const app=path.resolve('apps/web');
const result=await build({stdin:{contents:`import React from 'react'; import {createRoot} from 'react-dom/client'; import OrganizationChart from './src/components/academic-structure/OrganizationChart'; createRoot(document.getElementById('root')).render(<OrganizationChart instituteCode="ics" programs={[{id:'test-program',code:'BSIT',name:'BSIT',isHead:true}]}/>);`,resolveDir:app,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},plugins:[{name:'preview-links',setup(build){build.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'preview'}));build.onLoad({filter:/.*/,namespace:'preview'},()=>({contents:`import React from 'react'; export default function Link({children,...props}){return React.createElement('a',props,children);}`,loader:'jsx',resolveDir:app}));}}]});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage();
 const errors=[];
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('http://chart.test/**',route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/chart'))return route.fulfill({json:{program:{id:'test-program',code:'BSIT',name:'BSIT'},isHead:true,version:1,nodes:[],members:[]}});
  if(url.pathname.endsWith('/instructors'))return route.fulfill({json:{instructors:[],hasMore:false}});
  return route.fulfill({contentType:'text/html',body:'<div id="root"></div>'});
 });
 await page.goto('http://chart.test/');
 await page.addScriptTag({content:result.outputFiles[0].text});
 for(let repeat=0;repeat<2;repeat++){
  await page.getByRole('button',{name:'Add instructor',exact:true}).click();
  await page.getByRole('dialog',{name:'Add instructor to BSIT',exact:true}).waitFor();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: React development build opens/closes the instructor dialog twice without duplicate-key warnings or runtime errors.');
}finally{await browser.close();}
