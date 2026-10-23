import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';

/** Additive only: preserves existing accounts, enrollments, grants and security functions. */
export async function installStudentRegistration(owner) {
  await owner.query('BEGIN');
  try {
    await owner.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='15s'");
    const guards = async () => (await owner.query(`SELECT t.oid,t.tgenabled,pg_get_triggerdef(t.oid) definition FROM pg_trigger t WHERE t.tgrelid IN ('public."User"'::regclass,'public."Session"'::regclass) AND NOT t.tgisinternal ORDER BY t.oid`)).rows;
    const before = await guards();
    await owner.query(fs.readFileSync(new URL('../prisma/migrations/20261023090000_student_self_registration/migration.sql', import.meta.url), 'utf8'));
    const column = (await owner.query(`SELECT data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='User' AND column_name='googleSubject'`)).rows[0];
    const unique = (await owner.query(`SELECT i.indisunique AND i.indisvalid AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnkeyatts=1 AND a.attname='googleSubject' AS valid FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=i.indkey[0] WHERE i.indexrelid=to_regclass('public."User_googleSubject_key"')`)).rows[0]?.valid;
    if (column?.data_type !== 'text' || column.is_nullable !== 'YES' || unique !== true || JSON.stringify(before) !== JSON.stringify(await guards())) throw Error('Unexpected schema or security guard change.');
    await owner.query('COMMIT');
    return { status: 'APPLIED', nullableGoogleSubject: true, uniqueGoogleSubject: true, securityGuardsPreserved: true };
  } catch (error) { await owner.query('ROLLBACK').catch(() => {}); throw error; }
}
const envFile = file => fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {};
const connection = env => env.DATABASE_URL || env.POSTGRES_PRISMA_URL || env.POSTGRES_URL;
function clientFor(connectionString) {
  const target = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) throw Error('PostgreSQL required.');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) { target.searchParams.delete('uselibpqcompat'); target.searchParams.set('sslmode', 'verify-full'); }
  return new Client({ connectionString: target.href, connectionTimeoutMillis: 10000, query_timeout: 20000, application_name: 'lms-student-registration-migration' });
}
async function hiddenOwnerInput() {
  if (!process.stdin.isTTY) throw Error('Hidden interactive input required.');
  process.stdin.setRawMode(true); process.stdin.setEncoding('utf8'); process.stdin.resume();
  console.log('Owner connection URL (hidden; never saved):');
  try {
    return await new Promise((resolve, reject) => {
      let value = '';
      const read = chunk => {
        if (chunk.includes('\u0003') || value.length + chunk.length > 8192) { process.stdin.off('data', read); reject(Error('Cancelled.')); return; }
        value += chunk;
        if (/[\r\n]/.test(value)) { process.stdin.off('data', read); resolve(value.split(/[\r\n]/)[0].trim()); }
      };
      process.stdin.on('data', read);
    });
  } finally { process.stdin.setRawMode(false); process.stdin.pause(); }
}
async function main() {
  if (!process.argv.includes('--apply') || !process.argv.includes('--owner-stdin')) throw Error('Explicit --apply --owner-stdin required.');
  const runtimeURL = new URL(connection({ ...envFile('.env'), ...envFile('apps/web/.env.local'), ...process.env }));
  const ownerURL = new URL(await hiddenOwnerInput());
  if (runtimeURL.hostname !== ownerURL.hostname || runtimeURL.pathname !== ownerURL.pathname || runtimeURL.username === ownerURL.username) throw Error('Separate principals on the same configured database required.');
  const owner = clientFor(ownerURL.href), runtime = clientFor(runtimeURL.href);
  const report = { startedAt: new Date().toISOString(), status: 'NOT_APPLIED' };
  try {
    await owner.connect(); await runtime.connect();
    const identity = async client => (await client.query('SELECT current_database() db,session_user principal')).rows[0];
    const a = await identity(owner), b = await identity(runtime);
    if (a.db !== b.db || a.principal === b.principal || a.principal !== decodeURIComponent(ownerURL.username) || b.principal !== decodeURIComponent(runtimeURL.username)) throw Error('Connected target mismatch.');
    const qualified = async () => (await runtime.query('SELECT super_user_security.application_boundary_qualified() qualified')).rows[0].qualified;
    if (!await qualified()) throw Error('Existing runtime boundary is not qualified.');
    Object.assign(report, await installStudentRegistration(owner));
    await runtime.query('SELECT "googleSubject" FROM public."User" LIMIT 0');
    report.runtimeVerified = await qualified();
    if (!report.runtimeVerified) throw Error('Post-migration boundary verification failed.');
  } catch (error) { report.status = report.status === 'APPLIED' ? 'APPLIED_REQUIRES_VERIFICATION' : 'REFUSED'; report.code = /^[A-Z0-9_]{1,40}$/.test(error.code || '') ? error.code : 'MIGRATION_UNAVAILABLE'; process.exitCode = 1; }
  finally {
    await owner.end().catch(() => {}); await runtime.end().catch(() => {});
    report.finishedAt = new Date().toISOString(); fs.mkdirSync('tmp/student-registration', { recursive: true });
    fs.writeFileSync(path.join('tmp/student-registration', `migration-${Date.now()}.json`), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => { console.error('Migration could not start; no credentials logged.'); process.exitCode = 1; });
