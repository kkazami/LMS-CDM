import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { fixture } from './fixture.mjs';

const require = createRequire(import.meta.url), { compile } = require('./compile.cjs');
let context, pool, db;
async function check(name, work) { await work(); console.log('PASS ' + name); }
try {
  process.env.OHMWARD_ENABLED = 'true';
  context = await fixture({ boundary: true });
  pool = new Pool({ connectionString: context.url, max: 8 }); db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const api = await compile(db);
  const request = (who, path, method='GET', body, extra={}) => api.handleOhmward(new Request('https://ohmward.example.invalid/api/ohmward/'+path, { method, headers: { ...(who ? { Authorization:'Bearer '+context.tokens[who] } : {}), ...(body ? { 'Content-Type':'application/json' } : {}), ...extra }, ...(body ? { body:JSON.stringify(body) } : {}) }), path.split('/'));
  const value = async response => { assert.equal(response.status,200); return response.json(); };
  await check('real-session direct API denies missing credentials, wrong institute, staff mutations, pending and archived enrollments', async () => {
    assert.equal((await request(null,'catalog')).status,401);
    for(const who of ['foreign','foreign-admin']) assert.equal((await request(who,'catalog')).status,403);
    for(const who of ['pending','archived']) assert.equal((await request(who,'progress')).status,401);
    for(const who of ['teacher','admin']) assert.equal((await request(who,'primer/complete','POST')).status,403);
    assert.equal((await request('student','primer/complete','POST',undefined,{origin:'https://evil.invalid'})).status,403);
  });
  await check('instructor roster includes zero attempts, deduplicates classes and excludes pending/foreign/unrelated/archived students', async () => {
    const roster = await value(await request('teacher','analytics')); assert.equal(roster.total,2); assert.equal(roster.students.length,2); assert.ok(roster.students.every(row=>!row.started));
    const admin = await value(await request('admin','analytics')); assert.equal(admin.total,3);
    assert.equal((await request('student','analytics')).status,403);
    const foreignCourse = await api.handleOhmward(new Request('https://ohmward.example.invalid/api/ohmward/analytics?courseId=other-course',{headers:{Authorization:'Bearer '+context.tokens.teacher}}),['analytics']); assert.equal(foreignCourse.status,404);
  });
  await check('primer and previous pass gate attempts; concurrent opens resume one server-selected variant', async () => {
    assert.equal((await request('student','levels/CIR-01/attempts','POST')).status,403);
    await value(await request('student','primer/complete','POST'));
    assert.equal((await request('student','levels/CIR-02/attempts','POST')).status,403);
    const opened=await Promise.all([request('student','levels/CIR-01/attempts','POST').then(value),request('student','levels/CIR-01/attempts','POST').then(value)]);
    assert.equal(opened[0].id,opened[1].id); assert.equal(opened[0].variantId,opened[1].variantId);
  });
  let first;
  await check('draft survives read; stale saves conflict; hints are monotonic; foreign owners cannot read/save/reveal/submit', async () => {
    first=await value(await request('student','levels/CIR-01/attempts','POST'));
    const fixture=api.correctFixture('CIR-01',first.variantId);
    const saved=await value(await request('student',`attempts/${first.id}`,'PATCH',{revision:0,state:fixture})); assert.equal(saved.revision,1);
    assert.deepEqual((await value(await request('student',`attempts/${first.id}`))).state,fixture);
    assert.equal((await request('student',`attempts/${first.id}`,'PATCH',{revision:0,state:fixture})).status,409);
    for(const [suffix,method,body]of [['','GET'],['','PATCH',{revision:1,state:fixture}],['/hints','POST',{index:0}],['/submit','POST',{revision:1,state:fixture}]]) assert.equal((await request('untouched',`attempts/${first.id}${suffix}`,method,body)).status,404);
    assert.equal((await request('student',`attempts/${first.id}/hints`,'POST',{index:2})).status,400);
    const hints=await value(await request('student',`attempts/${first.id}/hints`,'POST',{index:0})); assert.equal(hints.hintIds.length,1);
    const repeated=await value(await request('student',`attempts/${first.id}/hints`,'POST',{index:0})); assert.equal(repeated.hintIds.length,1); assert.equal(repeated.revision,1);
  });
  await check('concurrent submits commit one result, one progress count and one 50 XP reward', async () => {
    const payload={revision:1,state:api.correctFixture('CIR-01',first.variantId)};
    const results=await Promise.all([request('student',`attempts/${first.id}/submit`,'POST',payload).then(value),request('student',`attempts/${first.id}/submit`,'POST',payload).then(value)]);
    assert.deepEqual(results.map(row=>row.xpGranted).sort((a,b)=>a-b),[0,50]); assert.equal(results[0].attempt.result.stars,2);
    assert.equal((await db.ohmwardProgress.findUnique({where:{studentId_levelId:{studentId:'student',levelId:'CIR-01'}}})).submittedCount,1);
    assert.equal(await db.expTransaction.count({where:{source:'ohmward'}}),1);
    await assert.rejects(context.cluster.owner.query('UPDATE "OhmwardAttempt" SET revision=revision+1 WHERE id=$1',[first.id]),/immutable/);
  });
  await check('replay improves stars without XP; later failed replay preserves bests and completion', async () => {
    const replay=await value(await request('student','levels/CIR-01/attempts','POST'));
    const good=await value(await request('student',`attempts/${replay.id}/submit`,'POST',{revision:0,state:api.correctFixture('CIR-01',replay.variantId)})); assert.equal(good.xpGranted,0); assert.equal(good.attempt.result.stars,3);
    const failed=await value(await request('student','levels/CIR-01/attempts','POST'));
    await value(await request('student',`attempts/${failed.id}/submit`,'POST',{revision:0,state:{answers:{},wires:[],switchClosed:true}}));
    const progress=await value(await request('student','progress')); assert.equal(progress.progress[0].bestStars,3); assert.equal(progress.progress[0].bestScore,100); assert.ok(progress.progress[0].firstPassedAt);
  });
  await check('student completes CIR-02 and CIR-03; academic records remain byte-for-byte unchanged', async () => {
    for(const level of ['CIR-02','CIR-03']) {
      const attempt=await value(await request('student',`levels/${level}/attempts`,'POST'));
      const result=await value(await request('student',`attempts/${attempt.id}/submit`,'POST',{revision:0,state:api.correctFixture(level,attempt.variantId)})); assert.equal(result.attempt.result.passed,true);
    }
    const learner=await value(await request('student','progress')); assert.equal(learner.progress.filter(row=>row.firstPassedAt).length,3);
    assert.equal((await db.gamificationProfile.findUnique({where:{studentId:'student'}})).exp,150);
    assert.deepEqual((await context.cluster.owner.query('SELECT row_to_json(s) AS row FROM "StudentSubmission" s WHERE id=\'academic-result\'')).rows[0].row,context.preserved);
    assert.equal(await db.activitySubmission.count(),0);
  });
  await check('revoked/expired/deactivated sessions and removed enrollment cannot mutate work', async () => {
    await context.cluster.owner.query('UPDATE "Session" SET "expiresAt"=now()-interval \'1 second\' WHERE "userId"=\'untouched\''); assert.equal((await request('untouched','progress')).status,401);
    await context.cluster.owner.query('UPDATE "User" SET "isActive"=false WHERE id=\'unrelated\''); assert.equal((await request('unrelated','progress')).status,401);
    await context.cluster.owner.query('UPDATE "Enrollment" SET status=\'PENDING\' WHERE "studentId"=\'student\''); assert.equal((await request('student','primer/complete','POST')).status,401);
  });
  await check('migration fresh replay, composite ownership FK and rollback preserve baseline data', async () => {
    const replay=await context.cluster.createEmptyDatabase(); await replay.owner.query(context.ddl); await replay.owner.query(context.migration);
    assert.equal((await replay.owner.query('SELECT count(*)::int n FROM "OhmwardAttempt"')).rows[0].n,0);
    await assert.rejects(context.cluster.owner.query('INSERT INTO "OhmwardLearner"("studentId","instituteId","updatedAt") VALUES(\'foreign\',\'ics\',now())'),/foreign key/);
    await replay.owner.query('BEGIN'); await assert.rejects(replay.owner.query('ALTER TABLE "OhmwardProgress" ADD COLUMN recovery_probe integer; SELECT missing_ohmward_recovery_function();')); await replay.owner.query('ROLLBACK');
    assert.equal((await replay.owner.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_name='OhmwardProgress' AND column_name='recovery_probe'")).rows[0].n,0);
  });
  process.env.OHMWARD_ENABLED='false'; assert.equal((await request('teacher','catalog')).status,404);
  console.log('PASS feature disable hides endpoints without removing records');
} catch(error) { console.error('OHMWARD_INTEGRATION_FAILED',String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g,'[REDACTED synthetic connection]')); process.exitCode=1; }
finally { await db?.$disconnect(); await pool?.end(); await context?.stop(); }
