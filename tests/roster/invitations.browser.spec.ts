import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('package.json'));
const { build } = require(require.resolve('esbuild', { paths: [path.dirname(require.resolve('tsx'))] }));
let script = '';
let css = '';
const sender = { enabled: true, healthy: true, verified: true, paused: false, ready: true, availableToday: 400, dailyLimit: 400, queuedCount: 0, estimatedCompletion: null };
const student = { id: 'student', name: 'Maria Santos', email: 'maria@example.invalid', studentNumber: '2026-001', section: 'BSIT-1A', program: 'BSIT', isActive: true, activationStatus: 'PENDING_ACTIVATION', invitationVersion: 0, invitationStatus: 'NOT_SENT', lastSentAt: null, lastError: null };
test.beforeAll(async () => {
 const root = process.cwd().replaceAll('\\', '/');
 const result = await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';import Roster from '${root}/apps/web/src/components/admin/RosterOnboarding';import {getInstituteTheme} from '${root}/apps/web/src/lib/get-institute-theme';createRoot(document.getElementById('root')).render(<React.StrictMode><Roster instituteCode="ics" theme={getInstituteTheme('ics')} initialTab="invitations"/></React.StrictMode>);`, loader:'tsx', resolveDir:path.resolve('apps/web') }, bundle:true,write:false,outdir:'out',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},tsconfig:'apps/web/tsconfig.json',nodePaths:[path.resolve('apps/web/node_modules')] });
 script = result.outputFiles.find((f: {path:string})=>f.path.endsWith('.js')).text;
 css = (await fs.readFile('apps/web/src/app/globals.css','utf8')).replace(/^@import "tailwindcss";\s*/m,'').replace(/^@variant dark.*;\s*/m,'')
  + result.outputFiles.find((f: {path:string})=>f.path.endsWith('.css')).text
  + '*{box-sizing:border-box}body{margin:0}p{margin:0}main{padding:32px;max-width:1480px;margin:auto}@media(max-width:600px){main{padding:16px}}';
});

test.beforeEach(async ({page}) => {
 page.on('pageerror',error=>console.error('Browser error:',error.message));
 await page.addInitScript(style=>{document.addEventListener('DOMContentLoaded',()=>{const el=document.createElement('style');el.textContent=style;document.head.append(el);});},css);
});
test('failed loading stops the spinner, shows the error, and can be retried without a false empty state', async ({page}) => {
 let failed = true;
 await page.route('http://localhost:4319/**', route => route.request().url().includes('/api/')
  ? route.fulfill({status: failed ? 503 : 200,json: failed ? {message:'Student accounts could not be loaded. Try again.'} : {users:[student],sender}})
  : route.fulfill({contentType:'text/html',body:'<main id="root"></main>'}));
 await page.goto('http://localhost:4319/');await page.addScriptTag({content:script});
 await expect(page.getByRole('alert')).toHaveText('Student accounts could not be loaded. Try again.');
 await expect(page.getByText('Loading student accounts…')).toHaveCount(0);
 await expect(page.getByText(/No students/)).toHaveCount(0);
 failed = false;await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await expect(page.getByRole('row').filter({hasText:'Maria Santos'})).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);
});
test('active accounts are shown clearly and cannot be selected for another activation invitation', async ({page}) => {
 await page.route('http://localhost:4319/**', route => route.request().url().includes('/api/')
  ? route.fulfill({json:{users:[{...student,activationStatus:'ACTIVE',invitationStatus:'ACTIVATED'}],sender:{...sender,enabled:false,ready:false}}})
  : route.fulfill({contentType:'text/html',body:'<main id="root"></main>'}));
 await page.goto('http://localhost:4319/');await page.addScriptTag({content:script});
 await expect(page.getByRole('cell',{name:'Account active',exact:true})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:'Select Maria Santos'})).toBeDisabled();
 await expect(page.getByText('No students are waiting for an account invitation.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Send invitations',exact:true})).toBeDisabled();
 await expect(page.getByText('Email invitations are turned off for this site.')).toBeVisible();
 await expect(page.getByRole('button',{name:'Check email connection'})).toBeVisible();
});
test('sending requires a selected pending student and a separate confirmation', async ({page}) => {
 const posted: unknown[]=[];
 await page.route('http://localhost:4319/**', async route => {
  const r=route.request();
  if(!r.url().includes('/api/'))return route.fulfill({contentType:'text/html',body:'<main id="root"></main>'});
  if(r.method()==='POST'){posted.push(r.postDataJSON());return route.fulfill({json:{queued:1}});}
  return route.fulfill({json:r.url().includes('additional=')?sender:{users:[student],sender}});
 });
 await page.goto('http://localhost:4319/');await page.addScriptTag({content:script});
 await page.getByRole('checkbox',{name:'Select Maria Santos'}).check();
 await page.getByRole('button',{name:'Send invitations (1)',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Send 1 invitation?'})).toBeVisible();expect(posted).toHaveLength(0);
 await page.getByRole('region',{name:'Confirm invitations',exact:true}).getByRole('button',{name:'Send invitations',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'1 invitation is waiting to send.'})).toBeVisible();
 expect(posted).toHaveLength(1);
});

test('an older loading response cannot replace a newer account list', async ({page}) => {
 let calls=0,release!:()=>void;
 const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('http://localhost:4319/**',async route=>{
  if(!route.request().url().includes('/api/'))return route.fulfill({contentType:'text/html',body:'<main id="root"></main>'});
  const n=++calls;
  if(n===1)await held;
  return route.fulfill({json:{users:[n===1?{...student,name:'Outdated student'}:{...student,activationStatus:'ACTIVE',invitationStatus:'ACTIVATED'}],sender}});
 });
 await page.goto('http://localhost:4319/');await page.addScriptTag({content:script});
 await expect(page.getByRole('cell',{name:'Account active',exact:true})).toBeVisible();
 release();
 await expect(page.getByText('Outdated student',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
});

const accounts = Array.from({length:31},(_,i)=>({
 ...student,id:`student-${i+1}`,name:`Student ${String(i+1).padStart(2,'0')}`,email:`student${i+1}@example.invalid`,
 studentNumber:`2026-${String(i+1).padStart(3,'0')}`,program:i>=15?'BSCPE':'BSIT',section:i>=15?'BSCPE-1A':'BSIT-1A',
}));

test('15 accounts per page, global filters, and refresh after the last page shrinks',async({page})=>{
 let users=accounts;
 await page.route('http://localhost:4319/**',route=>route.request().url().includes('/api/')
  ?route.fulfill({json:{users,sender}}):route.fulfill({contentType:'text/html',body:'<main id="root"></main>'}));
 await page.goto('http://localhost:4319/');await page.addScriptTag({content:script});
 const rows=page.locator('tbody tr');
 await expect(rows).toHaveCount(15);
 await expect(page.getByText('Showing 1–15 of 31 accounts')).toBeVisible();
 await expect(page.getByRole('button',{name:'Previous',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(rows).toHaveCount(15);await expect(rows.first()).toContainText('Student 16');
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(rows).toHaveCount(1);await expect(rows.first()).toContainText('Student 31');
 await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
 await page.getByRole('searchbox',{name:'Search',exact:true}).fill('Student 02');
 await expect(rows).toHaveCount(1);await expect(rows.first()).toContainText('Student 02');
 await expect(page.getByText('Page 1 of 1')).toBeVisible();
 await page.getByRole('searchbox',{name:'Search',exact:true}).fill('');
 await page.getByRole('combobox',{name:'Program',exact:true}).selectOption('BSCPE');
 await expect(rows).toHaveCount(15);await expect(rows.first()).toContainText('Student 16');
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await expect(rows).toHaveCount(1);
 await page.getByRole('combobox',{name:'Program',exact:true}).selectOption('');
 await expect(page.getByText('Page 1 of 3')).toBeVisible();
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await page.getByRole('button',{name:'Next',exact:true}).click();
 users=accounts.slice(0,5);
 await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await expect(rows).toHaveCount(5);await expect(page.getByText('Page 1 of 1')).toBeVisible();
 await page.getByRole('searchbox',{name:'Search',exact:true}).fill('missing');
 await expect(rows).toHaveCount(0);
 await expect(page.getByText('Showing 0–0 of 0 accounts')).toBeVisible();
 await expect(page.getByText('No students match your search or filters.')).toBeVisible();
});

test('page selection excludes active and suspended accounts and preserves explicit selections across pages',async({page})=>{
 const users=accounts.map((u,i)=>i===0?{...u,activationStatus:'ACTIVE',invitationStatus:'ACTIVATED'}:i===1?{...u,isActive:false}:u);
 const estimates:string[]=[];
 await page.route('http://localhost:4319/**',route=>{
  const url=route.request().url();
  if(!url.includes('/api/'))return route.fulfill({contentType:'text/html',body:'<main id="root"></main>'});
  if(url.includes('additional=')){estimates.push(url);return route.fulfill({json:sender});}
  return route.fulfill({json:{users,sender}});
 });
 await page.goto('http://localhost:4319/');await page.addScriptTag({content:script});
 await page.getByRole('button',{name:'Select this page',exact:true}).click();
 await expect(page.getByRole('button',{name:'Send invitations (13)',exact:true})).toBeEnabled();
 await expect(page.getByRole('checkbox',{name:'Select Student 01',exact:true})).not.toBeChecked();
 await expect(page.getByRole('checkbox',{name:'Select Student 02',exact:true})).not.toBeChecked();
 await page.getByRole('button',{name:'Next',exact:true}).click();
 const selectAll=page.getByRole('checkbox',{name:'Select eligible accounts on this page',exact:true});
 await expect(selectAll).not.toBeChecked();await selectAll.check();
 await expect(page.getByText('28 selected across all pages')).toBeVisible();
 await page.getByRole('button',{name:'Previous',exact:true}).click();
 await page.getByRole('checkbox',{name:'Select Student 03',exact:true}).uncheck();
 expect(await selectAll.evaluate((node:HTMLInputElement)=>node.indeterminate)).toBe(true);
 await page.getByRole('button',{name:'Send invitations (27)',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Send 27 invitations?'})).toBeVisible();
 expect(estimates[0]).toContain('additional=27');
 await page.getByRole('combobox',{name:'Section',exact:true}).selectOption('BSCPE-1A');
 await expect(page.getByRole('heading',{name:'Send 27 invitations?'})).toHaveCount(0);
 await expect(page.getByText('No accounts selected')).toBeVisible();
 await expect(page.getByRole('button',{name:'Send invitations',exact:true})).toBeDisabled();
 await expect(page.getByText('Page 1 of 2')).toBeVisible();
});

test('retry only includes failed eligible accounts on the current page',async({page})=>{
 const users=accounts.map(u=>({...u,invitationStatus:'FAILED'}));
 const posted:any[]=[];
 await page.route('http://localhost:4319/**',route=>{
  const r=route.request();
  if(!r.url().includes('/api/'))return route.fulfill({contentType:'text/html',body:'<main id="root"></main>'});
  if(r.method()==='POST'){posted.push(r.postDataJSON());return route.fulfill({json:{queued:15}});}
  return route.fulfill({json:r.url().includes('additional=')?sender:{users,sender}});
 });
 await page.goto('http://localhost:4319/');await page.addScriptTag({content:script});
 await page.getByRole('button',{name:'Next',exact:true}).click();
 await page.getByRole('button',{name:'Retry failed on this page',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Send 15 invitations?'})).toBeVisible();
 await page.getByRole('region',{name:'Confirm invitations',exact:true}).getByRole('button',{name:'Send invitations',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'15 invitations are waiting to send.'})).toBeVisible();
 expect(posted[0].userIds).toEqual(accounts.slice(15,30).map(u=>u.id));
});

for(const viewport of [{width:1440,height:960},{width:390,height:844}]) {
 test(`invitation layout at ${viewport.width}px in light and dark`,async({page})=>{
  await page.setViewportSize(viewport);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const names=['Maria Santos','James Reyes','Andrea Cruz','Luis Garcia','Sofia Mendoza','Miguel Torres','Isabel Ramos','Daniel Flores','Camille Tan','Gabriel Aquino','Elena Navarro','Paolo Rivera','Nina Castillo','Carlo Bautista','Alyssa Lim'];
  const users=accounts.map((u,i)=>({...u,name:names[i%15],
   invitationStatus:i%4===0?'ACTIVATED':i%4===1?'SENT':i%4===2?'NOT_SENT':'FAILED',
   activationStatus:i%4===0?'ACTIVE':'PENDING_ACTIVATION',
   lastSentAt:i%4===1?'2026-10-19T02:30:00Z':null,
  }));
  await page.route('http://localhost:4319/**',route=>route.request().url().includes('/api/')
   ?route.fulfill({json:{users,sender}}):route.fulfill({contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="root"></main></body></html>'}));
  await page.goto('http://localhost:4319/');await page.addScriptTag({content:script});
  await expect(page.locator('tbody tr')).toHaveCount(15);
  await fs.mkdir('tmp/roster-ui-review',{recursive:true});
  for(const mode of ['light','dark']) {
   await page.locator('html').evaluate((el,mode)=>el.setAttribute('data-theme',mode),mode);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const region=page.getByRole('region',{name:'Student accounts',exact:true});
   if(viewport.width===390)expect(await region.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
   await page.screenshot({path:`tmp/roster-ui-review/${mode}-${viewport.width}.png`,fullPage:true,animations:'disabled'});
  }
  await page.getByRole('button',{name:'Select this page',exact:true}).click();
  await expect(page.getByText('11 selected across all pages')).toBeVisible();
  await page.getByRole('button',{name:'Clear selection',exact:true}).click();
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect(page.getByText('Page 2 of 3')).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(15);
  expect(errors).toEqual([]);
 });
}
