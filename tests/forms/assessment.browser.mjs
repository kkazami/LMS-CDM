import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {createWebWorkspace} from '../roster/web-workspace.mjs';
export async function browserChecks({cluster,output,check,driver}){
 const port=await new Promise(resolve=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const {port}=server.address();server.close(()=>resolve(port));});});
 const base=`http://localhost:${port}`,workspace=createWebWorkspace(output);
 const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i.test(key)));
 const server=spawn(process.execPath,['tests/roster/browser-server.mjs'],{env:{...env,NODE_ENV:'development',DATABASE_URL:cluster.url,APP_BASE_URL:base,NEXT_TELEMETRY_DISABLED:'1',ROSTER_TEST_APP_DIR:workspace.appDir,ROSTER_TEST_PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});
 let log='',browser;server.stdout.on('data',v=>log+=v);server.stderr.on('data',v=>log+=v);
 try{
  const deadline=Date.now()+120000;let ready=false;while(Date.now()<deadline){try{if((await fetch(base+'/api/auth/register')).status===405){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.equal(ready,true,'isolated Next server starts');
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const teacher=await browser.newContext({viewport:{width:1366,height:900},timezoneId:'Asia/Manila',reducedMotion:'reduce'});
  const student=await browser.newContext({viewport:{width:1366,height:900},timezoneId:'Asia/Manila',reducedMotion:'reduce'});
  async function login(context,email){const response=await context.request.post(base+'/api/auth/login',{headers:{Origin:base},data:{identifier:email,password:'FormSynthetic123!',instituteCode:'ics',acceptedPolicies:true}});assert.equal(response.status(),200,await response.text());}
  await login(teacher,'form-teacher@example.invalid');await login(student,'form-student@example.invalid');
  const request=async(method,route,data)=>{const response=await teacher.request.fetch(base+route,{method,headers:{Origin:base},...(data?{data}:{})});assert.equal(response.status(),200,await response.text());return response.json();};
  const created=await request('POST','/api/courses/course/forms',{title:'Scheduled Browser Assessment'});const formId=created.formId,itemId=created.syllabusItemId;
  const url=`/api/courses/course/forms/${formId}`;
  const opens=new Date(Date.now()+86400000);opens.setUTCHours(2,30,0,0);const closes=new Date(opens.getTime()+7200000);
  await request('PATCH',url,{opensAt:opens.toISOString(),closesAt:closes.toISOString()});await request('POST',url+'/publish');
  const page=await student.newPage();page.setDefaultTimeout(45000);
  await check('student Classwork shows scheduled metadata; direct links show a locked opening notice',async()=>{
   await page.goto(base+'/ics/courses/course/classwork');await page.getByText('Scheduled Browser Assessment',{exact:true}).waitFor();await page.getByText(/Opens /).first().waitFor();
   for(const route of ['/ics/assignments','/ics/students']){await page.goto(base+route);assert.equal(await page.getByText('Scheduled Browser Assessment',{exact:true}).count(),0,route);}
   for(const route of [`/ics/courses/course/classwork/forms/${formId}`,`/ics/courses/course/classwork/forms/${formId}/respond`,`/ics/courses/course/classwork/${itemId}`]) {
    await page.goto(base+route);await page.getByRole('heading',{name:/This quiz opens on/}).waitFor();assert.equal(await page.getByRole('button',{name:'Start assessment',exact:true}).count(),0);
   }
   await page.screenshot({path:path.join(output,'student-scheduled.png'),fullPage:true});
   assert.equal(await driver.db.formAttempt.count({where:{formId}}),0);
   const api=await student.request.get(base+url);assert.equal(api.status(),404);
  });
  const editor=await teacher.newPage();editor.setDefaultTimeout(45000);
  await check('new form creation explains drafts and supports keyboard accessible category selection',async()=>{
   await editor.goto(base+'/ics/courses/course/classwork/forms/new');
   const choice=editor.getByRole('button',{name:/Midterm Exam Major exam|Midterm Exam Midterm assessment/});await choice.click();assert.equal(await choice.getAttribute('aria-pressed'),'true');
   await editor.getByLabel('Title',{exact:true}).fill('Instructor-created Midterm Draft');
   await editor.getByRole('button',{name:'Create draft and add questions',exact:true}).click();await editor.waitForURL('**/builder');
   await editor.locator('[data-form-builder-ready="true"]').waitFor();
   const draft=await driver.db.form.findFirstOrThrow({where:{title:'Instructor-created Midterm Draft'},include:{syllabusItem:true}});assert.equal(draft.status,'DRAFT');assert.equal(draft.formType,'MIDTERM_EXAM');assert.equal(draft.syllabusItem.type,'MIDTERM_EXAM');
  });
  await check('question bank and AI assistance keep service errors visible inside their dialogs',async()=>{
   await editor.route('**/api/question-bank?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic bank unavailable'})}));
   await editor.getByRole('button',{name:'From Bank',exact:true}).click();await editor.getByRole('dialog',{name:'Question Bank',exact:true}).getByRole('alert').filter({hasText:'Synthetic bank unavailable'}).waitFor();
   await editor.keyboard.press('Escape');await editor.getByRole('dialog',{name:'Question Bank',exact:true}).waitFor({state:'hidden'});await editor.unroute('**/api/question-bank?*');
   await editor.route('**/forms/generate-questions',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic AI unavailable'})}));
   await editor.getByRole('button',{name:'AI Assistant',exact:true}).click();
   const modal=editor.getByRole('dialog',{name:'AI Question Assistant',exact:true});await modal.getByPlaceholder(/Paste lecture notes/).fill('Explain static IP configuration');
   await modal.getByRole('button',{name:'Generate Questions',exact:true}).click();await modal.getByRole('alert').filter({hasText:'Synthetic AI unavailable'}).waitFor();
   assert.equal(await modal.getByPlaceholder(/Paste lecture notes/).inputValue(),'Explain static IP configuration');await editor.keyboard.press('Escape');await modal.waitFor({state:'hidden'});await editor.unroute('**/forms/generate-questions');
  });
  await check('partially failed AI insertion cannot duplicate saved questions on retry',async()=>{
   const draft=await driver.db.form.findFirstOrThrow({where:{title:'Instructor-created Midterm Draft'}});
   const generated=[1,2].map(index=>({questionType:'SHORT_ANSWER',prompt:'Generated question '+index,points:1,isRequired:true,partialCredit:false,config:{shortAnswer:{correctAnswers:['answer']}}}));
   await editor.route('**/forms/generate-questions',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({questions:generated})}));
   await editor.getByRole('button',{name:'AI Assistant',exact:true}).click();const modal=editor.getByRole('dialog',{name:'AI Question Assistant',exact:true});
   await modal.getByRole('button',{name:'Generate Questions',exact:true}).click();await modal.getByRole('button',{name:'Insert 2 Questions',exact:true}).waitFor();
   let inserts=0;await editor.route(`**/forms/${draft.id}/questions`,async route=>{inserts++;if(inserts===2)await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic insert unavailable'})});else await route.continue();});
   await modal.getByRole('button',{name:'Insert 2 Questions',exact:true}).click();await modal.getByRole('alert').filter({hasText:'Some questions may already be saved'}).waitFor();
   assert.equal(await driver.db.formQuestion.count({where:{formId:draft.id}}),2);
   await modal.getByRole('button',{name:'Insert 2 Questions',exact:true}).click();await modal.getByRole('alert').filter({hasText:'reload to check which questions were saved'}).waitFor();assert.equal(inserts,2);
   await editor.keyboard.press('Escape');await modal.waitFor({state:'hidden'});await editor.unroute(`**/forms/${draft.id}/questions`);await editor.unroute('**/forms/generate-questions');
  });
  await check('instructor settings preserve local schedule times and failed saves stay open',async()=>{
   await editor.goto(base+`/ics/courses/course/classwork/forms/${formId}/builder`);
   await editor.locator('[data-form-builder-ready="true"]').waitFor();
   await editor.getByRole('button',{name:'Settings',exact:true}).click();
   const expected=opens.toLocaleString('sv-SE',{timeZone:'Asia/Manila'}).replace(' ','T').slice(0,16);
   assert.equal(await editor.getByLabel('Start date',{exact:true}).inputValue(),expected);
   await editor.route('**'+url,route=>route.request().method()==='PATCH'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic save unavailable'})}):route.continue());
   await editor.getByRole('button',{name:'Save Settings',exact:true}).click();await editor.getByRole('alert').filter({hasText:'Synthetic save unavailable'}).waitFor();
   await editor.getByRole('heading',{name:'Form Settings & Access Control'}).waitFor();await editor.unroute('**'+url);
   await editor.getByRole('button',{name:'Save Settings',exact:true}).click();await editor.getByRole('heading',{name:'Form Settings & Access Control'}).waitFor({state:'hidden'});
   const saved=await driver.db.form.findUniqueOrThrow({where:{id:formId}});assert.equal(saved.opensAt.toISOString(),opens.toISOString());
   await editor.getByRole('button',{name:'Settings',exact:true}).click();assert.equal(await editor.getByLabel('Start date',{exact:true}).inputValue(),expected);
   await editor.screenshot({path:path.join(output,'instructor-settings.png'),fullPage:true});
   await editor.getByRole('button',{name:'Cancel',exact:true}).click();
   await editor.getByRole('button',{name:'Update Published',exact:true}).click();
   await editor.getByRole('button',{name:'Publish assessment',exact:true}).click();
   await editor.waitForURL('**/ics/courses/course/classwork');
  });
  await check('builder saves latest rapid edits, retries failures, and directs publishing errors to the question',async()=>{
   await editor.goto(base+`/ics/courses/course/classwork/forms/${formId}/builder`);
   await editor.getByRole('region',{name:'Assessment setup guide'}).waitFor();
   const title=editor.getByLabel('Assessment title',{exact:true});
   let writes=0;
   await editor.route('**'+url,async route=>{if(route.request().method()==='PATCH'){writes++;await new Promise(resolve=>setTimeout(resolve,700));}await route.continue();});
   const first=editor.waitForRequest(request=>request.url().endsWith(url)&&request.method()==='PATCH');
   await title.fill('FIRST TITLE');await first;await title.fill('Latest rapid title');
   await editor.getByRole('button',{name:'Preview',exact:true}).click();await editor.waitForURL('**/preview');
   assert.equal((await driver.db.form.findUniqueOrThrow({where:{id:formId}})).title,'Latest rapid title');assert.ok(writes<=2);
   await editor.unroute('**'+url);
   await editor.goto(base+`/ics/courses/course/classwork/forms/${formId}/builder`);
   const q=await driver.db.formQuestion.findFirstOrThrow({where:{formId}});
   await editor.route('**'+url+`/questions/${q.id}`,route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic question save failed'})}));
   await editor.getByLabel('Question 1 title',{exact:true}).fill('Latest instructor question');
   await editor.getByRole('button',{name:'Retry saving',exact:true}).waitFor();
   await editor.unroute('**'+url+`/questions/${q.id}`);
   const retried = editor.waitForResponse(response=>response.url().endsWith(`/questions/${q.id}`)&&response.status()===200);
   await editor.getByRole('button',{name:'Retry saving',exact:true}).click();
   await retried;
   await editor.getByRole('button',{name:'Retry saving',exact:true}).waitFor({state:'hidden'});
   assert.equal((await driver.db.formQuestion.findUniqueOrThrow({where:{id:q.id}})).prompt,'Latest instructor question');
   await editor.screenshot({path:path.join(output,'instructor-builder.png'),fullPage:true});
   await editor.getByLabel('Question 1 title',{exact:true}).fill('');
   await editor.getByRole('button',{name:'Publish',exact:true}).click();await editor.getByRole('button',{name:'Publish assessment',exact:true}).click();
   await editor.getByRole('dialog',{name:'Check this before publishing'}).waitFor();
   await editor.screenshot({path:path.join(output,'instructor-publish-validation.png'),fullPage:true});
   await editor.getByRole('button',{name:'Question #1 cannot have a blank title.',exact:true}).click();
   await editor.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Question 1 title');
   await editor.getByLabel('Question 1 title',{exact:true}).fill('Latest instructor question');
   await editor.getByRole('button',{name:'Preview',exact:true}).click();await editor.waitForURL('**/preview');
  });
  await check('student must explicitly start with the form password; rapid final answer is flushed before submit',async()=>{
   await request('PATCH',url,{opensAt:new Date(Date.now()-60000).toISOString(),closesAt:new Date(Date.now()+3600000).toISOString(),password:'classroom',showScoreAfter:true});
   const question=await driver.db.formQuestion.findFirstOrThrow({where:{formId}});
   await request('PATCH',url+`/questions/${question.id}`,{questionType:'SHORT_ANSWER',prompt:'Enter the assessment response',points:10,config:{shortAnswer:{correctAnswers:['ASSESSMENT-FINAL-7']}}});
   await request('POST',url+'/publish');
   await page.goto(base+`/ics/courses/course/classwork/forms/${formId}/respond`);await page.getByRole('button',{name:'Start assessment',exact:true}).waitFor();
   assert.equal(await driver.db.formAttempt.count({where:{formId}}),0);
   await page.getByLabel('Form password',{exact:true}).fill('wrong');await page.getByRole('button',{name:'Start assessment',exact:true}).click();await page.getByRole('alert').filter({hasText:'Invalid form password'}).waitFor();
   assert.equal(await driver.db.formAttempt.count({where:{formId}}),0);
   await page.getByLabel('Form password',{exact:true}).fill('classroom');
   await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(output,'student-start-mobile.png'),fullPage:true});
   await page.getByRole('button',{name:'Start assessment',exact:true}).click();await page.getByPlaceholder('Your answer...').waitFor();
   assert.equal(await driver.db.formAttempt.count({where:{formId}}),1);
   let firstSave=true;
   await student.route('**/answers',async route=>{
    if(firstSave){firstSave=false;await new Promise(r=>setTimeout(r,1500));await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic autosave failure'})});}
    else{await new Promise(r=>setTimeout(r,350));await route.continue();}
   });
   const saving=page.waitForRequest(request=>request.url().endsWith('/answers'));
   await page.getByPlaceholder('Your answer...').fill('FIRST');await saving;
   const latestSaved=page.waitForResponse(response=>response.url().endsWith('/answers')&&response.status()===200);
   await page.getByPlaceholder('Your answer...').fill('ASSESSMENT-FINAL-7');await page.getByRole('button',{name:'Submit',exact:true}).click();
   await latestSaved;
   const confirmation=page.getByText('Your response has been submitted successfully.',{exact:true});
   const outcome=await Promise.race([confirmation.waitFor().then(()=> 'submitted'),page.getByRole('button',{name:'Submit',exact:true}).waitFor().then(()=> 'retry')]);
   if(outcome==='retry')await page.getByRole('button',{name:'Submit',exact:true}).click();
   await page.getByText('Your response has been submitted successfully.',{exact:true}).waitFor();
   const attempt=await driver.db.formAttempt.findFirstOrThrow({where:{formId},include:{answers:true}});assert.equal(attempt.rawScore,10);assert.equal(attempt.answers[0].answerText,'ASSESSMENT-FINAL-7');
   const submission=await driver.db.studentSubmission.findUniqueOrThrow({where:{syllabusItemId_studentId:{syllabusItemId:itemId,studentId:'student'}}});assert.equal(submission.grade,10);
   await page.screenshot({path:path.join(output,'student-result-mobile.png'),fullPage:true});
  });
  await teacher.close();await student.close();
 }finally{
  fs.writeFileSync(path.join(output,'browser-server.log'),log.replaceAll(cluster.url,'[LOCAL_DATABASE]'));
  await browser?.close();if(server.exitCode===null){const stopped=new Promise(resolve=>server.once('close',resolve));server.kill();await stopped;}
  workspace.dispose();
 }
}
