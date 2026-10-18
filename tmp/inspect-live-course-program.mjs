import fs from 'node:fs';
import { parse } from '../node_modules/.pnpm/dotenv@17.4.2/node_modules/dotenv/lib/main.js';
import { createHash } from 'node:crypto';
import { Client } from 'pg';
const sources = ['.env', 'apps/web/.env.local'];
for (const file of sources) {
  if (!fs.existsSync(file)) continue;
  const env = parse(fs.readFileSync(file));
  const keys = Object.keys(env).filter(k => /DATABASE|POSTGRES|DIRECT_URL|PGHOST|PGUSER/.test(k));
  console.log(JSON.stringify({source:file,configuredKeys:keys}));
  for (const key of ['DATABASE_URL','POSTGRES_PRISMA_URL','POSTGRES_URL'].filter(k => env[k])) {
  let client;
  try {
    const url = new URL(env[key]);
    const mode = url.searchParams.get('sslmode');
    if (url.searchParams.get('uselibpqcompat') !== 'true' && ['prefer','require','verify-ca'].includes(mode)) url.searchParams.set('sslmode','verify-full');
    client = new Client({connectionString:url.href,connectionTimeoutMillis:12000,statement_timeout:10000});
    await client.connect();
    const identity = (await client.query(`SELECT current_database() AS database, current_user AS principal, r.rolsuper, r.rolcreaterole, r.rolcreatedb, to_regnamespace('super_user_security') IS NOT NULL AS boundary_exists, to_regprocedure('public.academic_course_mapping_guard()') IS NOT NULL AS mapping_guard_exists, to_regprocedure('super_user_security.set_course_program(text,text,text,text)') IS NOT NULL AS assignment_exists FROM pg_roles r WHERE r.rolname=current_user`)).rows[0];
    const fingerprint = createHash('sha256').update(url.hostname.replace('-pooler','')+'|'+identity.database).digest('hex').slice(0,16);
    delete identity.database;
    if (identity.boundary_exists) {
      try { identity.bindings = (await client.query('SELECT kind,enabled,count(*)::int AS count FROM super_user_security.writer_bindings GROUP BY kind,enabled ORDER BY kind,enabled')).rows; } catch(e) { identity.bindingsReadCode=e.code; }
    }
    console.log(JSON.stringify({source:file,key,fingerprint,...identity}));
  } catch(e) { console.log(JSON.stringify({source:file,key,errorCode:e.code??'CONNECTION_FAILED'})); process.exitCode=1; }
  finally { if(client) await client.end().catch(()=>{}); }
}
}
