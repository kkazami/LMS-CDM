import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

export function configuration(root=process.cwd(),environment=process.env){
  const read=name=>fs.existsSync(path.join(root,name))?parseEnv(fs.readFileSync(path.join(root,name),'utf8')):{};
  const mode=environment.NODE_ENV==='production'?'production':'development';
  const cli={...read('.env'),...environment};
  const web={...read('apps/web/.env'),...read(`apps/web/.env.${mode}`),...read('apps/web/.env.local'),...read(`apps/web/.env.${mode}.local`),...environment};
  const connection=value=>value.DATABASE_URL||value.POSTGRES_PRISMA_URL||value.POSTGRES_URL;
  const runtime=connection(web)||connection(cli);
  if(!runtime)throw Error('Configure the web runtime database first.');
  return {runtime,cli:connection(cli),enabled:web.OHMWARD_ENABLED==='true'};
}
export function databaseIdentity(connection){
  const value=new URL(connection);
  if(!['postgres:','postgresql:'].includes(value.protocol))throw Error('A PostgreSQL connection is required.');
  // Neon direct and pooled endpoints identify the same database.
  return [value.hostname.replace(/-pooler(?=\.)/,''),value.port||'5432',decodeURIComponent(value.pathname),value.searchParams.get('schema')||'public'].join('|');
}
export function poolOptions(connection){
  const url=new URL(connection),local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if(!local){url.searchParams.delete('uselibpqcompat');url.searchParams.set('sslmode','verify-full');}
  return {connectionString:url.href,max:1,connectionTimeoutMillis:15000,...(!local?{ssl:{rejectUnauthorized:true}}:{})};
}
export function inspectHistory(rows,root=process.cwd()){
  const directory=path.join(root,'prisma/migrations');
  const disk=fs.readdirSync(directory).filter(name=>fs.existsSync(path.join(directory,name,'migration.sql')));
  const applied=rows.filter(row=>row.finished_at&&!row.rolled_back_at);
  const checksum=value=>createHash('sha256').update(value).digest('hex');
  return {pending:disk.filter(name=>!applied.some(row=>row.migration_name===name)),failed:rows.filter(row=>!row.finished_at&&!row.rolled_back_at).map(row=>row.migration_name),missing:applied.filter(row=>!disk.includes(row.migration_name)).map(row=>row.migration_name),changed:applied.filter(row=>{
    if(!disk.includes(row.migration_name))return false;
    const text=fs.readFileSync(path.join(directory,row.migration_name,'migration.sql'),'utf8');
    return ![text,text.replace(/\r\n/g,'\n'),text.replace(/\r?\n/g,'\r\n')].some(value=>checksum(value)===row.checksum);
  }).map(row=>row.migration_name)};
}
const requirements={OhmwardLearner:['SELECT','INSERT','UPDATE'],OhmwardAttempt:['SELECT','INSERT','UPDATE'],OhmwardProgress:['SELECT','INSERT','UPDATE'],User:['SELECT'],Session:['SELECT'],Enrollment:['SELECT'],Course:['SELECT'],Institute:['SELECT'],RateLimitBucket:['SELECT','INSERT','UPDATE'],GamificationProfile:['SELECT','INSERT','UPDATE'],ExpTransaction:['SELECT','INSERT']};
export async function checkDatabase(root=process.cwd(),environment=process.env){
  const config=configuration(root,environment),identity=databaseIdentity(config.runtime);
  if(config.cli&&databaseIdentity(config.cli)!==identity)throw Error('Root Prisma and web runtime point to different databases. Resolve that before migration/enablement.');
  const pool=new Pool(poolOptions(config.runtime));let client;
  try{
    client=await pool.connect();await client.query('BEGIN READ ONLY');await client.query("SET LOCAL statement_timeout='15s'");
    // Same principal ceiling as applicationWriterQualified; table grants alone are insufficient.
    const principal=(await client.query(`SELECT CASE WHEN NOT r.rolsuper AND NOT r.rolcreaterole AND NOT r.rolcreatedb AND NOT r.rolreplication AND NOT r.rolbypassrls
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=r.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_database d WHERE d.datname=current_database() AND d.datdba=r.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE p.proowner=r.oid AND n.nspname IN ('public','super_user_security'))
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.relowner=r.oid AND n.nspname IN ('public','super_user_security'))
      THEN super_user_security.application_boundary_qualified() ELSE false END AS qualified FROM pg_catalog.pg_roles r WHERE r.rolname=session_user`)).rows[0];
    const history=(await client.query('SELECT migration_name,finished_at,rolled_back_at,checksum FROM public."_prisma_migrations" ORDER BY started_at')).rows;
    const migration=inspectHistory(history,root),checks=[];
    for(const [table,privileges]of Object.entries(requirements)){
      const qualified=`public."${table}"`,exists=(await client.query('SELECT to_regclass($1) IS NOT NULL AS exists',[qualified])).rows[0].exists;
      const missing=[];
      if(exists)for(const privilege of privileges)if(!(await client.query('SELECT has_table_privilege(current_user,$1,$2) AS allowed',[qualified,privilege])).rows[0].allowed)missing.push(privilege);
      checks.push({table,exists,missingPrivileges:missing});
    }
    const ready=checks.every(row=>row.exists&&!row.missingPrivileges.length);
    let protections=null;
    if(ready){
      protections=(await client.query(`SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public."OhmwardAttempt"'::regclass AND tgname='OhmwardAttempt_immutable' AND tgenabled='O' AND NOT tgisinternal) AS immutable_trigger,EXISTS(SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE i.indrelid='public."OhmwardAttempt"'::regclass AND c.relname='OhmwardAttempt_one_active' AND i.indisunique AND i.indisvalid AND i.indpred IS NOT NULL) AS unique_active_attempt,EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public."OhmwardAttempt"'::regclass AND conname='OhmwardAttempt_finalization_check' AND convalidated) AS finalization_constraint`)).rows[0];
      // Check PostgreSQL support for the analytics query forms without exposing learner records.
      await client.query(`SELECT DISTINCT ON ("studentId","levelId") "studentId","levelId",result FROM public."OhmwardAttempt" WHERE false ORDER BY "studentId","levelId","submittedAt" DESC,id DESC`);
      await client.query(`SELECT concept,COUNT(*) FROM (SELECT DISTINCT a.id,m.concept FROM public."OhmwardAttempt" a CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(a.result->'misconceptions')='array' THEN a.result->'misconceptions' ELSE '[]'::jsonb END) m(concept) WHERE false) occurrences GROUP BY concept`);
    }
    await client.query('ROLLBACK');
    const principalQualified=principal?.qualified===true;
    const featureReady=principalQualified&&ready&&Boolean(protections&&Object.values(protections).every(Boolean))&&migration.pending.length===0&&migration.failed.length===0&&migration.missing.length===0;
    return {targetFingerprint:createHash('sha256').update(identity).digest('hex').slice(0,16),featureEnabled:config.enabled,readOnly:true,principalQualified,migration,checks,protections,featureReady,ready:featureReady&&migration.changed.length===0};
  }finally{if(client){await client.query('ROLLBACK').catch(()=>{});client.release();}await pool.end();}
}
if(import.meta.url&&process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  checkDatabase().then(result=>{console.log(JSON.stringify(result,null,2));if(!result.ready)process.exitCode=1;}).catch(error=>{console.error('Ohmward database check failed:',error.code||'CHECK_FAILED');process.exitCode=1;});
}
