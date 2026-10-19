import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline';
import { Client } from 'pg';
import { parse } from '../node_modules/.pnpm/dotenv@17.4.2/node_modules/dotenv/lib/main.js';
const sha = value => createHash('sha256').update(value).digest('hex');
const sqlPath = 'prisma/super-user-v1/program-head-instructors.sql';
const sql = fs.readFileSync(sqlPath,'utf8');
const reports=fs.readdirSync('tmp/program-head-integration',{withFileTypes:true}).filter(entry=>entry.isDirectory()).map(entry=>path.join('tmp/program-head-integration',entry.name,'report.json')).filter(file=>fs.existsSync(file)).map(file=>JSON.parse(fs.readFileSync(file,'utf8')));
const tested=reports.reverse().find(report=>!report.error && report.checks?.every(check=>check.result==='PASS') && report.boundaryInstallation?.files?.some(file=>file.path===sqlPath && file.sha256===sha(sql)));
if(!tested) throw Error('PASSING_INTEGRATION_RECEIPT_REQUIRED');
if(tested.checks.some(c=>c.result!=='PASS') || tested.boundaryInstallation.files.find(f=>f.path===sqlPath)?.sha256!==sha(sql)) throw Error('TESTED_SQL_MISMATCH');
const settings=parse(fs.readFileSync('.env'));
const runtimeUrl = new URL(settings.DATABASE_URL);
function clientFor(value) {
 const url=new URL(value);
 if(['prefer','require','verify-ca'].includes(url.searchParams.get('sslmode')) && url.searchParams.get('uselibpqcompat')!=='true') url.searchParams.set('sslmode','verify-full');
 return new Client({connectionString:url.href,connectionTimeoutMillis:12000,statement_timeout:20000});
}
console.log('Ready for owner connection on private stdin; no credential will be printed or saved.');
const lines=createInterface({input:process.stdin,terminal:false});
let supplied='';
for await(const line of lines) { supplied=line.trim(); break; }
lines.close();
let owner, runtime, inTransaction=false, commitAttempted=false;
const record={sqlPath,sqlSHA256:sha(sql),startedAt:new Date().toISOString(),status:'PREFLIGHT'};
const directory=path.resolve('output/database','program-head-instructors-'+Date.now());
const snapshotSql=`SELECT (SELECT count(*)::int FROM public."Course") AS courses, (SELECT md5(coalesce(string_agg(row_to_json(c)::text,'' ORDER BY c.id),'')) FROM public."Course" c) AS courseDigest, (SELECT count(*)::int FROM public."Enrollment") AS enrollments, (SELECT md5(coalesce(string_agg(row_to_json(e)::text,'' ORDER BY e.id),'')) FROM public."Enrollment" e) AS enrollmentDigest, (SELECT md5(coalesce(string_agg(row_to_json(m)::text,'' ORDER BY m."programId",m."userId"),'')) FROM public."ProgramMembership" m) AS membershipDigest, (SELECT md5(coalesce(string_agg(row_to_json(h)::text,'' ORDER BY h."programId",h."userId"),'')) FROM public."ProgramHeadAssignment" h) AS headDigest`;
try {
 const ownerUrl=new URL(supplied); supplied='';
 if(ownerUrl.hostname.replace('-pooler','')!==runtimeUrl.hostname.replace('-pooler','') || ownerUrl.pathname!==runtimeUrl.pathname) throw Error('TARGET_MISMATCH');
 owner=clientFor(ownerUrl.href); runtime=clientFor(runtimeUrl.href);
 await owner.connect(); await runtime.connect();
 const identity=(await owner.query(`SELECT current_database() AS db,current_user AS principal,has_schema_privilege(current_user,'super_user_security','CREATE') AS can_create,pg_has_role(current_user,p.proowner,'MEMBER') AS can_replace FROM pg_proc p WHERE p.oid='public.academic_course_mapping_guard()'::regprocedure`)).rows[0];
 if(!identity?.can_create || !identity.can_replace) throw Error('OWNER_AUTHORITY_REQUIRED');
 const runtimeIdentity=(await runtime.query('SELECT current_database() AS db,current_user AS principal,super_user_security.application_boundary_qualified() AS qualified')).rows[0];
 if(identity.db!==runtimeIdentity.db || !runtimeIdentity.qualified) throw Error('RUNTIME_BOUNDARY_MISMATCH');
 record.targetFingerprint=sha(ownerUrl.hostname.replace('-pooler','')+'|'+identity.db).slice(0,16);
 record.ownerPrincipal=identity.principal; record.runtimePrincipal=runtimeIdentity.principal;
 await owner.query('BEGIN'); inTransaction=true;
 await owner.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='20s'");
 await owner.query("SELECT pg_advisory_xact_lock(hashtext('lms:program-head-instructors'))");
 const previous=(await owner.query(`SELECT p.oid::regprocedure::text AS signature,pg_get_functiondef(p.oid) AS definition,pg_get_userbyid(p.proowner) AS owner,p.proacl::text AS acl FROM pg_proc p WHERE p.oid IN (to_regprocedure('public.academic_course_mapping_guard()'),to_regprocedure('super_user_security.add_program_instructor(text,text,text,text,integer)')) ORDER BY p.oid`)).rows;
 fs.mkdirSync(directory,{recursive:true});
 fs.writeFileSync(path.join(directory,'previous-functions.json'),JSON.stringify(previous,null,2),{flag:'wx'});
 await owner.query('LOCK TABLE public."Course",public."Enrollment",public."ProgramMembership",public."ProgramHeadAssignment" IN SHARE MODE');
 record.before=(await owner.query(snapshotSql)).rows[0];
 await owner.query(sql.replace(/^\s*BEGIN;/,'').replace(/COMMIT;\s*$/,''));
 record.after=(await owner.query(snapshotSql)).rows[0];
 if(JSON.stringify(record.before)!==JSON.stringify(record.after)) throw Error('DATA_PRESERVATION_CHECK_FAILED');
 const grants=(await owner.query(`SELECT has_function_privilege($1,'super_user_security.add_program_instructor(text,text,text,text,integer)','EXECUTE') AS runtime_can_execute, NOT has_table_privilege($1,'super_user_security.academic_assignment_permits','INSERT,UPDATE,DELETE,TRUNCATE') AS permits_private`,[runtimeIdentity.principal])).rows[0];
 if(!grants.runtime_can_execute || !grants.permits_private) throw Error('GRANT_VERIFICATION_FAILED');
 record.grants=grants;
 commitAttempted=true; await owner.query('COMMIT'); inTransaction=false; record.status='COMMITTED';
 const installed=(await runtime.query(`SELECT to_regprocedure('super_user_security.add_program_instructor(text,text,text,text,integer)') IS NOT NULL AS installed, has_function_privilege(current_user,'super_user_security.add_program_instructor(text,text,text,text,integer)','EXECUTE') AS executable,super_user_security.application_boundary_qualified() AS qualified`)).rows[0];
 if(!installed.installed || !installed.executable || !installed.qualified) throw Error('POST_COMMIT_VERIFICATION_FAILED');
 record.runtimeVerification=installed;
 try { await runtime.query("SELECT super_user_security.add_program_instructor('invalid-session','invalid-token','invalid-program','invalid-target',1)"); throw Error('UNAUTHENTICATED_CALL_ACCEPTED'); }
 catch(e) { if(e.code!=='42501') throw e; record.unauthenticatedCallDenied=true; }
 record.status='VERIFIED';
 console.log(JSON.stringify({status:record.status,targetFingerprint:record.targetFingerprint,runtimeVerification:installed,dataPreserved:true,unauthenticatedCallDenied:true,receiptDirectory:directory}));
} catch(e) {
 if(inTransaction && !commitAttempted) { await owner.query('ROLLBACK').catch(()=>{}); record.status='ROLLED_BACK'; }
 else if(commitAttempted && record.status!=='COMMITTED') record.status='COMMIT_OUTCOME_UNCERTAIN';
 record.errorCode=e.code??(/^[A-Z_]+$/.test(e.message??'')?e.message:'OPERATION_FAILED');
 console.log(JSON.stringify({status:record.status,errorCode:record.errorCode})); process.exitCode=1;
} finally {
 if(fs.existsSync(directory)) { record.finishedAt=new Date().toISOString(); fs.writeFileSync(path.join(directory,'receipt.json'),JSON.stringify(record,null,2)); }
 await owner?.end().catch(()=>{}); await runtime?.end().catch(()=>{});
}
