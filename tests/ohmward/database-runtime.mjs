// Explicit operational test: all synthetic records live inside ONE transaction that always rolls back.
// This proves real SQL/constraints/services, not cross-connection concurrency or browser behavior.
import assert from 'node:assert/strict';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import { randomBytes,createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { configuration,poolOptions } from '../../scripts/ohmward/check-database.mjs';

const require=createRequire(import.meta.url),{build}=require(require.resolve('esbuild',{paths:[path.dirname(require.resolve('tsx'))]}));
const config=configuration();
const pool=new Pool(poolOptions(config.runtime)),db=new PrismaClient({adapter:new PrismaPg(pool)});
const prefix='ohmcheck_'+randomBytes(8).toString('hex'),rollback=Error('EXPECTED_ROLLBACK');
let passed=0;process.env.OHMWARD_ENABLED='true';
const check=async(name,work)=>{await work();passed++;console.log('PASS '+name);};
try{
  await db.$transaction(async tx=>{
    const institute=await tx.institute.findFirst({where:{code:{equals:'ics',mode:'insensitive'}},select:{id:true}});assert.ok(institute,'ICS institute required');
    const ids={teacher:prefix+'_teacher',student:prefix+'_student',zero:prefix+'_zero',other:prefix+'_other'};
    const password=await bcrypt.hash(randomBytes(32).toString('hex'),10);
    for(const [key,id]of Object.entries(ids))await tx.user.create({data:{id,name:'Ohmward rollback check',email:id+'@example.invalid',password,role:key==='teacher'?'PROFESSOR':'STUDENT',instituteId:institute.id}});
    const course=await tx.course.create({data:{id:prefix+'_course',code:prefix,courseCode:prefix,title:'Ohmward rollback-only check',instituteId:institute.id,instructorId:ids.teacher}});
    for(const id of [ids.student,ids.zero])await tx.enrollment.create({data:{courseId:course.id,studentId:id,status:'APPROVED'}});
    const tokens={};for(const [key,id]of Object.entries(ids)){const token=randomBytes(32).toString('base64url');tokens[key]=token;await tx.session.create({data:{userId:id,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000)}});}
    const gateway=new Proxy(tx,{get(target,key){if(key==='$transaction')return work=>work(target);const value=target[key];return typeof value==='function'?value.bind(target):value;}});
    globalThis.__ohmRollbackDatabase=gateway;
    const bundle=await build({stdin:{contents:`export * from './apps/web/src/features/interactive-activities/ohmward/server/http';export * from './apps/web/src/features/interactive-activities/ohmward/server/grading';export * from './apps/web/src/features/interactive-activities/ohmward/curriculum/catalog';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',tsconfig:'apps/web/tsconfig.json',plugins:[{name:'rollback-transaction',setup(builder){builder.onResolve({filter:/^@lms\/types$/},()=>({path:path.resolve('packages/types/src/index.ts'),external:false}));builder.onResolve({filter:/(^|\/)db$|^server-only$/},args=>({path:args.path,namespace:'rollback'}));builder.onLoad({filter:/.*/,namespace:'rollback'},args=>({contents:args.path==='server-only'?'':'export const db=globalThis.__ohmRollbackDatabase;'}));}}]});
    const compiled=new Module(path.resolve('apps/web/__ohmward_rollback_check.cjs'));compiled.filename=path.resolve('apps/web/__ohmward_rollback_check.cjs');compiled.paths=[path.resolve('apps/web/node_modules'),...require.resolve.paths('next')];compiled._compile(bundle.outputFiles[0].text,compiled.filename);const api=compiled.exports;
    const request=(who,route,method='GET',body,extra={})=>api.handleOhmward(new Request('https://ohmward-check.example.invalid/api/ohmward/'+route,{method,headers:{...(who?{Authorization:'Bearer '+tokens[who]}:{}),...(body?{'Content-Type':'application/json'}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})}),route.split('?')[0].split('/'));
    const value=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json();};
    const expireFixtureBucket=bucket=>tx.rateLimitBucket.updateMany({where:{key:createHash('sha256').update(`ohmward:${ids.student}:${bucket}`).digest('hex')},data:{expiresAt:new Date(0)}});
    await check('real session, enrollment, staff mutation and origin boundaries',async()=>{
      assert.equal((await request(null,'catalog')).status,401);assert.equal((await request('other','progress')).status,401);assert.equal((await request('teacher','primer/complete','POST')).status,403);assert.equal((await request('student','primer/complete','POST',undefined,{origin:'https://evil.invalid'})).status,403);assert.equal((await request('student','analytics')).status,403);
    });
    await check('zero-attempt roster and all analytics SQL execute on PostgreSQL with restricted runtime grants',async()=>{
      const data=await value(await request('teacher','analytics?courseId='+course.id));assert.equal(data.total,2);assert.equal(data.analytics.roster,2);assert.equal(data.analytics.started,0);assert.equal(data.analytics.passed,0);assert.equal(data.analytics.activity.attempts,0);
    });
    await check('server progression, real persistence, revision conflict, hints and ownership',async()=>{
      assert.equal((await request('student','levels/CIR-01/attempts','POST')).status,403);await value(await request('student','primer/complete','POST'));assert.equal((await request('student','levels/INT-01/attempts','POST')).status,403);
      const attempt=await value(await request('student','levels/CIR-01/attempts','POST'));const state=api.correctFixture('CIR-01',attempt.variantId);
      const saved=await value(await request('student','attempts/'+attempt.id,'PATCH',{revision:0,state}));assert.equal(saved.revision,1);assert.deepEqual((await value(await request('student','attempts/'+attempt.id))).state,state);
      assert.equal((await request('student','attempts/'+attempt.id,'PATCH',{revision:0,state})).status,409);assert.equal((await request('zero','attempts/'+attempt.id)).status,404);await value(await request('student','attempts/'+attempt.id+'/hints','POST',{index:0}));
    });
    await check('all thirty levels grade, finalize, unlock and award exactly 1500 XP',async()=>{
      // Accelerated learning explicitly expires only this uncommitted synthetic student's buckets.
      // No real rate-limit policy, clock, learner record or account is changed.
      for(const level of api.LEVELS){await expireFixtureBucket('start');await expireFixtureBucket('submit');const attempt=await value(await request('student','levels/'+level.id+'/attempts','POST'));const state=api.correctFixture(level.id,attempt.variantId);const result=await value(await request('student','attempts/'+attempt.id+'/submit','POST',{revision:attempt.revision,state}));assert.equal(result.attempt.result.passed,true,level.id);assert.equal(result.xpGranted,50,level.id);const duplicate=await value(await request('student','attempts/'+attempt.id+'/submit','POST',{revision:attempt.revision,state}));assert.equal(duplicate.xpGranted,0);}
      const profile=await tx.gamificationProfile.findUniqueOrThrow({where:{studentId:ids.student}});assert.equal(profile.exp,1500);assert.equal(await tx.expTransaction.count({where:{userId:ids.student,source:'ohmward'}}),30);
      const progress=await value(await request('student','progress'));assert.equal(progress.progress.filter(p=>p.firstPassedAt).length,30);assert.equal(await tx.studentSubmission.count({where:{studentId:ids.student}}),0);
    });
    await check('lifetime analytics include zero students, full completion and submitted criterion evidence',async()=>{
      const data=await value(await request('teacher','analytics?courseId='+course.id));assert.equal(data.analytics.roster,2);assert.equal(data.analytics.completed,1);assert.equal(data.analytics.completionPercent,50);assert.equal(data.analytics.activity.attempts,30);assert.ok(data.analytics.concepts.length>0);assert.equal(data.analytics.trend.at(-1).passed,30);
      const detail=await value(await request('teacher','students/'+ids.student));assert.equal(detail.total,30);
    });
    await check('earned sandbox saves restore and reject stale revision without rewards',async()=>{
      const sandbox=await value(await request('student','sandbox')),state=api.correctFixture('INT-06','a');await value(await request('student','sandbox','PATCH',{revision:sandbox.revision,state}));assert.deepEqual((await value(await request('student','sandbox'))).state,state);assert.equal((await request('student','sandbox','PATCH',{revision:sandbox.revision,state})).status,409);assert.equal(await tx.expTransaction.count({where:{userId:ids.student,source:'ohmward'}}),30);
    });
    throw rollback;
  },{timeout:180000,maxWait:10000}).catch(error=>{if(error!==rollback)throw error;});
  assert.equal(await db.user.count({where:{id:{startsWith:prefix}}}),0);console.log(`PASS rollback removed every synthetic identity and dependent record; ${passed} operational checks passed`);
}catch(error){let message=error.message??'';for(const value of [config.runtime,decodeURIComponent(new URL(config.runtime).password)].filter(Boolean))message=message.split(value).join('[redacted]');console.error('ROLLBACK_DATABASE_CHECK_FAILED',error.code||error.name,message);process.exitCode=1;}
finally{delete globalThis.__ohmRollbackDatabase;await db.$disconnect();await pool.end();}
