// Owned loopback PostgreSQL only. Never load a configured application database.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';
import net from 'node:net';
import { chromium } from 'playwright';
import os from 'node:os';
import { createDisposablePostgres } from './postgres-fixture.mjs';
import { provisionProgramHeads } from '../../scripts/provision-program-heads.mjs';
import { hash } from 'bcryptjs';
import { Client } from 'pg';
import { instructorMembershipChecks, instructorMembershipBrowserChecks } from './instructor-membership-checks.mjs';
import { classProgramChecks, classProgramBrowserChecks } from './class-program-checks.mjs';
import { administratorChecks, administratorBrowserChecks } from './administrator-checks.mjs';
import { installSuperUserBoundary } from '../../scripts/install-super-user-boundary.mjs';
import { performanceChecks, performanceBrowserChecks } from './performance-checks.mjs';

const output = path.resolve('tmp/program-head-integration', `feature-${Date.now()}`);
fs.mkdirSync(output, { recursive: true });
const report = { startedAt: new Date().toISOString(), sharedDatabase: false, OSIsolation: false, checks: [] };
const system = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i;
const safeEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) => system.test(key)));
const disconnected = 'postgresql://unused@127.0.0.1:1/harness_main_integration_unconnected';
const pnpm = path.join(process.env.APPDATA, 'npm/node_modules/pnpm/bin/pnpm.cjs');
const requireWeb = createRequire(path.resolve('apps/web/package.json'));
let cluster, db, browser, server, serverClose, metadataFile;
let serverLog = '';
async function check(name, work) {
  try { await work(); report.checks.push({ name, result: 'PASS' }); console.log('PASS ' + name); }
  catch (error) { report.checks.push({ name, result: 'FAIL', message: error.message }); throw error; }
}
async function deny(work, status) { await assert.rejects(work, error => error.status === status); }
try {
  const args = [pnpm, 'exec', 'prisma', 'migrate', 'diff', '--from-empty', '--to-schema', 'prisma/schema.prisma', '--script'];
  const ddl = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env: { ...safeEnvironment, DATABASE_URL: disconnected, POSTGRES_URL: disconnected, POSTGRES_PRISMA_URL: disconnected }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => stdout += chunk); child.stderr.on('data', chunk => stderr += chunk);
    child.on('error', reject);
    child.on('close', (code, signal) => { report.schemaCommand = { command: 'pnpm ' + args.slice(1).join(' '), code, signal, stderr }; code === 0 ? resolve(stdout) : reject(new Error('Offline schema generation failed.')); });
  });
  fs.writeFileSync(path.join(output, 'current-schema.sql'), ddl);
  cluster = await createDisposablePostgres();
  report.target = { database: cluster.database, port: cluster.port, host: '127.0.0.1', provenance: path.relative(process.cwd(), cluster.artifactDirectory) };
  await cluster.owner.query(ddl);
  const sql = fs.readFileSync('prisma/program-head-chart/approved-existing-target-update.sql', 'utf8');
  const guards = sql.slice(sql.indexOf('-- Assignments are administrative input')).replace(/COMMIT;\s*$/, '');
  assert.ok(guards.startsWith('-- Assignments are administrative input'));
  await cluster.owner.query(guards);
  await cluster.owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO bqual_test_app');
  for (const code of ['ics', 'ibe']) await cluster.owner.query('INSERT INTO public."Institute" (id,code,name) VALUES ($1,$1,$2)', [code, 'Synthetic ' + code]);
  const accounts = {};
  for (const [id, institute, role] of [['head','ics','PROFESSOR'],['faculty','ics','PROFESSOR'],['student','ics','STUDENT'],['foreign','ibe','PROFESSOR'],['unknown','ics','UNKNOWN'],['admin','ics','ADMIN'],['otheradmin','ibe','ADMIN']]) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const passwordHash=id==='admin'?await hash('Synthetic-Admin-Only-12345',10):'UNUSABLE_SYNTHETIC_HASH';
    await cluster.owner.query('INSERT INTO public."User" (id,name,email,password,role,"instituteId") VALUES ($1,$2,$3,$4,$5,$6)', [id,'Synthetic '+id,id+'@example.invalid',passwordHash,role,institute]);
    await cluster.owner.query('INSERT INTO public."Session" (id,"tokenHash","userId","expiresAt") VALUES ($1,$2,$3,CURRENT_TIMESTAMP+interval \'1 hour\')', ['session-'+id,tokenHash,id]);
    accounts[id] = { token, passwordHash, actor: { id, instituteId: institute, instituteCode: institute, sessionId: 'session-'+id, tokenHash, role: role === 'STUDENT' ? 'STUDENT' : 'INSTRUCTOR' } };
  }
  await cluster.owner.query("SELECT set_config('lms.assignment_actor_id','head',false)");
  for (const [id, institute] of [['bsit','ics'],['other','ics'],['foreign-program','ibe']]) await cluster.owner.query('INSERT INTO public."AcademicProgram" (id,"instituteId",code,name) VALUES ($1,$2,$1,$3)',[id,institute,'Synthetic '+id]);
  for (const [program, id, institute] of [['bsit','head','ics'],['bsit','faculty','ics'],['foreign-program','foreign','ibe']]) await cluster.owner.query('INSERT INTO public."ProgramMembership" ("programId","userId","instituteId",kind) VALUES ($1,$2,$3,\'INSTRUCTOR\')',[program,id,institute]);
  await cluster.owner.query('INSERT INTO public."ProgramHeadAssignment" ("programId","userId") VALUES (\'bsit\',\'head\')');
  await cluster.owner.query('INSERT INTO public."ProgramChartNode" (id,"programId",kind,label) VALUES (\'bsit-root\',\'bsit\',\'ROOT\',\'BSIT faculty\')');
  for (const [id, program] of [['program-class','bsit'],['unrelated-class','other']]) await cluster.owner.query('INSERT INTO public."Course" (id,code,"courseCode",title,"instructorId","instituteId","programId") VALUES ($1,$1,$2,$3,\'faculty\',\'ics\',$4)',[id,'SECRET-'+id,'Synthetic '+id,program]);
  await cluster.owner.query('INSERT INTO public."Course" (id,code,"courseCode",title,"instructorId","instituteId","programId") VALUES (\'foreign-course\',\'FOREIGN\',\'SECRET-FOREIGN\',\'Foreign private class\',\'foreign\',\'ibe\',\'foreign-program\')');
  await cluster.owner.query('INSERT INTO public."Announcement" (id,"courseId","authorId",content) VALUES (\'meet\',\'program-class\',\'faculty\',\'Observe https://meet.google.com/abc-defg-hij\')');
  await cluster.owner.query('INSERT INTO public."CalendarEvent" (id,title,"eventDate","endDate","creatorId","instituteId","updatedAt") VALUES (\'existing-calendar\',\'Existing calendar event\',\'2026-10-18 01:00\',\'2026-10-18 02:00\',\'head\',\'ics\',CURRENT_TIMESTAMP)');
  const calendarBefore = (await cluster.owner.query('SELECT row_to_json(c) AS row FROM public."CalendarEvent" c ORDER BY id')).rows;
  for (const key of Object.keys(process.env)) if (/^(PG|DATABASE_URL|POSTGRES|SUPER_USER|HARNESS|SMTP)/i.test(key)) delete process.env[key];
  process.env.DATABASE_URL = cluster.url;
  process.env.NODE_ENV = 'test';
  process.env.TSX_TSCONFIG_PATH = path.resolve('apps/web/tsconfig.json');
  globalThis.AsyncLocalStorage = AsyncLocalStorage;
  await import('tsx');
  ({ db } = await import('../../apps/web/src/lib/db.ts'));
  const programs = await import('../../apps/web/src/lib/academic-structure/programs.ts');
  const chartApi = await import('../../apps/web/src/app/api/programs/[programId]/chart/route.ts');
  const courseApi = await import('../../apps/web/src/app/api/programs/[programId]/courses/[courseId]/route.ts');
  const request = (id, method = 'GET', body, origin) => new Request('http://localhost/api/programs/bsit/chart', { method, headers: { ...(id ? { Authorization: 'Bearer '+accounts[id].token } : {}), ...(origin ? { Origin: origin } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const context = { params: Promise.resolve({ programId: 'bsit' }) };
  const head = accounts.head.actor;
  await check('operator setup requires a real ICS Admin and preserves unrelated Calendar data',async()=>{
    const setup={administratorEmail:'head@example.invalid',requestReference:'SYNTHETIC_LOCAL_ONLY_NOT_APPROVAL',accounts:[{programCode:'BSCPE',email:'new-head@example.invalid',passwordHash:await hash('Synthetic-Local-Only-457',10)}]};
    await assert.rejects(()=>provisionProgramHeads(cluster.owner,setup),/Active ICS administrator/);
    assert.equal((await cluster.owner.query('SELECT count(*)::int n FROM public."User" WHERE email=\'new-head@example.invalid\'')).rows[0].n,0);
    const result=await provisionProgramHeads(cluster.owner,{...setup,administratorEmail:'admin@example.invalid'});
    assert.equal(result.commitAcknowledged,true);assert.equal(result.accounts[0].role,'PROFESSOR');
    const row=(await cluster.owner.query('SELECT role,permissions,"instituteId" FROM public."User" WHERE email=\'new-head@example.invalid\'')).rows[0];
    assert.deepEqual(row,{role:'PROFESSOR',permissions:'[]',instituteId:'ics'});
    await assert.rejects(()=>provisionProgramHeads(cluster.owner,{...setup,administratorEmail:'admin@example.invalid'}),/already exists/);
  });
  await check('chart uses persisted memberships and ICS-only scope', async () => {
    assert.deepEqual((await programs.organizationPrograms(head)).map(p=>p.id), ['bsit']);
    const chart = await programs.readChart(head, 'bsit');
    assert.equal(chart.isHead,true); assert.equal(chart.members.length,2);
    assert.equal(chart.members.find(m=>m.id==='faculty').classCount,1);
    await deny(()=>programs.organizationPrograms(accounts.foreign.actor),403);
  });
  await check('real chart handler authenticates and rejects unknown/admin/student roles', async () => {
    assert.equal((await chartApi.GET(request(null),context)).status,401);
    for (const id of ['unknown','admin','student','foreign']) assert.equal((await chartApi.GET(request(id),context)).status,id==='admin'?401:403,id);
    const response = await chartApi.GET(request('head'),context);
    assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'private, no-store');
  });
  const placement = { operation:'CREATE',version:1,parentId:'bsit-root',kind:'GROUP',label:'Teaching team',memberUserId:null,position:0 };
  await check('head-only chart edit, stale version, origin and protected root', async () => {
    assert.equal((await chartApi.PATCH(request('faculty','PATCH',placement),context)).status,403);
    assert.equal((await chartApi.PATCH(request('head','PATCH',placement,'https://foreign.invalid'),context)).status,403);
    assert.equal((await chartApi.PATCH(request('head','PATCH',placement),context)).status,200);
    assert.equal((await chartApi.PATCH(request('head','PATCH',placement),context)).status,409);
    await deny(()=>programs.changeChart(head,'bsit',{operation:'DELETE',version:2,id:'bsit-root',confirm:true}),403);
  });
  await check('class list and Stream/Meet are read-only and program-scoped', async () => {
    const classes = await programs.programInstructorClasses(head,'bsit','faculty');
    assert.deepEqual(classes.courses.map(c=>c.id),['program-class']);
    const response = await courseApi.GET(request('head'),{params:Promise.resolve({programId:'bsit',courseId:'program-class'})});
    assert.equal(response.status,200);
    const body = await response.json();
    assert.deepEqual(body.stream[0].meetingLinks,['https://meet.google.com/abc-defg-hij']);
    assert.ok(!JSON.stringify(body).includes('SECRET-'));
    await deny(()=>programs.readOversight(head,'bsit','unrelated-class'),404);
    await deny(()=>programs.readOversight(accounts.faculty.actor,'bsit','program-class'),403);
  });
  await check('audit failure rolls back chart and version atomically', async () => {
    await cluster.owner.query('REVOKE INSERT ON public."AuditLog" FROM bqual_test_app');
    try { await assert.rejects(()=>programs.changeChart(head,'bsit',{...placement,version:2,label:'MUST ROLL BACK'})); }
    finally { await cluster.owner.query('GRANT INSERT ON public."AuditLog" TO bqual_test_app'); }
    assert.equal((await cluster.owner.query('SELECT count(*)::int AS n FROM public."ProgramChartNode" WHERE label=\'MUST ROLL BACK\'')).rows[0].n,0);
    assert.equal((await cluster.owner.query('SELECT "chartVersion" FROM public."AcademicProgram" WHERE id=\'bsit\'')).rows[0].chartVersion,2);
  });
  await check('current designation and account status are revalidated', async () => {
    await cluster.owner.query('UPDATE public."ProgramHeadAssignment" SET "isActive"=false,"revokedAt"=CURRENT_TIMESTAMP WHERE "userId"=\'head\'');
    await deny(()=>programs.readOversight(head,'bsit','program-class'),403);
    await cluster.owner.query('UPDATE public."ProgramHeadAssignment" SET "isActive"=true,"revokedAt"=NULL WHERE "userId"=\'head\'');
    await cluster.owner.query('UPDATE public."User" SET "isActive"=false WHERE id=\'head\'');
    await deny(()=>programs.readChart(head,'bsit'),401);
    await cluster.owner.query('UPDATE public."User" SET "isActive"=true WHERE id=\'head\'');
  });
  await check('database rejects application-minted program authority', async () => {
    const app = await cluster.connect();
    await assert.rejects(()=>app.query('UPDATE public."ProgramHeadAssignment" SET "isActive"=false WHERE "userId"=\'head\''),e=>e.code==='42501');
    await assert.rejects(()=>app.query('UPDATE public."Course" SET "programId"=\'bsit\' WHERE id=\'unrelated-class\''),e=>e.code==='42501');
  });
  await check('existing Calendar data and timestamp semantics remain intact', async () => {
    assert.deepEqual((await cluster.owner.query('SELECT row_to_json(c) AS row FROM public."CalendarEvent" c ORDER BY id')).rows,calendarBefore);
    assert.equal((await cluster.owner.query("SELECT data_type FROM information_schema.columns WHERE table_name='CalendarEvent' AND column_name='endDate'")).rows[0].data_type,'timestamp without time zone');
  });
  await check('restricted local writer qualifies only with actual guards and bindings',async()=>{
    const {applicationWriterQualified}=await import('../../apps/web/src/lib/super-user-v1/provisioning.ts');
    assert.equal(await applicationWriterQualified(db),false);
    // Match the shared target's owner/CREATEROLE capability only inside this
    // owned fixture; application and operator roles stay restricted.
    const bootstrap=await cluster.connect('bqual_bootstrap_admin');
    await bootstrap.query('ALTER ROLE bqual_schema_owner CREATEROLE');
    const runtimePassword=randomBytes(32).toString('base64url'),operatorPassword=randomBytes(32).toString('base64url');
    const installOptions={runtimePrincipal:'lms_local_runtime',operatorPrincipal:'lms_local_operator',runtimePassword,operatorPassword,qualificationReference:'SYNTHETIC_OWNED_REHEARSAL_NOT_APPROVAL'};
    await cluster.owner.query('INSERT INTO public."User" (id,name,email,password,role,"isActive","instituteId") VALUES (\'preexisting-privileged\',\'Synthetic\',\'old-privileged@example.invalid\',\'UNUSABLE\',\'SUPER_USER\',false,\'ics\')');
    await assert.rejects(()=>installSuperUserBoundary(cluster.owner,installOptions),/Existing privileged accounts/);
    assert.equal((await cluster.owner.query("SELECT to_regnamespace('super_user_security') IS NULL absent")).rows[0].absent,true);
    await cluster.owner.query('DELETE FROM public."User" WHERE id=\'preexisting-privileged\'');
    report.boundaryInstallation=await installSuperUserBoundary(cluster.owner,installOptions);
    const successor=fs.readFileSync('prisma/super-user-v1/administrator-consolidation.sql','utf8');
    await cluster.owner.query(successor);
    report.administratorSuccessorSHA256=createHash('sha256').update(successor).digest('hex');
    const url=new URL(cluster.url);url.username='lms_local_runtime';url.password=runtimePassword;
    const runtime=new Client({connectionString:url.href});await runtime.connect();
    try {
      assert.equal((await runtime.query('SELECT super_user_security.application_boundary_qualified() qualified')).rows[0].qualified,true);
      await assert.rejects(()=>runtime.query('CREATE TABLE public.must_not_create(id int)'),e=>e.code==='42501');
      await assert.rejects(()=>runtime.query('UPDATE super_user_security.writer_bindings SET enabled=false'),e=>e.code==='42501');
      await assert.rejects(()=>runtime.query('UPDATE public."User" SET "credentialProvisioningState"=\'COMPLETE\' WHERE id=\'head\''),e=>e.code==='42501');
    } finally {await runtime.end();}
    await cluster.owner.query('GRANT USAGE ON SCHEMA super_user_security TO bqual_test_app,bqual_test_operator');
    await cluster.owner.query('GRANT EXECUTE ON FUNCTION super_user_security.application_boundary_qualified(),super_user_security.set_ics_faculty(text,text,text,text,text,integer),super_user_security.set_course_program(text,text,text,text),super_user_security.add_program_instructor(text,text,text,text,integer) TO bqual_test_app');
    await cluster.owner.query("INSERT INTO super_user_security.writer_bindings (principal,kind,enabled,qualification_reference) VALUES ('bqual_test_app','APPLICATION',true,'SYNTHETIC_OWNED_LOCAL_ONLY'),('bqual_test_operator','OPERATOR',true,'SYNTHETIC_OWNED_LOCAL_ONLY')");
    for(const signature of ['bootstrap_super_user(text,text,text,text,text,text,text,text)','complete_handoff(text,text,text,text,text,text,text)','activate_new_bootstrap(text,text,text,text,text,text)'])await cluster.owner.query(`GRANT EXECUTE ON FUNCTION super_user_security.${signature} TO bqual_test_operator`);
    assert.equal(await applicationWriterQualified(db),true);
    const operator=await cluster.connect('bqual_test_operator');
    const initial=await hash(randomBytes(24).toString('base64url'),10),completed=await hash('Synthetic-Super-Only-12345',10),receipt=createHash('sha256').update('SYNTHETIC_LOCAL_NOT_HUMAN_APPROVAL').digest('hex');
    const id=(await operator.query('SELECT super_user_security.bootstrap_super_user($1,$2,$3,$4,$5,$6,$7,$8) id',['cdm_super_user_01','Synthetic Super','synthetic-super@example.invalid','ics',initial,'synthetic_creation_001',receipt,'SYNTHETIC_LOCAL_NOT_HUMAN_APPROVAL'])).rows[0].id;
    await operator.query('SELECT super_user_security.complete_handoff($1,$2,$3,$4,$5,$6,$7)',[id,'ics',initial,completed,'synthetic_handoff_001',receipt,'SYNTHETIC_LOCAL_NOT_HUMAN_APPROVAL']);
    await operator.query('SELECT super_user_security.activate_new_bootstrap($1,$2,$3,$4,$5,$6)',[id,'ics','synthetic_creation_001','synthetic_activation_001',receipt,'SYNTHETIC_LOCAL_NOT_HUMAN_APPROVAL']);
    accounts.super={id};
  });
  await performanceChecks({cluster,db,accounts,check,report});
  await administratorChecks({cluster,db,accounts,check});
  await classProgramChecks({cluster,db,accounts,check});
  await instructorMembershipChecks({cluster,db,accounts,check});
  const {metadataDigest}=await import('../../apps/web/src/lib/super-user-v1/metadata-policy.ts');
  const {displayCourseCode}=await import('../../apps/web/src/lib/super-user-v1/dto.ts');
  await cluster.owner.query('UPDATE public."Course" SET code="courseCode" WHERE id=\'unrelated-class\'');
  const institute=await db.institute.findUnique({where:{id:'ics'},select:{id:true,code:true,name:true}});
  const selectedCourses=await db.course.findMany({where:{instituteId:'ics',isArchived:false},select:{id:true,code:true,courseCode:true,title:true,section:true,subject:true,room:true,instructor:{select:{id:true,name:true,role:true,instituteId:true}}},orderBy:{id:'asc'}});
  const courses=selectedCourses.map(({courseCode,...course})=>({...course,code:displayCourseCode({...course,courseCode})}));
  const dataset={institute,courses,schedule:[],materials:[],announcements:[]};
  const metadataBytes=Buffer.from(JSON.stringify({version:1,instituteId:'ics',datasetSHA256:metadataDigest(dataset),approverBinding:'SYNTHETIC_TEST_NOT_A_PERSON',maintainerBinding:'SYNTHETIC_TEST_NOT_A_PERSON',approvalReference:'SYNTHETIC_ONLY_NOT_APPROVAL',expiresAt:new Date(Date.now()+3600000).toISOString(),revoked:false}));
  metadataFile=path.join(os.tmpdir(),'lms-main-integration-'+randomBytes(12).toString('hex')+'.json');fs.writeFileSync(metadataFile,metadataBytes,{flag:'wx'});
  if (process.argv.includes('--no-browser')) {
    report.browser = 'NOT_EXECUTED';
  } else {
  const port = await new Promise(resolve => { const listener = net.createServer(); listener.listen(0,'127.0.0.1',()=>{ const selected = listener.address().port; listener.close(()=>resolve(selected)); }); });
  const base = `http://127.0.0.1:${port}`;
  const argv = [requireWeb.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)];
  server = spawn(process.execPath,argv,{cwd:path.resolve('apps/web'),env:{...safeEnvironment,NODE_ENV:'production',DATABASE_URL:cluster.url,POSTGRES_URL:cluster.url,POSTGRES_PRISMA_URL:cluster.url,NEXT_TELEMETRY_DISABLED:'1',SUPER_USER_METADATA_POLICY_PATH:metadataFile,SUPER_USER_METADATA_POLICY_SHA256:createHash('sha256').update(metadataBytes).digest('hex')},windowsHide:true,stdio:['ignore','pipe','pipe']});
  let closed = false;
  serverClose = new Promise((resolve,reject)=>{server.on('error',reject);server.on('close',(code,signal)=>{closed=true;resolve({code,signal});});});
  server.stdout.on('data',b=>serverLog+=b); server.stderr.on('data',b=>serverLog+=b);
  const deadline = Date.now()+45000;
  let ready = false;
  while(Date.now()<deadline&&!closed) { try { if((await fetch(base+'/api/health')).ok) {ready=true;break;} } catch {} await new Promise(r=>setTimeout(r,250)); }
  assert.equal(ready,true,'Owned Next server starts.');
  report.server = {argv,pid:server.pid,base,buildId:fs.readFileSync('apps/web/.next/BUILD_ID','utf8')};
  browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const errors = [];
  async function pageFor(id) {
    const context = await browser.newContext({viewport:{width:1366,height:900}});
    await context.route('**/*',route=>new URL(route.request().url()).origin===base ? route.continue() : route.abort());
    await context.addCookies([{name:'lumina_session',value:accounts[id].token,url:base}]);
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',message=>{if(message.type()==='error' && message.text().includes('Encountered two children with the same key'))errors.push(message.text());});
    page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=500)errors.push('HTTP '+r.status()+' '+new URL(r.url()).pathname);});
    return page;
  }
  await performanceBrowserChecks({pageFor,base,db,check});
  await classProgramBrowserChecks({pageFor,base,db,check,output});
  await instructorMembershipBrowserChecks({pageFor,base,db,cluster,check,output});
  const headPage = await pageFor('head');
  await check('browser chart icon opens instructor classes and Stream with Meet link',async()=>{
    await headPage.goto(base+'/ics/organization');
    await headPage.getByRole('heading',{name:'Organizational Chart',exact:true}).waitFor();
    await headPage.getByRole('button',{name:'View classes for Synthetic faculty',exact:true}).click();
    const dialog = headPage.getByRole('dialog'); await dialog.waitFor();
    await dialog.getByRole('link',{name:'Synthetic program-class',exact:true}).click();
    await headPage.getByRole('heading',{name:'Stream',exact:true,level:2}).waitFor();
    const meet = headPage.getByRole('link',{name:/Join Google Meet/});
    assert.equal(await meet.getAttribute('href'),'https://meet.google.com/abc-defg-hij');
    assert.equal(await meet.getAttribute('target'),'_blank');
    assert.match(await meet.getAttribute('rel'),/noopener/);
    assert.equal(await headPage.locator('textarea').count(),0);
    await headPage.screenshot({path:path.join(output,'program-head-stream.png'),fullPage:true});
  });
  await check('browser ordinary faculty sees chart but cannot open oversight',async()=>{
    const page = await pageFor('faculty'); await page.goto(base+'/ics/organization');
    await page.getByRole('heading',{name:'Organizational Chart',exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'View classes for Synthetic head',exact:true}).isDisabled(),true);
    assert.equal(await page.getByRole('link',{name:'View program classes',exact:true}).count(),0);
    const response = await page.request.get(base+'/api/programs/bsit/courses/program-class');
    assert.equal(response.status(),403); await page.close();
  });
  await check('browser retains main dashboard Calendar without replacement route',async()=>{
    await headPage.goto(base+'/ics');
    await headPage.getByText('Calendar',{exact:true}).first().waitFor();
    assert.equal(fs.existsSync('apps/web/src/app/(dashboard)/[institute]/calendar/page.tsx'),false);
    assert.equal(fs.existsSync('apps/web/src/components/academic-structure/AcademicCalendar.tsx'),false);
  });
  await administratorBrowserChecks({browser,base,db,check,output,report});
  await check('actual Super User login and dedicated institute shell',async()=>{
    const context=await browser.newContext();
    await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
    const page=await context.newPage();page.setDefaultTimeout(15000);
    const login=await context.request.post(base+'/api/auth/login',{data:{email:'synthetic-super@example.invalid',password:'Synthetic-Super-Only-12345',instituteCode:'ibe'}});
    report.superLoginStatus=login.status();assert.equal(login.status(),200,'actual password login');const body=await login.json();assert.equal(body.user.role,'SUPER_USER');assert.equal(body.user.institute.code,'ics');
    accounts.super.token=body.token;
    await page.goto(base+'/ics/academic-operations/courses');await page.getByText('Super User · ICS',{exact:true}).waitFor();
    await page.getByRole('link',{name:'Synthetic program-class',exact:true}).waitFor();
    const cookieStatus=await page.evaluate(async()=> (await fetch('/api/academic-oversight/ics/courses')).status);report.superBrowserCookieStatus=cookieStatus;assert.equal(cookieStatus,200,'real browser Cookie oversight');
    // Chrome treats loopback as a secure context; Playwright's separate HTTP
    // client does not send Secure cookies over HTTP. Exercise Bearer explicitly.
    const headers={Authorization:'Bearer '+body.token};
    const response=await context.request.get(base+'/api/academic-oversight/ics/courses',{headers});report.superOversightStatus=response.status();assert.equal(response.status(),200,'authenticated Bearer oversight after login');const result=await response.json();assert.equal(result.courses.length,2);assert.ok(!JSON.stringify(result).includes('SECRET-'));
    assert.equal(await page.getByRole('link',{name:'Gradebook',exact:true}).count(),0);
    await page.getByRole('link',{name:'IBE',exact:true}).click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('p')).filter(p=>p.textContent==='Super User · IBE').length===1);
    await page.getByText('Super User · IBE',{exact:true}).waitFor();
    assert.equal((await cluster.owner.query('SELECT "instituteId" FROM public."User" WHERE id=$1',[accounts.super.id])).rows[0].instituteId,'ics');
    const oldApi=await context.request.get(base+'/api/courses',{headers});assert.equal(oldApi.status(),403,'existing GET course API denies Super User');
    await page.goto(base+'/ics/teachers');assert.ok(!await page.locator('body').innerText().then(s=>s.includes('My Classes')));
    const before=(await cluster.owner.query('SELECT count(*)::int n FROM public."PasswordResetOtp" WHERE "userId"=$1',[accounts.super.id])).rows[0].n;
    assert.equal((await context.request.post(base+'/api/auth/forgot-password',{data:{email:'synthetic-super@example.invalid'}})).status(),200);
    assert.equal((await cluster.owner.query('SELECT count(*)::int n FROM public."PasswordResetOtp" WHERE "userId"=$1',[accounts.super.id])).rows[0].n,before);
    await context.close();
  });
  await check('all instrumented legacy HTTP operations reject authenticated Super User',async()=>{
    const cases=JSON.parse(fs.readFileSync('tests/program-head/legacy-api-cases.json','utf8'));
    for(const row of cases){
      const route=row.path.slice('apps/web/src/app'.length).replace(/\/route.ts$/,'').replace(/\[\.\.\.[^\]]+\]/g,'fixture').replace(/\[[^\]]+\]/g,'fixture');
      const response=await fetch(base+route,{method:row.verb,headers:{Authorization:'Bearer '+accounts.super.token,'Content-Type':'application/json'},...(['GET','HEAD'].includes(row.verb)?{}:{body:'{}'})});
      assert.equal(response.status,403,row.verb+' '+route);
    }
  });
  await check('five Administrator operations enforce handoff, status, audit and session rules',async()=>{
    const headers={Authorization:'Bearer '+accounts.super.token,'Content-Type':'application/json'};
    const basePath=base+'/api/super-user/ics/institute-admins';
    assert.equal((await fetch(basePath,{headers})).status,200);
    const created=await fetch(basePath,{method:'POST',headers,body:JSON.stringify({name:'Synthetic Institute Admin',email:'ia-new@example.invalid'})});assert.equal(created.status,201);
    const identity=await created.json();assert.equal(identity.instituteAdmin.role,'ADMIN');const id=identity.instituteAdmin.id;assert.equal(identity.instituteAdmin.isActive,false);assert.ok(!JSON.stringify(identity).includes('password'));
    assert.equal((await fetch(basePath+'/'+id,{headers})).status,200);
    assert.equal((await fetch(basePath+'/'+id+'/reactivate',{method:'POST',headers})).status,409,'handoff incomplete');
    const current=(await cluster.owner.query('SELECT password FROM public."User" WHERE id=$1',[id])).rows[0];
    const operator=await cluster.connect('bqual_test_operator');
    await operator.query('SELECT super_user_security.complete_handoff($1,$2,$3,$4,$5,$6,$7)',[id,'ics',current.password,await hash('Synthetic-IA-Only-98765',10),'synthetic_ia_handoff_001',createHash('sha256').update('SYNTHETIC_OWNED_TEST').digest('hex'),'SYNTHETIC_NOT_APPROVAL']);
    assert.equal((await cluster.owner.query('SELECT "isActive" FROM public."User" WHERE id=$1',[id])).rows[0].isActive,false);
    assert.equal((await fetch(basePath+'/'+id+'/reactivate',{method:'POST',headers})).status,200);
    await db.session.create({data:{userId:id,tokenHash:createHash('sha256').update('SYNTHETIC_IA_SESSION').digest('hex'),expiresAt:new Date(Date.now()+3600000)}});
    await cluster.owner.query('REVOKE INSERT ON public."AuditLog" FROM bqual_test_app');
    try {assert.equal((await fetch(basePath+'/'+id+'/suspend',{method:'POST',headers})).status,503);}
    finally {await cluster.owner.query('GRANT INSERT ON public."AuditLog" TO bqual_test_app');}
    assert.equal((await cluster.owner.query('SELECT "isActive" FROM public."User" WHERE id=$1',[id])).rows[0].isActive,true);
    assert.equal((await db.session.count({where:{userId:id}})),1);
    const suspended=await fetch(basePath+'/'+id+'/suspend',{method:'POST',headers});assert.equal(suspended.status,200);assert.deepEqual((await suspended.json()).warnings,[]);
    assert.equal(await db.session.count({where:{userId:id}}),0);
    assert.equal((await fetch(basePath+'/'+id+'/suspend',{method:'POST',headers})).status,409);
    for(const target of [accounts.super.id,'faculty','student','unknown'])assert.equal((await fetch(basePath+'/'+target+'/suspend',{method:'POST',headers})).status,403,target);
    assert.equal((await fetch(base+'/api/super-user/ibe/institute-admins/'+id+'/reactivate',{method:'POST',headers})).status,403);
    assert.equal((await fetch(basePath,{method:'POST',headers,body:JSON.stringify({name:'Must not create',email:'blocked@example.invalid',role:'SUPER_USER'})})).status,400);
  });
  await check('exported server actions, callable skills and Judge0 tool deny Super User',async()=>{
    const {workAsyncStorage}=requireWeb('next/dist/server/app-render/work-async-storage.external');
    const {workUnitAsyncStorage}=requireWeb('next/dist/server/app-render/work-unit-async-storage.external');
    const {RequestCookies}=requireWeb('next/dist/compiled/@edge-runtime/cookies');
    const headers=new Headers({cookie:'lumina_session='+accounts.super.token});const cookies=new RequestCookies(headers);
    const context=fn=>workAsyncStorage.run({page:'/fixture/page',route:'/fixture',isStaticGeneration:false,incrementalCache:{},pendingRevalidatedTags:[],pendingRevalidates:{},pendingRevalidateWrites:[],cacheLifeProfiles:{}},()=>workUnitAsyncStorage.run({type:'request',phase:'action',url:{pathname:'/fixture',search:''},headers,cookies,mutableCookies:cookies,userspaceMutableCookies:cookies,draftMode:{isEnabled:false},rootParams:{}},fn));
    const cases=JSON.parse(fs.readFileSync('tests/program-head/legacy-callable-cases.json','utf8'));
    for(const row of cases){const module=await import(pathToFileURL(path.resolve(row.path)).href);assert.equal(typeof module[row.name],'function',row.path+'#'+row.name);await assert.rejects(()=>context(()=>module[row.name](...Array.from({length:Math.max(6,module[row.name].length)},()=>({})))),error=>error.status===403,row.path+'#'+row.name);}
    const {executeSandboxedCodeTool}=await import('../../apps/web/src/lib/harness/tools/judge0-tool.ts');
    await assert.rejects(()=>context(()=>executeSandboxedCodeTool.execute({sourceCode:'',languageId:1},{userId:accounts.super.id,role:'STUDENT',instituteCode:'ics',instituteId:'ics'})),error=>error.status===403);
    report.deniedExportedCallables=cases.length;report.deniedJudge0Tool=true;
  });
  await check('browser has no runtime errors or server failures',async()=>assert.deepEqual(errors,[]));
  }
} catch (error) {
  report.error = { name: error.name, message: error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[REDACTED]') };
  console.error('FAIL ' + report.error.message); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) { server.kill(); report.serverClose = await Promise.race([serverClose,new Promise(resolve=>setTimeout(()=>resolve({inconclusive:true}),10000))]); if(report.serverClose.inconclusive)process.exitCode=1; fs.writeFileSync(path.join(output,'server.log'),serverLog); }
  if (db) { await db.$disconnect(); await globalThis.pgPool?.end(); }
  if (cluster) { await cluster.stop(); report.clusterStopped = true; }
  if (metadataFile) fs.unlinkSync(metadataFile);
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log('Evidence: ' + path.relative(process.cwd(),output));
}
