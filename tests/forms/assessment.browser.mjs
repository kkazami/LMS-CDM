import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {createWebWorkspace} from '../roster/web-workspace.mjs';
export async function browserChecks({cluster,output,check,driver}){
 const port=await new Promise(resolve=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const {port}=server.address();server.close(()=>resolve(port));});});
 const base=`http://127.0.0.1:${port}`,workspace=createWebWorkspace(output);
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
  await check('browser hides scheduled assessments across classwork, assignments, dashboard and direct URLs',async()=>{
   for(const route of ['/ics/courses/course/classwork','/ics/assignments','/ics/students']){await page.goto(base+route);assert.equal(await page.getByText('Scheduled Browser Assessment',{exact:true}).count(),0,route);}
   const response=await page.goto(base+`/ics/courses/course/classwork/forms/${formId}/respond`);assert.ok([200,404].includes(response.status()));await page.getByRole('heading',{name:'Page not found',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Start assessment',exact:true}).count(),0);
   assert.equal(await driver.db.formAttempt.count({where:{formId}}),0);
   const api=await student.request.get(base+url);assert.equal(api.status(),404);
  });
  const editor=await teacher.newPage();editor.setDefaultTimeout(45000);
  await check('instructor settings preserve local schedule times and failed saves stay open',async()=>{
   await editor.goto(base+`/ics/courses/course/classwork/forms/${formId}/builder`);
   await editor.getByRole('button',{name:'Settings',exact:true}).click();
   const expected=opens.toLocaleString('sv-SE',{timeZone:'Asia/Manila'}).replace(' ','T').slice(0,16);
   assert.equal(await editor.getByLabel('Opens at',{exact:true}).inputValue(),expected);
   await editor.route('**'+url,route=>route.request().method()==='PATCH'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic save unavailable'})}):route.continue());
   await editor.getByRole('button',{name:'Save Settings',exact:true}).click();await editor.getByRole('alert').filter({hasText:'Synthetic save unavailable'}).waitFor();
   await editor.getByRole('heading',{name:'Form Settings & Access Control'}).waitFor();await editor.unroute('**'+url);
   await editor.getByRole('button',{name:'Save Settings',exact:true}).click();await editor.getByRole('heading',{name:'Form Settings & Access Control'}).waitFor({state:'hidden'});
   const saved=await driver.db.form.findUniqueOrThrow({where:{id:formId}});assert.equal(saved.opensAt.toISOString(),opens.toISOString());
   await editor.getByRole('button',{name:'Settings',exact:true}).click();assert.equal(await editor.getByLabel('Opens at',{exact:true}).inputValue(),expected);
   await editor.screenshot({path:path.join(output,'instructor-settings.png'),fullPage:true});
   await editor.getByRole('button',{name:'Cancel',exact:true}).click();
   await editor.getByRole('button',{name:'Update Published',exact:true}).click();
   await editor.waitForURL('**/ics/courses/course/classwork');
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
   await page.getByRole('button',{name:'Submit',exact:true}).click();
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
