// Targeted additive repair; never runs the full historical migration backlog.
import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';

const migration = '20261020140000_session_idle';
const sql = fs.readFileSync(new URL(`../prisma/migrations/${migration}/migration.sql`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const checksum = createHash('sha256').update(sql).digest('hex');
const preservation = `SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg((to_jsonb(s)-'lastSeenAt')::text,'' ORDER BY id),''),'UTF8')),'hex') AS digest FROM public."Session" s`;

export async function repairSessionIdle(client) {
  let stage='begin';
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s'");
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [migration]);
    stage='lock-session'; await client.query('LOCK TABLE public."Session" IN ACCESS EXCLUSIVE MODE');
    stage='preservation-baseline';
    const before = (await client.query(preservation)).rows[0];
    stage='migration-history'; const history = (await client.query('SELECT checksum,finished_at,rolled_back_at FROM public._prisma_migrations WHERE migration_name=$1', [migration])).rows;
    stage='column-inspection';
    const field = (await client.query(`SELECT format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull AS required,pg_get_expr(d.adbin,d.adrelid) AS default_value FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid='public."Session"'::regclass AND a.attname='lastSeenAt' AND NOT a.attisdropped`)).rows[0];
    if (history.length || field) {
      if (history.length !== 1 || history[0].checksum !== checksum || !history[0].finished_at || history[0].rolled_back_at || field?.type !== 'timestamp(3) without time zone' || !field.required || !/CURRENT_TIMESTAMP|now\(\)/i.test(field.default_value ?? '')) throw Error('Session schema/history requires explicit reconciliation');
      await client.query('ROLLBACK');
      return { status: 'ALREADY_APPLIED', migration, checksum, preservedSessions: before.count };
    }
    stage='apply-session-schema'; await client.query(sql);
    stage='verify-preservation';
    const after = (await client.query(preservation)).rows[0];
    if (before.count !== after.count || before.digest !== after.digest) throw Error('Existing session fields changed; rolling back');
    const invalid = (await client.query('SELECT count(*)::int AS count FROM public."Session" WHERE "lastSeenAt" IS DISTINCT FROM TIMESTAMP \'1970-01-01 00:00:00\'')).rows[0].count;
    if (invalid) throw Error('Existing sessions were not conservatively expired');
    stage='record-migration'; await client.query('INSERT INTO public._prisma_migrations(id,checksum,migration_name,started_at,finished_at,applied_steps_count) VALUES($1,$2,$3,clock_timestamp(),clock_timestamp(),1)', [randomUUID(),checksum,migration]);
    stage='commit'; await client.query('COMMIT');
    return { status: 'APPLIED', migration, checksum, preservedSessions: before.count, originalSessionFieldsPreserved: true };
  } catch (error) { if (stage==='commit') error.code='COMMIT_UNCERTAIN'; else await client.query('ROLLBACK').catch(()=>{}); error.repairStage=stage; throw error; }
}

async function hiddenOwnerInput() {
  console.log('Owner connection URL (hidden input; not saved):');
  if (!process.stdin.isTTY) throw Error('Interactive hidden input required');
  process.stdin.setRawMode(true); process.stdin.setEncoding('utf8'); process.stdin.resume();
  try {
    return await new Promise((resolve,reject)=>{
      let text='';
      const read = chunk => {
        if (chunk.includes('\u0003') || text.length+chunk.length>8192) { process.stdin.off('data',read); reject(Error('Owner input cancelled')); return; }
        text+=chunk;
        if (/[\r\n]/.test(text)) { process.stdin.off('data',read); resolve(text.split(/[\r\n]/)[0].trim()); }
      };
      process.stdin.on('data',read);
    });
  } finally { process.stdin.setRawMode(false); process.stdin.pause(); }
}

async function main() {
  if (!process.argv.includes('--apply') || !process.argv.includes('--owner-stdin')) throw Error('Explicit --apply --owner-stdin required');
  const env = { ...parseEnv(fs.readFileSync('.env','utf8')), ...parseEnv(fs.readFileSync('apps/web/.env.local','utf8')), ...process.env };
  const runtime = new URL(env.DATABASE_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL);
  const owner = new URL(await hiddenOwnerInput());
  if (owner.hostname !== runtime.hostname || owner.pathname !== runtime.pathname || owner.username === runtime.username || !['postgres:','postgresql:'].includes(owner.protocol)) throw Error('Owner must be a different principal on the configured exact database host/name');
  owner.searchParams.delete('uselibpqcompat'); owner.searchParams.set('sslmode','verify-full');
  const client = new Client({ connectionString:owner.href, ssl:{rejectUnauthorized:true}, connectionTimeoutMillis:10000, application_name:'lms-targeted-session-idle-repair' });
  try {
    await client.connect();
    const actual=(await client.query('SELECT current_database() AS db')).rows[0];
    if (actual.db !== decodeURIComponent(runtime.pathname.slice(1))) throw Error('Connected database identity mismatch');
    const role=(await client.query(`SELECT pg_get_userbyid(c.relowner) AS owner,pg_has_role(current_user,c.relowner,'USAGE') AS inherited,pg_has_role(current_user,c.relowner,'SET') AS may_set FROM pg_class c WHERE c.oid='public."Session"'::regclass`)).rows[0];
    if (!role.inherited && role.may_set) await client.query('SET ROLE '+ '"'+role.owner.replaceAll('"','""')+'"');
    const result=await repairSessionIdle(client);
    const report={...result,at:new Date().toISOString(),verifiedTLS:true,databaseFingerprint:createHash('sha256').update(runtime.hostname+'/'+actual.db).digest('hex')};
    const output=path.resolve('tmp/web-quality/session-idle-repair-result.json');
    fs.mkdirSync(path.dirname(output),{recursive:true}); fs.writeFileSync(output,JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));
  } finally { await client.end(); }
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) main().catch(error=>{ console.error(JSON.stringify({status:'FAILED',code:/^[A-Z0-9_]{1,40}$/.test(error.code ?? '')?error.code:'REPAIR_REFUSED',stage:error.repairStage,reason:/^(permission denied for (?:schema|table|function|relation) [A-Za-z0-9_ ."]+|must be owner of (?:table|relation) [A-Za-z0-9_"]+)$/.test(error.message)?error.message:undefined,message:'Repair failed or was refused; no raw connection string or database error logged.'})); process.exitCode=1; });
