const fs=require('node:fs'),{Client}=require('pg'),{parseEnv:parse}=require('node:util');
const root=parse(fs.readFileSync('.env','utf8')),web=parse(fs.readFileSync('apps/web/.env.local','utf8'));
const value=web.DATABASE_URL||root.DATABASE_URL;
const target=new URL(value);
if(target.hostname!=='ep-bold-lab-az9n3hq4-pooler.c-3.ap-southeast-1.aws.neon.tech'||target.pathname!=='/neondb')throw Error('Target mismatch; no connection attempted.');
const client=new Client({connectionString:value,connectionTimeoutMillis:10000});
(async()=>{try{
 await client.connect();await client.query("BEGIN READ ONLY; SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='2s'");
 const identity=(await client.query('SELECT current_database() db,current_setting(\'transaction_read_only\') ro')).rows[0];if(identity.db!=='neondb'||identity.ro!=='on')throw Error('Read-only target verification failed');
 const accounts=(await client.query('SELECT email,role,"isActive" FROM public."User" WHERE lower(email)=ANY($1::text[]) ORDER BY email',[['admin@ics.edu.ph','programhead@bsit.edu.ph','programhead@bscpe.edu.ph','superuser@ics.edu.ph']])).rows;
 const structure=(await client.query("SELECT to_regnamespace('super_user_security') IS NOT NULL AS guarded, to_regclass('public.\"AcademicProgram\"') IS NOT NULL AS programs")).rows[0];
 const principal=(await client.query('SELECT r.rolsuper,r.rolcreaterole,r.rolcreatedb,r.rolbypassrls,EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relowner=r.oid AND n.nspname=\'public\') AS owns_public_objects FROM pg_roles r WHERE r.rolname=session_user')).rows[0];
 const metadata=(await client.query('SELECT i.code,count(c.id)::int AS "activeCourses",count(c.id) FILTER(WHERE c."courseCode"<>\'\' AND upper(c.code)=upper(c."courseCode"))::int AS "identifierJoinCodeCollisions" FROM public."Institute" i LEFT JOIN public."Course" c ON c."instituteId"=i.id AND NOT c."isArchived" WHERE i.code IN (\'ics\',\'ibe\',\'ite\') GROUP BY i.code ORDER BY i.code')).rows;
 await client.query('ROLLBACK');const result={checkedAt:new Date().toISOString(),readOnly:true,requestedAccounts:accounts,structure,principal,metadata};fs.writeFileSync('tmp/super-user-main-completion/database-preflight-'+Date.now()+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){console.error('PREFLIGHT_FAILED',error.code??error.name);process.exitCode=1;}finally{await client.end().catch(()=>{});}})();
