import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function instructorMembershipChecks({ cluster, db, accounts, check }) {
  const api = await import('../../apps/web/src/app/api/programs/[programId]/instructors/route.ts');
  const programs = await import('../../apps/web/src/lib/academic-structure/programs.ts');
  const context = id => ({ params: Promise.resolve({ programId: id }) });
  const request = (who, method = 'GET', body, origin) => new Request('http://localhost/api/programs/bsit/instructors', {
    method, headers: { ...(who ? { Authorization: 'Bearer ' + accounts[who].token } : {}), 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  await check('program-head instructor setup replays without altering existing academic data', async () => {
    const snapshot = async () => (await cluster.owner.query(`SELECT (SELECT md5(coalesce(string_agg(row_to_json(c)::text,'' ORDER BY id),'')) FROM public."Course" c) AS courses,(SELECT md5(coalesce(string_agg(row_to_json(m)::text,'' ORDER BY "programId","userId"),'')) FROM public."ProgramMembership" m) AS memberships,(SELECT count(*)::int FROM public."ProgramHeadAssignment") AS heads`)).rows[0];
    const before = await snapshot();
    await cluster.owner.query(fs.readFileSync('prisma/super-user-v1/program-head-instructors.sql', 'utf8'));
    assert.deepEqual(await snapshot(), before);
  });
  for (const id of ['candidate', 'reactivate']) await cluster.owner.query('INSERT INTO public."User" (id,name,email,password,role,"instituteId") VALUES ($1,$2,$3,\'UNUSABLE_SYNTHETIC_HASH\',\'PROFESSOR\',\'ics\')', [id, 'Available ' + id, id + '@example.invalid']);
  await check('direct instructor directory and membership APIs require the current scoped Program Head', async () => {
    assert.equal((await api.GET(request(null), context('bsit'))).status, 401);
    for (const who of ['student','admin','faculty']) assert.equal((await api.GET(request(who), context('bsit'))).status, 403);
    assert.equal((await api.GET(request('head'), context('foreign-program'))).status, 404);
    const directory = await api.GET(request('head'), context('bsit'));
    assert.equal(directory.status, 200);
    const body = await directory.json();
    assert.ok(body.instructors.some(i => i.id === 'candidate'));
    assert.ok(body.instructors.every(i => !['head','faculty','foreign','student','admin'].includes(i.id)));
    const version = (await db.academicProgram.findUnique({ where: { id: 'bsit' } })).chartVersion;
    const input = { instructorId: 'candidate', version };
    assert.equal((await api.POST(request('head','POST',input,'https://malicious.invalid'),context('bsit'))).status,403);
    assert.equal((await api.POST(request('head','POST',{...input,designation:'PROGRAM_HEAD'}),context('bsit'))).status,400);
    assert.equal((await api.POST(request('faculty','POST',input),context('bsit'))).status,403);
    for (const instructorId of ['foreign','student','admin']) assert.equal((await api.POST(request('head','POST',{...input,instructorId}),context('bsit'))).status,403);
    assert.equal((await api.POST(request('head','POST',{...input,version:version+1}),context('bsit'))).status,409);
    await cluster.owner.query('UPDATE public."User" SET "isActive"=false WHERE id=\'candidate\'');
    try {
      assert.equal((await api.POST(request('head','POST',input),context('bsit'))).status,403);
      assert.ok(!(await (await api.GET(request('head'),context('bsit'))).json()).instructors.some(i=>i.id==='candidate'));
    } finally {await cluster.owner.query('UPDATE public."User" SET "isActive"=true WHERE id=\'candidate\'');}
    const beforeCourses = await db.course.findMany({ orderBy: { id: 'asc' } });
    const beforeEnrollments = await db.enrollment.findMany({ orderBy: { id: 'asc' } });
    const response = await api.POST(request('head','POST',input),context('bsit'));
    assert.equal(response.status,201);
    assert.equal((await response.json()).version,version+1);
    assert.ok((await programs.readChart(accounts.head.actor,'bsit')).members.some(m => m.id==='candidate' && !m.isHead));
    assert.equal((await db.user.findUnique({where:{id:'candidate'}})).role,'PROFESSOR');
    assert.equal(await db.programHeadAssignment.count({where:{userId:'candidate'}}),0);
    assert.deepEqual(await db.course.findMany({ orderBy: { id: 'asc' } }),beforeCourses);
    assert.deepEqual(await db.enrollment.findMany({ orderBy: { id: 'asc' } }),beforeEnrollments);
    assert.equal((await api.POST(request('head','POST',{...input,version:version+1}),context('bsit'))).status,409);
    await cluster.owner.query('DELETE FROM public."ProgramMembership" WHERE "programId"=\'bsit\' AND "userId"=\'candidate\'');
  });
  await check('membership writes roll back on audit failure and reject revoked heads at database level', async () => {
    const version = (await db.academicProgram.findUnique({where:{id:'bsit'}})).chartVersion;
    await cluster.owner.query(`CREATE FUNCTION public.reject_member_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='PROGRAM_INSTRUCTOR_ADDED' THEN RAISE EXCEPTION 'SYNTHETIC_AUDIT_FAILURE'; END IF; RETURN NEW; END $$; CREATE TRIGGER reject_member_audit BEFORE INSERT ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION public.reject_member_audit()`);
    try {
      assert.equal((await api.POST(request('head','POST',{instructorId:'candidate',version}),context('bsit'))).status,503);
      assert.equal(await db.programMembership.count({where:{programId:'bsit',userId:'candidate'}}),0);
      assert.equal((await db.academicProgram.findUnique({where:{id:'bsit'}})).chartVersion,version);
    } finally {await cluster.owner.query('DROP TRIGGER reject_member_audit ON public."AuditLog"; DROP FUNCTION public.reject_member_audit()');}
    const app=await cluster.connect();
    try {
      await cluster.owner.query('UPDATE public."ProgramHeadAssignment" SET "isActive"=false WHERE "programId"=\'bsit\' AND "userId"=\'head\'');
      await assert.rejects(()=>app.query('SELECT super_user_security.add_program_instructor($1,$2,$3,$4,$5)',[accounts.head.actor.sessionId,accounts.head.actor.tokenHash,'bsit','candidate',version]),e=>e.code==='42501');
    } finally {await app.end();await cluster.owner.query('UPDATE public."ProgramHeadAssignment" SET "isActive"=true WHERE "programId"=\'bsit\' AND "userId"=\'head\'');}
    await cluster.owner.query('INSERT INTO public."ProgramMembership"("programId","userId","instituteId",kind,"isActive") VALUES(\'bsit\',\'reactivate\',\'ics\',\'INSTRUCTOR\',false)');
    assert.equal((await api.POST(request('head','POST',{instructorId:'reactivate',version}),context('bsit'))).status,201);
    assert.equal((await db.programMembership.findUnique({where:{programId_userId:{programId:'bsit',userId:'reactivate'}}})).isActive,true);
    await cluster.owner.query('DELETE FROM public."ProgramMembership" WHERE "programId"=\'bsit\' AND "userId"=\'reactivate\'');
  });
}

export async function instructorMembershipBrowserChecks({ pageFor, base, db, cluster, check, output }) {
  await check('Program Head adds an instructor from the main chart and sidebar order follows Archived Classes',async()=>{
    const page=await pageFor('head');
    await page.goto(base+'/ics/organization');
    const sidebar=page.locator('aside').first();
    const labels=await sidebar.getByRole('link').allTextContents();
    assert.equal(labels.findIndex(label=>label.includes('Organizational Chart')),labels.findIndex(label=>label.includes('Archived Classes'))+1);
    await page.getByRole('button',{name:'Add instructor',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Add instructor to bsit',exact:true});
    await dialog.getByRole('textbox',{name:'Search instructors',exact:true}).fill('Available candidate');
    await dialog.getByRole('radio',{name:'Available candidate',exact:true}).check();
    await page.screenshot({path:path.join(output,'add-program-instructor-desktop.png')});
    await page.setViewportSize({width:390,height:844});
    await dialog.getByRole('button',{name:'Add instructor',exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output,'add-program-instructor-mobile.png')});
    await dialog.getByRole('button',{name:'Add instructor',exact:true}).click();
    await dialog.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'View classes for Available candidate',exact:true}).waitFor();
    await page.reload();
    await page.getByRole('button',{name:'View classes for Available candidate',exact:true}).waitFor();
    assert.equal(await db.programHeadAssignment.count({where:{userId:'candidate'}}),0);
    await page.context().close();
    const faculty=await pageFor('faculty');
    await faculty.goto(base+'/ics/organization');
    await faculty.getByRole('heading',{name:'Organizational Chart',exact:true}).waitFor();
    assert.equal(await faculty.getByRole('button',{name:'Add instructor',exact:true}).count(),0);
    await faculty.context().close();
    await cluster.owner.query('DELETE FROM public."ProgramMembership" WHERE "programId"=\'bsit\' AND "userId"=\'candidate\'');
  });
}
