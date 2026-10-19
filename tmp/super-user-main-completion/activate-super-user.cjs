// Explicit owner-requested operator setup. Never invoked by the web application.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{parseEnv}=require('node:util'),{spawnSync}=require('node:child_process'),{Client}=require('pg'),{hash}=require('bcryptjs');
require('pg').types.setTypeParser(1114,value=>new Date(value+'Z'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const attempt='super_user_'+Date.now(),directory=path.join(process.env.LOCALAPPDATA,'LuminaLMS','security',attempt);
const credentialsFile=path.join(directory,'operator-and-runtime.json'),handoffFile=path.join(directory,'super-user-login.txt'),policyFile=path.join(directory,'metadata-policy.json');
const runtimePrincipal='lms_web_runtime_v1',operatorPrincipal='lms_security_operator_v1';
const rootBytes=fs.readFileSync('.env'),webBytes=fs.readFileSync('apps/web/.env.local');
const oldRoot=parseEnv(rootBytes.toString()),oldWeb=parseEnv(webBytes.toString()),originalUrl=oldWeb.DATABASE_URL||oldRoot.DATABASE_URL,target=new URL(originalUrl);
if(target.hostname!=='ep-bold-lab-az9n3hq4-pooler.c-3.ap-southeast-1.aws.neon.tech'||target.pathname!=='/neondb')throw Error('Target mismatch; no connection attempted.');
const ignored=spawnSync('git',['-c','core.fsmonitor=false','check-ignore','--','.env','apps/web/.env.local'],{encoding:'utf8',windowsHide:true});
if(ignored.status!==0||ignored.stdout.trim().split(/\r?\n/).length!==2)throw Error('Configuration files must remain gitignored.');
const fullTestPath='tmp/program-head-integration/feature-1792313864872/report.json',installTestPath='tmp/program-head-integration/feature-1792313957679/report.json';
for(const p of [fullTestPath,installTestPath]){const r=JSON.parse(fs.readFileSync(p));if(r.error||r.checks.some(c=>c.result!=='PASS')||!r.clusterStopped)throw Error('Successful retained local checks required.');}
const reference='OWNER_REQUEST_2026_10_18_SUPER_USER_AND_METADATA',clients=[];
const report={attempt,startedAt:new Date().toISOString(),profile:'trusted-local',OSIsolation:false,authorizingAdministratorEmail:'admin@ics.edu.ph',reference,checks:[],status:'NOT_COMPLETED'};
let phase='protected-storage';
function stable(value){if(value instanceof Date)return value.toISOString();if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]));return value;}
async function connect(url){const client=new Client({connectionString:url,connectionTimeoutMillis:10000});await client.connect();clients.push(client);if((await client.query('SELECT current_database() db')).rows[0].db!=='neondb')throw Error('Target mismatch');return client;}
function configured(bytes,values){let text=bytes.toString();const ending=text.includes('\r\n')?'\r\n':'\n';for(const [key,value]of Object.entries(values)){const escaped=JSON.stringify(value);const pattern=new RegExp('^'+key+'=.*$','gm');if(pattern.test(text))text=text.replace(pattern,()=>key+'='+escaped);else text+=(text.endsWith('\n')?'':ending)+key+'='+escaped+ending;}return text;}
(async()=>{try{
 const q=s=>s.replaceAll("'","''");
 const acl=spawnSync('pwsh.exe',['-NoProfile','-Command',`$ErrorActionPreference='Stop';$directory='${q(directory)}';$allowed=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'LuminaLMS/security'));if(-not [IO.Path]::GetFullPath($directory).StartsWith($allowed+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Boundary'};if(Test-Path -LiteralPath $directory){throw 'Already exists'};for($p=[IO.Path]::GetDirectoryName($directory);$p;$p=[IO.Path]::GetDirectoryName($p)){if((Test-Path -LiteralPath $p)-and((Get-Item -LiteralPath $p -Force).Attributes-band[IO.FileAttributes]::ReparsePoint)){throw 'Reparse'}};New-Item -ItemType Directory -Path $directory -Force|Out-Null;$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User;$acl=Get-Acl -LiteralPath $directory;$acl.SetAccessRuleProtection($true,$false);$acl.SetAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'));Set-Acl -LiteralPath $directory -AclObject $acl;$verified=Get-Acl -LiteralPath $directory;if(-not $verified.AreAccessRulesProtected-or@($verified.Access|Where-Object{$_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value-ne$sid.Value}).Count){throw 'ACL'};Write-Output 'ACL_VALIDATED'`],{encoding:'utf8',windowsHide:true});
 if(acl.status!==0||!acl.stdout.includes('ACL_VALIDATED'))throw Error('Protected directory ACL failed.');
 const runtimePassword=crypto.randomBytes(32).toString('base64url'),operatorPassword=crypto.randomBytes(32).toString('base64url'),password='Lms9!'+crypto.randomBytes(24).toString('base64url');
 const runtime=new URL(originalUrl),operator=new URL(originalUrl);runtime.username=runtimePrincipal;runtime.password=runtimePassword;operator.username=operatorPrincipal;operator.password=operatorPassword;runtime.searchParams.set('sslmode','verify-full');operator.searchParams.set('sslmode','verify-full');
 fs.writeFileSync(path.join(directory,'previous-root.env'),rootBytes,{flag:'wx'});fs.writeFileSync(path.join(directory,'previous-web.env.local'),webBytes,{flag:'wx'});
 fs.writeFileSync(credentialsFile,JSON.stringify({runtimeUrl:runtime.href,operatorUrl:operator.href,ownerRecovery:'previous-root.env / previous-web.env.local'},null,2),{flag:'wx'});
 fs.writeFileSync(handoffFile,['Lumina LMS Super User','Portal: http://localhost:3000/login?institute=ics','Email: superuser@ics.edu.ph','Password: '+password,'','Store securely. This local file is ACL-restricted, not encrypted.'].join('\r\n'),{flag:'wx'});
 phase='target-and-administrator';const owner=await connect(originalUrl);
 const admin=(await owner.query('SELECT u.id,u.role,u."isActive",i.code,u."instituteId" FROM public."User" u JOIN public."Institute" i ON i.id=u."instituteId" WHERE lower(email)=\'admin@ics.edu.ph\'')).rows[0];
 if(!admin||admin.role!=='ADMIN'||!admin.isActive||admin.code!=='ics')throw Error('Verified active ICS administrator required.');
 if((await owner.query('SELECT 1 FROM public."User" WHERE lower(email)=\'superuser@ics.edu.ph\' OR "uniqueId"=\'cdm_super_user_01\'')).rowCount)throw Error('Super User already exists; reconciliation required.');
 const calendarQuery="SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='CalendarEvent' ORDER BY ordinal_position";
 report.calendarBeforeSHA256=sha(JSON.stringify((await owner.query(calendarQuery)).rows));
 phase='security-boundary';const {installSuperUserBoundary}=await import('../../scripts/install-super-user-boundary.mjs');
 report.boundary=await installSuperUserBoundary(owner,{runtimePrincipal,operatorPrincipal,runtimePassword,operatorPassword,qualificationReference:'LOCAL_REHEARSAL_SHA256:'+sha(fs.readFileSync(installTestPath))+';'+reference});
 phase='actual-runtime-qualification';const app=await connect(runtime.href);
 if((await app.query('SELECT super_user_security.application_boundary_qualified() qualified')).rows[0].qualified!==true)throw Error('Actual restricted runtime qualification failed.');
 report.checks.push('actual restricted runtime qualified');
 phase='operator-bootstrap';const op=await connect(operator.href);
 const initial=await hash(crypto.randomBytes(32).toString('base64url'),12),replacement=await hash(password,12);
 const requestReceipt={reference,administratorId:admin.id,email:'superuser@ics.edu.ph',identifier:'cdm_super_user_01',homeInstituteId:admin.instituteId,creationAttempt:attempt+'_create',handoffAttempt:attempt+'_handoff',activationAttempt:attempt+'_activate',localChecks:[{path:fullTestPath,sha256:sha(fs.readFileSync(fullTestPath))},{path:installTestPath,sha256:sha(fs.readFileSync(installTestPath))}]};
 const receiptBytes=Buffer.from(JSON.stringify(requestReceipt));fs.writeFileSync(path.join(directory,'account-request-receipt.json'),receiptBytes,{flag:'wx'});const receiptDigest=sha(receiptBytes);
 const id=(await op.query('SELECT super_user_security.bootstrap_super_user($1,$2,$3,$4,$5,$6,$7,$8) id',['cdm_super_user_01','Super User','superuser@ics.edu.ph',admin.instituteId,initial,attempt+'_create',receiptDigest,reference])).rows[0].id;
 report.accountId=id;report.bootstrapCommitted=true;
 phase='credential-handoff';await op.query('SELECT super_user_security.complete_handoff($1,$2,$3,$4,$5,$6,$7)',[id,admin.instituteId,initial,replacement,attempt+'_handoff',receiptDigest,reference]);report.handoffCommitted=true;
 phase='separate-initial-activation';await op.query('SELECT super_user_security.activate_new_bootstrap($1,$2,$3,$4,$5,$6)',[id,admin.instituteId,attempt+'_create',attempt+'_activate',receiptDigest,reference]);report.activationCommitted=true;
 phase='approved-metadata-binding';const policies=[];
 for(const code of ['ics','ibe','ite']){
  const institute=(await owner.query('SELECT id,code,name FROM public."Institute" WHERE code=$1',[code])).rows[0];if(!institute)throw Error('Supported institute absent.');
  const rows=(await owner.query('SELECT id,code,"courseCode",title,section,subject,room,"instructorId" FROM public."Course" WHERE "instituteId"=$1 AND NOT "isArchived" ORDER BY id',[institute.id])).rows;
  const courses=[];for(const row of rows){const {instructorId,courseCode,...course}=row;if(courseCode&&course.code.toUpperCase()===courseCode.toUpperCase())course.code='';course.instructor=instructorId?(await owner.query('SELECT id,name,role,"instituteId" FROM public."User" WHERE id=$1',[instructorId])).rows[0]??null:null;courses.push(course);}
  const datasets=[{institute,courses,schedule:[],materials:[],announcements:[]}];
  for(const course of courses){const schedule=(await owner.query('SELECT id,title,"eventDate","eventType" FROM public."CalendarEvent" WHERE "courseId"=$1 AND "instituteId"=$2 ORDER BY id',[course.id,institute.id])).rows;const materials=(await owner.query('SELECT id,title,type,"dueDate" FROM public."SyllabusItem" WHERE "courseId"=$1 AND type=\'MATERIAL\' ORDER BY id',[course.id])).rows;const announcements=(await owner.query('SELECT id,"createdAt" FROM public."Announcement" WHERE "courseId"=$1 ORDER BY id',[course.id])).rows;datasets.push({institute,courses:[course],schedule,materials,announcements});}
  if(datasets.length>200)throw Error('Metadata loader bound exceeded; no truncation allowed.');
  policies.push({version:1,instituteId:institute.id,datasetSHA256:datasets.map(d=>sha(JSON.stringify(stable(d)))),approverBinding:'admin@ics.edu.ph',maintainerBinding:'admin@ics.edu.ph',approvalReference:reference,expiresAt:new Date(Date.now()+30*86400000).toISOString(),revoked:false});
 }
 const policyBytes=Buffer.from(JSON.stringify(policies));if(policyBytes.length>16384)throw Error('Metadata policy exceeds loader limit.');fs.writeFileSync(policyFile,policyBytes,{flag:'wx'});
 report.metadata={path:policyFile,sha256:sha(policyBytes),institutes:policies.length,approver:'admin@ics.edu.ph',maintainer:'admin@ics.edu.ph',expiresAt:policies[0].expiresAt,scope:'owner-approved metadata only; no join codes or summaries'};
 report.calendarAfterSHA256=sha(JSON.stringify((await owner.query(calendarQuery)).rows));if(report.calendarBeforeSHA256!==report.calendarAfterSHA256)throw Error('Unexpected Calendar schema change.');
 phase='local-runtime-configuration';if(!fs.readFileSync('.env').equals(rootBytes)||!fs.readFileSync('apps/web/.env.local').equals(webBytes))throw Error('Configuration changed concurrently; manual reconciliation required.');
 const values={DATABASE_URL:runtime.href,POSTGRES_PRISMA_URL:runtime.href,POSTGRES_URL:runtime.href,SUPER_USER_METADATA_POLICY_PATH:policyFile,SUPER_USER_METADATA_POLICY_SHA256:sha(policyBytes)};
 fs.writeFileSync('.env',configured(rootBytes,values));fs.writeFileSync('apps/web/.env.local',configured(webBytes,values));report.localRuntimeConfigured=true;
 report.handoffFile=handoffFile;report.recoveryDirectory=directory;report.ACLValidated=true;report.encrypted=false;report.email='superuser@ics.edu.ph';report.status='SETUP_COMPLETED';
}catch(error){report.status='STOPPED_RECONCILIATION_REQUIRED';report.failurePhase=phase;report.errorCode=error.code??error.message;process.exitCode=1;}finally{for(const client of clients)await client.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync('tmp/super-user-main-completion/super-user-setup-receipt.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}})();
