import fs from 'node:fs';
import { parse } from '../node_modules/.pnpm/dotenv@17.4.2/node_modules/dotenv/lib/main.js';
import { Client } from 'pg';
const env=parse(fs.readFileSync('.env'));
const url=new URL(env.DATABASE_URL);
if(['prefer','require','verify-ca'].includes(url.searchParams.get('sslmode')) && url.searchParams.get('uselibpqcompat')!=='true') url.searchParams.set('sslmode','verify-full');
const client=new Client({connectionString:url.href,connectionTimeoutMillis:12000,statement_timeout:10000});
try {
 await client.connect();
 const row=(await client.query(`SELECT has_schema_privilege(current_user,'super_user_security','CREATE') AS can_create_assignment_function, pg_has_role(current_user,p.proowner,'MEMBER') AS can_replace_mapping_guard, super_user_security.application_boundary_qualified() AS runtime_qualified FROM pg_proc p WHERE p.oid='public.academic_course_mapping_guard()'::regprocedure`)).rows[0];
 console.log(JSON.stringify(row));
} catch(e) { console.log(JSON.stringify({errorCode:e.code??'CONNECTION_FAILED'})); process.exitCode=1; }
finally { await client.end().catch(()=>{}); }
