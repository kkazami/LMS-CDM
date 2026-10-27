// Owned loopback database only. No dotenv or production accounts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {AsyncLocalStorage} from 'node:async_hooks';
import {hash} from 'bcryptjs';
import {createDisposablePostgres} from '../program-head/postgres-fixture.mjs';
const require=createRequire(import.meta.url);
const webRequire=createRequire(path.resolve('apps/web/package.json'));
const {build}=require(require.resolve('esbuild',{paths:[path.dirname(require.resolve('tsx'))]}));
const output=path.resolve('tmp/roster-import/forms-'+Date.now());fs.mkdirSync(output,{recursive:true});
const report={disposable:true,checks:[]};
async function check(name,work){await work();report.checks.push(name);console.log('PASS '+name);}
let cluster,driver;
try{
 const cwd=process.cwd();try{if(process.env.LMS_TEST_FIXTURE_ROOT)process.chdir(process.env.LMS_TEST_FIXTURE_ROOT);cluster=await createDisposablePostgres();}finally{process.chdir(cwd);}
 const emptyEnv=path.join(output,'empty.env');fs.writeFileSync(emptyEnv,'');
 const ddl=execFileSync(process.execPath,[path.join(process.env.APPDATA,'npm/node_modules/pnpm/bin/pnpm.cjs'),'exec','prisma','migrate','diff','--from-empty','--to-schema','prisma/schema.prisma','--script'],{env:{...process.env,DATABASE_URL:cluster.url,DOTENV_CONFIG_PATH:emptyEnv},windowsHide:true,encoding:'utf8'});
 await cluster.owner.query(ddl);await cluster.owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO bqual_test_app');
 process.env.DATABASE_URL=cluster.url;process.env.NODE_ENV='test';
 const context=new AsyncLocalStorage();globalThis.__formActor=context;
 const root='@/app/api/courses/[courseId]/';
 const routes={list:['forms/route','GET'],create:['forms/route','POST'],detail:['forms/[formId]/route','GET'],settings:['forms/[formId]/route','PATCH'],remove:['forms/[formId]/route','DELETE'],publish:['forms/[formId]/publish/route','POST'],close:['forms/[formId]/close/route','POST'],start:['forms/[formId]/attempts/route','POST'],history:['forms/[formId]/attempts/route','GET'],attempt:['forms/[formId]/attempts/[attemptId]/route','GET'],answer:['forms/[formId]/attempts/[attemptId]/answers/route','PUT'],submit:['forms/[formId]/attempts/[attemptId]/submit/route','POST'],question:['forms/[formId]/questions/route','POST'],editQuestion:['forms/[formId]/questions/[questionId]/route','PATCH'],deleteQuestion:['forms/[formId]/questions/[questionId]/route','DELETE'],reorder:['forms/[formId]/questions/reorder/route','POST'],section:['forms/[formId]/sections/route','POST'],fromBank:['forms/[formId]/questions/from-bank/route','POST'],responses:['forms/[formId]/responses/route','GET'],response:['forms/[formId]/responses/[attemptId]/route','GET'],grade:['forms/[formId]/responses/[attemptId]/route','PATCH'],analytics:['forms/[formId]/analytics/route','GET'],export:['forms/[formId]/responses/export/route','GET'],classwork:['classwork/route','GET'],course:['route','GET'],studentGrades:['grades/route','GET']};
 const entry=Object.entries(routes).map(([name,[route,method]])=>`export {${method} as ${name}} from '${root+route}';`).join('\n')+"\nexport {GET as bankList,POST as bankCreate} from '@/app/api/question-bank/route';export {POST as bankCopy} from '@/app/api/question-bank/from-question/[questionId]/route';export {db} from '@/lib/db';export * from '@/lib/forms/availability';export {scheduledForm} from '@/lib/forms/access';export {visibleSyllabusForms} from '@/lib/forms/visibility';export {syncAttemptScoreToGradebook} from '@/lib/forms/gradebook-sync';";
 const bundle=await build({stdin:{contents:entry,resolveDir:path.resolve('apps/web/src'),loader:'ts'},bundle:true,write:false,platform:'node',format:'cjs',tsconfig:'apps/web/tsconfig.json',nodePaths:[path.resolve('apps/web/node_modules')],external:['@prisma/client','@prisma/adapter-pg','pg'],plugins:[{name:'isolated-actor',setup(b){
  b.onResolve({filter:/^@\/lib\/(api-auth|auth-session)$/},()=>({path:'actor',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export async function getSessionFromRequest(){ const user=globalThis.__formActor.getStore();return user?{user}:null; } export const getSession=getSessionFromRequest;'}));
  b.onResolve({filter:/legacy-entry-guard$/},()=>({path:'guard',namespace:'guard'}));b.onLoad({filter:/.*/,namespace:'guard'},()=>({contents:'export async function denyLegacyApi(){return null;}'}));
  b.onResolve({filter:/^next\/server$/},()=>({path:'server',namespace:'server'}));b.onLoad({filter:/.*/,namespace:'server'},()=>({resolveDir:process.cwd(),contents:`export {NextResponse} from ${JSON.stringify(webRequire.resolve('next/server').replaceAll('\\','/'))};export function after(){}`}));
 }}]});
 const file=path.join(output,'driver.cjs');fs.writeFileSync(file,bundle.outputFiles[0].text);driver=require(file);
 await driver.db.institute.createMany({data:[{id:'ics',code:'ics',name:'Computing Studies'},{id:'ite',code:'ite',name:'Teacher Education'}]});
 const password=await hash('FormSynthetic123!',4);
 await driver.db.user.createMany({data:[{id:'teacher',name:'Form Instructor',email:'form-teacher@example.invalid',role:'PROFESSOR',instituteId:'ics',password},{id:'other-teacher',name:'Other Instructor',email:'form-other@example.invalid',role:'INSTRUCTOR',instituteId:'ics',password},{id:'student',name:'Form Student',email:'form-student@example.invalid',studentNumber:'26-77771',role:'STUDENT',instituteId:'ics',password},{id:'outsider',name:'Other Student',email:'form-outsider@example.invalid',studentNumber:'26-77772',role:'STUDENT',instituteId:'ics',password},{id:'foreign',name:'Foreign Student',email:'form-foreign@example.invalid',studentNumber:'26-77773',role:'STUDENT',instituteId:'ite',password}]});
 await driver.db.course.createMany({data:[{id:'course',code:'CS100',courseCode:'FORM100',title:'Form Course',instituteId:'ics',instructorId:'teacher'},{id:'other-course',code:'CS101',courseCode:'FORM101',title:'Other Course',instituteId:'ics',instructorId:'other-teacher'}]});
 await driver.db.enrollment.create({data:{studentId:'student',courseId:'course',status:'APPROVED'}});
 const actors=Object.fromEntries((await driver.db.user.findMany({include:{institute:true}})).map(user=>[user.id,user]));
 const params={courseId:'course',formId:'',attemptId:'',questionId:''};
 const call=(name,body,actor=actors.teacher,overrides={})=>context.run(actor,()=>driver[name](new Request('http://localhost:3000/api/courses/course/forms',{method:routes[name][1],headers:{'Content-Type':'application/json',Origin:'http://localhost:3000'},...(body===undefined?{}:{body:JSON.stringify(body)})}),{params:Promise.resolve({...params,...overrides})}));
 let future,open,draft;
 await check('instructor creates drafts with a linked item and initial question',async()=>{
  for(const [title,status] of [['Future Assessment','future'],['Open Assessment','open'],['Draft Assessment','draft']]){
   const response=await call('create',{title});assert.equal(response.status,200,await response.clone().text());const data=await response.json();
   if(status==='future')future=data.formId;else if(status==='open')open=data.formId;else draft=data.formId;
   assert.equal(await driver.db.formQuestion.count({where:{formId:data.formId}}),1);
  }
  await driver.db.syllabusItem.create({data:{id:'normal-item',courseId:'course',type:'ASSIGNMENT',title:'Normal Assignment',orderIndex:10}});
  params.formId=future;
 });
 const futureOpens=new Date(Date.now()+3600000),futureCloses=new Date(Date.now()+7200000);
 await check('schedule edits validate dates and keep the linked deadline in sync',async()=>{
  assert.equal((await call('settings',{opensAt:'invalid'})).status,400);
  assert.equal((await call('settings',{opensAt:futureCloses.toISOString(),closesAt:futureOpens.toISOString()})).status,400);
  assert.equal((await call('settings',{opensAt:futureOpens.toISOString(),closesAt:futureCloses.toISOString()})).status,200);
  assert.equal((await call('settings',{closesAt:new Date().toISOString()})).status,400);
  const form=await driver.db.form.findUniqueOrThrow({where:{id:future},include:{syllabusItem:true}});assert.equal(form.syllabusItem.dueDate.toISOString(),futureCloses.toISOString());
 });
 await check('scheduled publication sends one accurate schedule notice and immediate publication deduplicates',async()=>{
  assert.equal((await call('publish')).status,200);assert.equal((await call('publish')).status,200);
  assert.equal(await driver.db.notification.count({where:{type:'CLASSWORK'}}),1);
  const notice=await driver.db.notification.findFirstOrThrow();assert.match(notice.message,/opens on/);
  assert.equal((await call('publish',undefined,actors.teacher,{formId:open})).status,200);
  assert.equal((await call('publish',undefined,actors.teacher,{formId:open})).status,200);
  assert.equal(await driver.db.notification.count({where:{type:'CLASSWORK'}}),2);
 });
 await check('students cannot see scheduled/draft forms through lists, course details or classwork',async()=>{
  for(const name of ['list','classwork','course','studentGrades']){
   const response=await call(name,undefined,actors.student);assert.equal(response.status,200,await response.clone().text());const text=await response.text();assert.ok(!text.includes('Future Assessment'));assert.ok(!text.includes('Draft Assessment'));assert.ok(text.includes('Open Assessment'));
  }
  assert.equal((await call('detail',undefined,actors.student)).status,404);
  assert.equal((await call('start',{},actors.student)).status,404);
  assert.equal((await call('detail',undefined,actors.student,{formId:draft})).status,404);
  assert.equal(await driver.db.formAttempt.count(),0);
  assert.equal((await call('detail')).status,200);
 });
 await check('web metadata discovery exposes a scheduled notice without questions or starting an attempt',async()=>{
  const notice=await driver.scheduledForm(actors.student,'course',future);assert.equal(notice.title,'Future Assessment');assert.deepEqual(Object.keys(notice).sort(),['closesAt','formType','opensAt','title']);
  assert.equal(await driver.scheduledForm(actors.outsider,'course',future),null);
  assert.equal(await driver.scheduledForm(actors.foreign,'course',future),null);
  const items=await driver.db.syllabusItem.findMany({where:{courseId:'course',...await driver.visibleSyllabusForms(new Date(),'student',{scheduledFormMetadata:true})},select:{title:true}});
  assert.ok(items.some(item=>item.title==='Future Assessment'));assert.ok(!items.some(item=>item.title==='Draft Assessment'));
  assert.equal((await call('detail',undefined,actors.student)).status,404);assert.equal(await driver.db.formAttempt.count(),0);
 });
 await check('forms appear automatically at opening and answer keys/password hashes stay private',async()=>{
  await driver.db.form.update({where:{id:future},data:{opensAt:new Date(Date.now()-1000),passwordHash:await hash('room-secret',4)}});
  let response=await call('list',undefined,actors.student);assert.ok((await response.text()).includes('Future Assessment'));
  response=await call('detail',undefined,actors.student);const data=await response.json();assert.equal(data.form.hasPassword,true);assert.equal('passwordHash' in data.form,false);assert.equal(data.form.questions.length,0);
  const safe=driver.studentQuestionConfig({options:[{id:'a',text:'A',isCorrect:true,feedback:'secret'}],shortAnswer:{correctAnswers:['secret']},codeAnswer:{language:'js',correctOutput:'secret'}});assert.ok(!JSON.stringify(safe).includes('secret'));
  assert.equal((await call('start',{},actors.student)).status,401);
 });
 await check('every form editor/results route rejects another instructor, outsider and foreign institute',async()=>{
  const edits=['settings','remove','publish','close','question','editQuestion','deleteQuestion','reorder','section','fromBank','responses','response','grade','analytics','export'];
  for(const name of edits){const response=await call(name,['GET','DELETE'].includes(routes[name][1])?undefined:{},actors['other-teacher']);assert.equal(response.status,403,name+': '+await response.text());}
  for(const name of ['list','detail','start','history']){
   assert.equal((await call(name,name==='start'?{}:undefined,actors.outsider)).status,403,name);
   assert.equal((await call(name,name==='start'?{}:undefined,actors.foreign)).status,404,name);
  }
  assert.equal((await call('section',{},actors.teacher,{formId:future,courseId:'other-course'})).status,403);
 });
 await check('password start is atomic, caps deadline at close and never exceeds attempt limit',async()=>{
  const results=await Promise.all(Array.from({length:5},()=>call('start',{password:'room-secret'},actors.student)));
  assert.ok(results.every(r=>r.status===200));const values=await Promise.all(results.map(r=>r.json()));assert.equal(new Set(values.map(v=>v.attemptId)).size,1);
  params.attemptId=values[0].attemptId;assert.equal(await driver.db.formAttempt.count({where:{formId:future}}),1);assert.equal(new Date(values[0].deadlineAt).toISOString(),futureCloses.toISOString());
  const question=await driver.db.formQuestion.findFirstOrThrow({where:{formId:future}});params.questionId=question.id;
  const detail=await (await call('detail',undefined,actors.student)).json();assert.equal(detail.form.questions[0].config.options[0].isCorrect,undefined);
 });
 await check('started assessments preserve question content, category, history and visibility',async()=>{
  assert.equal((await call('editQuestion',{prompt:'Changed while a student works'})).status,409);
  assert.equal((await call('deleteQuestion')).status,409);
  assert.equal((await call('question',{questionType:'SHORT_ANSWER',prompt:'New question',points:1,config:{}})).status,409);
  assert.equal((await call('remove')).status,409);
  assert.equal((await call('settings',{formType:'FINAL_EXAM'})).status,409);
  assert.equal((await call('settings',{opensAt:new Date(Date.now()+3600000).toISOString()})).status,409);
  assert.equal(await driver.db.formAttempt.count({where:{formId:future}}),1);
 });
 await check('autosave rejects cross-form questions and saves legitimate answers',async()=>{
  const foreignQuestion=await driver.db.formQuestion.findFirstOrThrow({where:{formId:open}});
  assert.equal((await call('answer',{questionId:foreignQuestion.id,answerOptions:['opt_1']},actors.student)).status,400);
  assert.equal((await call('answer',{questionId:params.questionId,answerOptions:['opt_1']},actors.student)).status,200);
 });
 await check('submission is atomic/idempotent and gradebook stores raw points, not a percentage',async()=>{
  const responses=await Promise.all([call('submit',{},actors.student),call('submit',{},actors.student)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  const attempt=await driver.db.formAttempt.findUniqueOrThrow({where:{id:params.attemptId}});assert.equal(attempt.rawScore,1);
  const form=await driver.db.form.findUniqueOrThrow({where:{id:future}});const submission=await driver.db.studentSubmission.findUniqueOrThrow({where:{syllabusItemId_studentId:{syllabusItemId:form.syllabusItemId,studentId:'student'}}});assert.equal(submission.grade,1);
  assert.equal((await call('start',{password:'room-secret'},actors.student)).status,403);
  assert.equal((await call('answer',{questionId:params.questionId,answerOptions:['opt_2']},actors.student)).status,400);
 });
 await check('hidden score/result settings survive reload and all attempt APIs',async()=>{
  await call('settings',{showScoreAfter:false,showFeedbackAfter:false,showAnswersAfter:false});
  const history=await (await call('history',undefined,actors.student)).json();assert.equal(history.attempts[0].rawScore,null);assert.equal(history.attempts[0].percentage,null);
  const grades=await (await call('studentGrades',undefined,actors.student)).json();assert.ok(!JSON.stringify(grades).includes('\"score\":1'));
  const response=await (await call('attempt',undefined,actors.student)).json();assert.equal(response.attempt.rawScore,null);assert.equal(response.attempt.answers[0].pointsAwarded,null);assert.equal('passwordHash' in response.attempt.form,false);
 });
 await check('late answers are rejected and timeout submission grades only saved answers',async()=>{
  await call('settings',{maxAttempts:2});
  const start=await (await call('start',{password:'room-secret'},actors.student)).json();params.attemptId=start.attemptId;
  await driver.db.formAttempt.update({where:{id:params.attemptId},data:{deadlineAt:new Date(Date.now()-1000)}});
  assert.equal((await call('answer',{questionId:params.questionId,answerOptions:['opt_1']},actors.student)).status,403);
  assert.equal((await call('submit',{},actors.student)).status,200);
  assert.equal((await driver.db.formAttempt.findUniqueOrThrow({where:{id:params.attemptId}})).status,'TIMED_OUT');
 });
 await check('LATEST and AVERAGE retention are deterministic in gradebook point units',async()=>{
  await call('settings',{scoreToKeep:'LATEST'});await driver.syncAttemptScoreToGradebook({formId:future,userId:'student',attemptId:params.attemptId,earnedScore:0,totalPoints:1});
  const form=await driver.db.form.findUniqueOrThrow({where:{id:future}});const where={syllabusItemId_studentId:{syllabusItemId:form.syllabusItemId,studentId:'student'}};
  assert.equal((await driver.db.studentSubmission.findUniqueOrThrow({where})).grade,0);
  await call('settings',{scoreToKeep:'AVERAGE'});assert.equal((await driver.db.studentSubmission.findUniqueOrThrow({where})).grade,0.5);await driver.syncAttemptScoreToGradebook({formId:future,userId:'student',attemptId:params.attemptId,earnedScore:0,totalPoints:1});assert.equal((await driver.db.studentSubmission.findUniqueOrThrow({where})).grade,0.5);
 });
 await check('closing a form blocks new attempts and cross-form authoring references',async()=>{
  const foreign=await driver.db.formQuestion.findFirstOrThrow({where:{formId:open}});
  assert.equal((await call('question',{showIfQuestionId:foreign.id})).status,400);
  assert.equal((await call('reorder',{orderedIds:[foreign.id]})).status,409);
  assert.equal((await call('reorder',{orderedIds:[params.questionId]},actors.teacher,{formId:open})).status,400);
  await call('close');assert.equal((await call('start',{password:'room-secret'},actors.student)).status,403);
 });
 await check('conditional questions which were not shown do not reduce the submitted score',async()=>{
  const created=await (await call('create',{title:'Conditional Assessment'})).json();
  const formId=created.formId,question=await driver.db.formQuestion.findFirstOrThrow({where:{formId}});
  const response=await call('question',{questionType:'SHORT_ANSWER',prompt:'Only shown for option two',points:5,showIfQuestionId:question.id,showIfAnswer:'opt_2',config:{shortAnswer:{correctAnswers:['hidden']}}},actors.teacher,{formId});assert.equal(response.status,200);
  await call('publish',undefined,actors.teacher,{formId});
  const attempt=await (await call('start',{},actors.student,{formId})).json();
  await call('answer',{questionId:question.id,answerOptions:['opt_1']},actors.student,{formId,attemptId:attempt.attemptId});
  const submitted=await call('submit',{},actors.student,{formId,attemptId:attempt.attemptId});assert.equal(submitted.status,200);
  const result=await submitted.json();assert.equal(result.score,1);assert.equal(result.totalPoints,1);assert.equal(result.percentage,100);
 });
 await check('group-targeted forms remain hidden from other enrolled students',async()=>{
  const group=await driver.db.studentGroup.create({data:{groupName:'Restricted Group',courseId:'course'}});
  const form=await driver.db.form.findUniqueOrThrow({where:{id:open}});
  await driver.db.syllabusItem.update({where:{id:form.syllabusItemId},data:{targetGroups:{create:{groupId:group.id}}}});
  for(const name of ['list','classwork','course','studentGrades']){const response=await call(name,undefined,actors.student);assert.ok(!(await response.text()).includes('Open Assessment'),name);}
  assert.equal((await call('detail',undefined,actors.student,{formId:open})).status,404);
 });
 await check('question bank cannot read or copy another instructor course questions',async()=>{
  const response=await context.run(actors['other-teacher'],()=>driver.bankList(new Request('http://localhost:3000/api/question-bank?courseId=course')));assert.equal(response.status,403);
  const copy=await context.run(actors['other-teacher'],()=>driver.bankCopy(new Request('http://localhost:3000/api/question-bank/from-question/'+params.questionId,{method:'POST'}),{params:Promise.resolve({questionId:params.questionId})}));assert.equal(copy.status,403);
 });
 await check('datetime-local round trips preserve the instructor local time',async()=>{
  process.env.TZ='Asia/Manila';assert.equal(driver.localDateTimeValue('2027-01-02T02:30:00Z'),'2027-01-02T10:30');
  assert.equal(new Date(driver.localDateTimeValue('2027-01-02T02:30:00Z')).toISOString(),'2027-01-02T02:30:00.000Z');
 });
 await check('question edits before attempts return to draft and category changes sync Classwork',async()=>{
  const q=await driver.db.formQuestion.findFirstOrThrow({where:{formId:open}});
  assert.equal((await call('editQuestion',{prompt:'Updated draft question'},actors.teacher,{formId:open,questionId:q.id})).status,200);
  assert.equal((await driver.db.form.findUniqueOrThrow({where:{id:open}})).status,'DRAFT');
  assert.equal((await call('start',{},actors.student,{formId:open})).status,404);
  assert.equal((await call('settings',{formType:'ACTIVITY'},actors.teacher,{formId:open})).status,200);
  const item=await driver.db.syllabusItem.findFirstOrThrow({where:{form:{id:open}}});assert.equal(item.type,'ACTIVITY');
 });
 await check('publish validates an answer key and notification failure rolls back publication',async()=>{
  const created=await (await call('create',{title:'Atomic Publish Check'})).json();const formId=created.formId;
  const q=await driver.db.formQuestion.findFirstOrThrow({where:{formId}});
  await call('editQuestion',{config:{options:[{id:'a',text:'A'},{id:'b',text:'B'}]}},actors.teacher,{formId,questionId:q.id});
  assert.equal((await call('publish',undefined,actors.teacher,{formId})).status,400);
  await call('editQuestion',{config:{options:[{id:'a',text:'A',isCorrect:true},{id:'b',text:'B'}]}},actors.teacher,{formId,questionId:q.id});
  await cluster.owner.query(`CREATE FUNCTION forms_notification_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.title LIKE '%Atomic Publish Check%' THEN RAISE EXCEPTION 'Synthetic notification failure'; END IF; RETURN NEW; END $$`);
  await cluster.owner.query('CREATE TRIGGER forms_notification_failure BEFORE INSERT ON "Notification" FOR EACH ROW EXECUTE FUNCTION forms_notification_failure()');
  try {
   assert.equal((await call('publish',undefined,actors.teacher,{formId})).status,500);
   assert.equal((await driver.db.form.findUniqueOrThrow({where:{id:formId}})).status,'DRAFT');
   assert.equal(await driver.db.notification.count({where:{title:{contains:'Atomic Publish Check'}}}),0);
  } finally {await cluster.owner.query('DROP TRIGGER forms_notification_failure ON "Notification"');await cluster.owner.query('DROP FUNCTION forms_notification_failure()');}
  assert.equal((await call('publish',undefined,actors.teacher,{formId})).status,200);
 });
 await check('student start and question edit serialize without exposing changed questions to an active attempt',async()=>{
  const created=await (await call('create',{title:'Concurrent Form Check'})).json();const formId=created.formId;
  const q=await driver.db.formQuestion.findFirstOrThrow({where:{formId}});
  await call('publish',undefined,actors.teacher,{formId});
  const [start,edit]=await Promise.all([call('start',{},actors.student,{formId}),call('editQuestion',{prompt:'New question draft'},actors.teacher,{formId,questionId:q.id})]);
  const form=await driver.db.form.findUniqueOrThrow({where:{id:formId}});
  if(start.status===200){assert.equal(edit.status,409);assert.equal(form.status,'PUBLISHED');assert.equal((await driver.db.formQuestion.findUniqueOrThrow({where:{id:q.id}})).prompt,q.prompt);}
  else{assert.equal(start.status,404);assert.equal(edit.status,200);assert.equal(form.status,'DRAFT');assert.equal(await driver.db.formAttempt.count({where:{formId}}),0);}
 });
 if(process.argv.includes('--browser')){const {browserChecks}=await import('./assessment.browser.mjs');await browserChecks({cluster,output,check,driver,actors});}
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log('Evidence: '+output);
}catch(error){report.error=String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[redacted local connection]');fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));throw error;}finally{await driver?.db.$disconnect();await cluster?.stop();}
