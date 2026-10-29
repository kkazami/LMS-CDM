// Remove only an accidental runtime CREATE grant; never relax session admission checks.
import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';

const source = fs.readFileSync(new URL('../prisma/super-user-v1/current-target-security.sql', import.meta.url), 'utf8');
const expectedBody = source.split('CREATE FUNCTION super_user_security.application_boundary_qualified()')[1].split('$$;')[0].split('$$')[1];
const normalize = value => value.replace(/\s+/g, ' ').trim();
const identifier = value => '"' + value.replaceAll('"', '""') + '"';
const expectedTriggers = ['super_user_guard', 'operator_audit_guard', 'privileged_session_guard'];

export async function repairRuntimeSchemaPermission(owner, runtimePrincipal) {
  if (typeof runtimePrincipal !== 'string' || !runtimePrincipal || Buffer.byteLength(runtimePrincipal) > 63) throw Error('Invalid runtime principal.');
  let committing = false;
  await owner.query('BEGIN');
  try {
    await owner.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='10s'");
    await owner.query("SELECT pg_advisory_xact_lock(hashtextextended('lms-runtime-schema-permission-repair',0))");
    const fn = (await owner.query(`SELECT p.prosrc,p.prosecdef,p.proconfig FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='super_user_security' AND p.proname='application_boundary_qualified' AND p.pronargs=0`)).rows;
    if (fn.length !== 1 || !fn[0].prosecdef || normalize(fn[0].prosrc) !== normalize(expectedBody)
      || !fn[0].proconfig?.includes('search_path=pg_catalog, super_user_security')) throw Error('Unexpected security function; reconciliation required.');
    const target = (await owner.query(`SELECT r.oid,r.rolname<>session_user AS separate_principal,has_schema_privilege(r.oid,'public','CREATE') AS can_create,
      NOT r.rolsuper AND NOT r.rolcreaterole AND NOT r.rolcreatedb AND NOT r.rolreplication AND NOT r.rolbypassrls AS restricted
      FROM pg_catalog.pg_roles r WHERE r.rolname=$1`, [runtimePrincipal])).rows[0];
    if (!target?.restricted || !target.separate_principal) throw Error('An existing separate restricted runtime principal is required.');
    const binding = (await owner.query(`SELECT kind,enabled,length(qualification_reference)>0 AS referenced FROM super_user_security.writer_bindings WHERE principal=$1`, [runtimePrincipal])).rows;
    if (binding.length !== 1 || binding[0].kind !== 'APPLICATION' || !binding[0].enabled || !binding[0].referenced) throw Error('Existing application qualification binding required.');
    const guards = async () => (await owner.query(`SELECT t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition FROM pg_catalog.pg_trigger t WHERE t.tgname=ANY($1::text[]) AND NOT t.tgisinternal ORDER BY t.tgname`, [expectedTriggers])).rows;
    const before = await guards();
    if (before.length !== 3 || before.some(guard => guard.tgenabled !== 'A')) throw Error('Existing always-enabled security guards required.');
    const qualifiedForTarget = async () => (await owner.query(expectedBody.replaceAll('session_user', '$1::name'), [runtimePrincipal])).rows[0]?.exists === true;
    if (!target.can_create) {
      if (!await qualifiedForTarget()) throw Error('Another qualification requirement is failing.');
      await owner.query('ROLLBACK');
      return { status: 'ALREADY_RESTRICTED', securityGuardsPreserved: true };
    }
    const direct = (await owner.query(`SELECT a.is_grantable FROM pg_catalog.pg_namespace n CROSS JOIN LATERAL aclexplode(n.nspacl) a WHERE n.nspname='public' AND a.privilege_type='CREATE' AND a.grantee=$1::oid`, [target.oid])).rows;
    if (!direct.length || direct.some(grant => grant.is_grantable)) throw Error('Only a direct CREATE grant without grant option may be repaired.');
    await owner.query(`REVOKE CREATE ON SCHEMA public FROM ${identifier(runtimePrincipal)} RESTRICT`);
    if (!await qualifiedForTarget()) throw Error('Another qualification requirement is failing; grant change rolled back.');
    if (JSON.stringify(before) !== JSON.stringify(await guards())) throw Error('Security guards changed; rolling back.');
    committing = true;
    await owner.query('COMMIT');
    return { status: 'APPLIED', removedOnlyRuntimePublicSchemaCreate: true, securityGuardsPreserved: true };
  } catch (error) {
    if (committing) error.code = 'COMMIT_UNCERTAIN';
    else await owner.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

const envFile = file => fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {};
const connection = config => config.DATABASE_URL || config.POSTGRES_PRISMA_URL || config.POSTGRES_URL;
function clientFor(url) {
  const target = new URL(url);
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) throw Error('PostgreSQL connection required.');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) { target.searchParams.delete('uselibpqcompat'); target.searchParams.set('sslmode', 'verify-full'); }
  return new Client({ connectionString: target.href, connectionTimeoutMillis: 10000, query_timeout: 15000, application_name: 'lms-runtime-schema-permission-repair' });
}
async function hiddenOwnerInput() {
  if (!process.stdin.isTTY) throw Error('Interactive hidden input required.');
  process.stdin.setRawMode(true); process.stdin.setEncoding('utf8'); process.stdin.resume();
  console.log('Owner connection URL (hidden input; not saved):');
  try {
    return await new Promise((resolve, reject) => {
      let value = '';
      const read = chunk => {
        if (chunk.includes('\u0003') || value.length + chunk.length > 8192) {
          process.stdin.off('data', read); reject(Error('Owner input cancelled.')); return;
        }
        value += chunk;
        if (/[\r\n]/.test(value)) { process.stdin.off('data', read); resolve(value.split(/[\r\n]/)[0].trim()); }
      };
      process.stdin.on('data', read);
    });
  } finally { process.stdin.setRawMode(false); process.stdin.pause(); }
}
async function main() {
  const args = process.argv.slice(2);
  const index = args.indexOf('--owner-env');
  const stdin = args.includes('--owner-stdin');
  if (!args.includes('--apply') || stdin && index >= 0 || !stdin && (index < 0 || !args[index + 1] || args[index + 1].startsWith('--'))) throw Error('Explicit --apply and one owner input source required.');
  const runtimeURL = new URL(connection({ ...envFile('.env'), ...envFile('apps/web/.env.local'), ...process.env }));
  const ownerURL = new URL(stdin ? await hiddenOwnerInput() : connection(envFile(args[index + 1])));
  if (runtimeURL.hostname !== ownerURL.hostname || runtimeURL.pathname !== ownerURL.pathname || runtimeURL.username === ownerURL.username) throw Error('Owner and runtime must be separate principals on the same configured database.');
  const owner = clientFor(ownerURL.href), runtime = clientFor(runtimeURL.href);
  const report = { startedAt: new Date().toISOString(), status: 'NOT_APPLIED' };
  try {
    await runtime.connect(); await owner.connect();
    const identity = async client => (await client.query('SELECT current_database() AS db,session_user AS principal')).rows[0];
    const a = await identity(runtime), b = await identity(owner);
    if (a.db !== b.db || a.principal === b.principal || a.principal !== decodeURIComponent(runtimeURL.username) || b.principal !== decodeURIComponent(ownerURL.username)) throw Error('Connected database or principal mismatch.');
    report.databaseFingerprint = createHash('sha256').update(runtimeURL.hostname + '/' + a.db).digest('hex');
    Object.assign(report, await repairRuntimeSchemaPermission(owner, a.principal));
    const actual = (await runtime.query('SELECT super_user_security.application_boundary_qualified() AS qualified,NOT has_schema_privilege(session_user,\'public\',\'CREATE\') AS create_denied')).rows[0];
    report.runtimeVerified = actual.qualified === true && actual.create_denied === true;
    if (!report.runtimeVerified) { report.status = 'APPLIED_REQUIRES_RECONCILIATION'; throw Error('Post-commit runtime verification failed.'); }
  } catch (error) {
    if (error.code === 'COMMIT_UNCERTAIN') report.status = 'COMMIT_UNCERTAIN_RECONCILE';
    else if (report.status === 'NOT_APPLIED') report.status = 'REFUSED';
    report.code = /^[A-Z0-9_]{1,40}$/.test(error.code || '') ? error.code : 'REPAIR_REFUSED';
    process.exitCode = 1;
  } finally {
    await owner.end().catch(() => {}); await runtime.end().catch(() => {});
    report.finishedAt = new Date().toISOString();
    fs.mkdirSync('tmp/lms-system-review', { recursive: true });
    fs.writeFileSync(path.join('tmp/lms-system-review', `runtime-permission-repair-${Date.now()}.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => { console.error('Repair could not start. Check the protected owner-file path and database identity; no credentials logged.'); process.exitCode = 1; });
