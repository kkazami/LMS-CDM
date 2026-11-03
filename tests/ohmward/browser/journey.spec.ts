import { test, expect, type BrowserContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const state=JSON.parse(fs.readFileSync(process.env.OHMWARD_BROWSER_STATE!,'utf8')) as {origin:string;tokens:Record<string,string>;output:string};
const root='/ics/activities/ohmward';
async function as(context:BrowserContext,who:string){await context.clearCookies();await context.addCookies([{name:'lumina_session',value:state.tokens[who],url:state.origin,httpOnly:true,sameSite:'Lax'}]);}

test('beginner completes primer and CIR-01–03; hints, restored draft and server feedback work',async({page,context})=>{
  await as(context,'student');
  await page.goto(root);await expect(page.locator('.ohmward').getByRole('heading',{name:'Ohmward',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Start the introduction'}).click();
  await page.getByLabel('Ambient light',{exact:true}).fill('20');await expect(page.getByRole('status',{name:''}).filter({hasText:'ON'})).toBeVisible();
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.getByRole('button',{name:'Start my journey'}).click();await expect(page.getByRole('heading',{name:'Circuitry',exact:true})).toBeVisible();
  await page.goto(root+'/levels/CIR-01');await page.getByRole('button',{name:'3. Build'}).click();
  await expect(page.getByLabel('Answer 1',{exact:true})).toBeVisible();
  const symbols=['battery','resistor','led','switch','ground','capacitor'];
  const firstResponse=await page.request.post('/api/ohmward/levels/CIR-01/attempts');expect(firstResponse.status()).toBe(200);const first=await firstResponse.json();
  const sequence=first.variantId==='b'?[...symbols].reverse():symbols;
  await page.getByLabel('Answer 1',{exact:true}).selectOption(sequence[0]);await expect(page.getByRole('status').filter({hasText:/^Saved$/})).toBeVisible();
  await page.reload();await page.getByRole('button',{name:'3. Build'}).click();await expect(page.getByLabel('Answer 1',{exact:true})).toHaveValue(sequence[0]);
  for(let i=0;i<sequence.length;i++)await page.getByLabel(`Answer ${i+1}`,{exact:true}).selectOption(sequence[i]);
  await page.getByRole('button',{name:'Reveal hint (0/3)'}).click();
  await page.getByRole('button',{name:'4. Prove'}).click();await page.getByRole('button',{name:'Submit for review'}).click();await page.getByRole('button',{name:'Read my feedback'}).click();
  await expect(page.getByText('2 of 3 stars · +50 XP',{exact:true})).toBeVisible();
  await page.goto(root+'/levels/CIR-02');await page.getByRole('button',{name:'3. Build'}).click();
  const second=await(await page.request.post('/api/ohmward/levels/CIR-02/attempts')).json();
  const roles=second.variantId==='b'?[...symbols].reverse():symbols;
  for(let i=0;i<roles.length;i++)await page.getByLabel(`Answer ${i+1}`,{exact:true}).selectOption(roles[i]);
  await page.getByRole('button',{name:'4. Prove'}).click();await page.getByRole('button',{name:'Submit for review'}).click();await page.getByRole('button',{name:'Read my feedback'}).click();await expect(page.getByText('3 of 3 stars · +50 XP',{exact:true})).toBeVisible();
  await page.goto(root+'/levels/CIR-03');await page.getByRole('button',{name:'3. Build'}).click();
  for(const [from,to]of [['0','2'],['3','4'],['5','6'],['7','1']]){await page.getByRole('combobox',{name:'From terminal',exact:true}).selectOption(from);await page.getByRole('combobox',{name:'To terminal',exact:true}).selectOption(to);await page.getByRole('button',{name:'Add wire',exact:true}).click();}
  await page.getByRole('button',{name:'Run test',exact:true}).click();await expect(page.getByText('LED ON',{exact:true})).toBeVisible();
  await page.screenshot({path:path.join(state.output,'circuit-workbench.png'),fullPage:true,animations:'disabled'});
  await page.getByRole('button',{name:'Switch closed',exact:true}).click();await expect(page.getByText('LED OFF',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'4. Prove'}).click();await page.getByRole('button',{name:'Submit for review'}).click();await page.getByRole('button',{name:'Read my feedback'}).click();await expect(page.getByText('3 of 3 stars · +50 XP',{exact:true})).toBeVisible();
  await page.goto(root+'/progress');await expect(page.getByText('3 of 30 levels passed',{exact:false})).toBeVisible();
  await page.screenshot({path:path.join(state.output,'student-progress.png'),fullPage:true});
});

test('real-cookie API denies cross-owner/institute/staff writes and roster includes zero-attempt student',async({page,context})=>{
  await as(context,'teacher');const roster=await page.request.get('/api/ohmward/analytics');expect(roster.status()).toBe(200);const data=await roster.json();expect(data.total).toBe(2);expect(data.students.find((row:{id:string})=>row.id==='untouched').completed).toBe(0);
  expect((await page.request.post('/api/ohmward/primer/complete')).status()).toBe(403);
  await page.goto(root+'/instructor');await expect(page.getByRole('row',{name:/Zero Attempt Learner/})).toBeVisible();await expect(page.getByRole('row',{name:/Other Class Learner/})).toHaveCount(0);await page.screenshot({path:path.join(state.output,'instructor.png'),fullPage:true});
  await as(context,'admin');expect((await page.request.get('/api/ohmward/analytics')).status()).toBe(200);expect((await page.request.post('/api/ohmward/primer/complete')).status()).toBe(403);
  await as(context,'foreign');expect((await page.request.get('/api/ohmward/catalog')).status()).toBe(403);
  await as(context,'pending');expect((await page.request.get('/api/ohmward/progress')).status()).toBe(401);
  await context.clearCookies();expect((await page.request.get('/api/ohmward/catalog')).status()).toBe(401);
});

test('mobile navigation, keyboard controls, dark theme and reduced motion preserve usable layout',async({page,context})=>{
  await as(context,'student');await page.setViewportSize({width:375,height:812});await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(root);await page.getByRole('button',{name:'Open more navigation options'}).click();await expect(page.getByRole('link',{name:/Ohmward Every circuit/})).toBeVisible();await page.keyboard.press('Escape');
  await page.goto(root+'/primer');await expect(page.getByRole('heading',{name:'Start with power',exact:true})).toBeVisible();const range=page.getByLabel('Ambient light',{exact:true});await expect(range).toHaveCount(1);await range.focus();await page.keyboard.press('Home');await expect(range).toHaveValue('0');
  await page.evaluate(()=>{document.documentElement.dataset.theme='dark';document.documentElement.classList.add('dark');});
  await expect.poll(()=>page.locator('.lms-shell').evaluate(element=>getComputedStyle(element).backgroundColor)).toBe('rgb(11, 13, 19)');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:path.join(state.output,'mobile-dark-reduced.png'),fullPage:true});
  for(const width of [768,1366,1440]){await page.setViewportSize({width,height:768});await page.goto(root);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.join(state.output,`overview-${width}.png`),fullPage:true});}
  await page.evaluate(()=>{document.body.style.zoom='2';});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('draft survives immediate internal navigation and history traversal; levels never share attempt state',async({page,context})=>{
  await as(context,'student');await page.goto(root+'/modules/circuitry');await page.getByRole('link',{name:'Review or replay'}).first().click();await page.getByRole('button',{name:'3. Build'}).click();
  await page.getByLabel('Answer 1',{exact:true}).selectOption('capacitor');await page.getByRole('link',{name:'← Circuitry',exact:true}).click();await expect(page).toHaveURL(/modules\/circuitry$/);
  await page.getByRole('link',{name:'Review or replay'}).first().click();await page.getByRole('button',{name:'3. Build'}).click();await expect(page.getByLabel('Answer 1',{exact:true})).toHaveValue('capacitor');
  await page.getByLabel('Answer 1',{exact:true}).selectOption('ground');await page.goBack();await expect(page).toHaveURL(/modules\/circuitry$/);
  await page.goForward();await expect(page).toHaveURL(/levels\/CIR-01$/);await page.getByRole('button',{name:'3. Build'}).click();await expect(page.getByLabel('Answer 1',{exact:true})).toHaveValue('ground');
  await page.goBack();await expect(page).toHaveURL(/modules\/circuitry$/);
  await page.getByRole('link',{name:'Review or replay'}).first().click();await page.getByRole('button',{name:'3. Build'}).click();await expect(page.getByLabel('Answer 1',{exact:true})).toHaveValue('ground');
  await page.getByRole('link',{name:'← Circuitry',exact:true}).click();await page.getByRole('link',{name:'Review or replay'}).nth(1).click();await page.getByRole('button',{name:'3. Build'}).click();await expect(page.getByLabel('Answer 1',{exact:true})).toHaveValue('');
});

test('failed saves survive search-result navigation; explicit retry after 401 preserves the draft; reload freezes editing',async({page,context})=>{
  await as(context,'student');await page.goto(root+'/levels/CIR-01');await page.getByRole('button',{name:'3. Build'}).click();
  await page.route('**/api/ohmward/attempts/*',async route=>{if(route.request().method()==='PATCH')await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'Session expired. Sign in again.'})});else await route.continue();});
  await page.getByLabel('Answer 1',{exact:true}).selectOption('led');await expect(page.getByRole('alert').filter({hasText:'Session expired'})).toBeVisible();
  await page.keyboard.press('Control+k');await page.getByRole('textbox',{name:'Search courses, assignments, tools'}).fill('My Courses');await page.getByRole('option',{name:/My Courses/}).click();await expect(page).toHaveURL(/\/ics\/courses$/);
  await expect(page.getByText('Ohmward has unsaved work.',{exact:true})).toBeVisible();await page.getByRole('link',{name:'Return to CIR-01',exact:true}).click();await page.getByRole('button',{name:'3. Build'}).click();await expect(page.getByLabel('Answer 1',{exact:true})).toHaveValue('led');
  await page.unroute('**/api/ohmward/attempts/*');await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByRole('status').filter({hasText:/^Saved$/})).toBeVisible();await expect(page.getByLabel('Answer 1',{exact:true})).toHaveValue('led');
  const opened=await(await page.request.post('/api/ohmward/levels/CIR-01/attempts')).json();await page.request.patch(`/api/ohmward/attempts/${opened.id}`,{data:{revision:opened.revision,state:opened.state}});
  await page.getByLabel('Answer 1',{exact:true}).selectOption('switch');await expect(page.getByText('Save conflict',{exact:true})).toBeVisible();
  await page.route('**/api/ohmward/attempts/*',async route=>{if(route.request().method()==='GET')await new Promise(resolve=>setTimeout(resolve,500));await route.continue();});
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Reload saved version'}).click();await expect(page.getByLabel('Answer 1',{exact:true})).toBeDisabled();await expect(page.getByLabel('Answer 1',{exact:true})).toBeEnabled();await expect(page.getByLabel('Answer 1',{exact:true})).toHaveValue('led');
});

test('same-tab login transition with genuinely missing cookie retains the original owner’s draft',async({page,context})=>{
  await as(context,'student');await page.goto(root+'/levels/CIR-01');await page.getByRole('button',{name:'3. Build'}).click();
  await context.clearCookies();await page.getByLabel('Answer 1',{exact:true}).selectOption('resistor');await expect(page.getByRole('alert').filter({hasText:'Sign in to continue'})).toBeVisible();
  await page.keyboard.press('Control+k');await page.getByRole('textbox',{name:'Search courses, assignments, tools'}).fill('My Courses');await page.getByRole('option',{name:/My Courses/}).click();await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await context.addCookies([{name:'lumina_session',value:state.tokens.student,url:state.origin,httpOnly:true,sameSite:'Lax'}]);
  await page.goBack();await expect(page).toHaveURL(/levels\/CIR-01$/);await page.getByRole('button',{name:'3. Build'}).click();await expect(page.getByLabel('Answer 1',{exact:true})).toHaveValue('resistor');await expect(page.getByRole('status').filter({hasText:/^Saved$/})).toBeVisible();
});
