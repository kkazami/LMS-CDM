// Applies this additive migration only. Existing migration history is never replayed.
import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';
import { lookup } from 'node:dns/promises';
import { rootCertificates } from 'node:tls';

export const migrationName = '20261026100000_gradebook_periods';
const sql = fs.readFileSync(new URL(`../prisma/migrations/${migrationName}/migration.sql`, import.meta.url));
export const checksum = createHash('sha256').update(sql).digest('hex');
const tables = ['CourseGradebookPolicy', 'ClassworkGradingPeriod'];
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const fail = message => { const error = new Error(message); error.safe = true; throw error; };

export async function upgradeGradebookPeriods(owner, runtimePrincipal) {
  await owner.query('BEGIN');
  try {
    await owner.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; SET LOCAL search_path=public,pg_catalog");
    await owner.query("SELECT pg_advisory_xact_lock(hashtextextended('lms-gradebook-periods-migration',0))");
    const runtime = (await owner.query(`SELECT NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolbypassrls AS restricted,rolname<>session_user AS separate,has_schema_privilege(oid,'public','CREATE') AS can_create FROM pg_roles WHERE rolname=$1`, [runtimePrincipal])).rows[0];
    if (!runtime?.restricted || !runtime.separate || runtime.can_create) fail('A separate restricted runtime account without schema CREATE is required.');
    const receipts = (await owner.query('SELECT checksum,finished_at,rolled_back_at FROM "_prisma_migrations" WHERE migration_name=$1', [migrationName])).rows;
    if (receipts.length) {
      if (receipts.length !== 1 || receipts[0].checksum !== checksum || !receipts[0].finished_at || receipts[0].rolled_back_at) fail('Migration history does not match the reviewed upgrade.');
      await owner.query('ROLLBACK'); return { status: 'ALREADY_APPLIED', checksum };
    }
    if ((await owner.query('SELECT count(*)::int n FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL')).rows[0].n) fail('An earlier migration is incomplete; nothing was changed.');
    if ((await owner.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1::text[])", [tables])).rows[0].n) fail('Partial period tables exist without a matching migration receipt.');
    await owner.query('LOCK TABLE "Course", "SyllabusItem", "StudentSubmission" IN SHARE MODE');
    const fingerprint = async () => (await owner.query(`SELECT (SELECT count(*)::int FROM "SyllabusItem") AS items,(SELECT count(*)::int FROM "StudentSubmission") AS submissions,(SELECT md5(coalesce(string_agg(row_to_json(s)::text,'' ORDER BY s.id),'')) FROM "StudentSubmission" s) AS scores`)).rows[0];
    const before = await fingerprint();
    await owner.query(sql.toString('utf8'));
    await owner.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE ${tables.map(name => 'public.' + quote(name)).join(',')} TO ${quote(runtimePrincipal)}`);
    if (JSON.stringify(before) !== JSON.stringify(await fingerprint())) fail('Academic preservation verification failed; the upgrade was rolled back.');
    await owner.query('INSERT INTO "_prisma_migrations"(id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES($1,$2,CURRENT_TIMESTAMP,$3,CURRENT_TIMESTAMP,1)', [randomUUID(), checksum, migrationName]);
    await owner.query('COMMIT'); return { status: 'APPLIED', checksum, academicRecordsPreserved: true };
  } catch (error) { await owner.query('ROLLBACK').catch(() => {}); throw error; }
}

function connection(value) {
  const target = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) fail('A PostgreSQL URL is required.');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) { target.searchParams.delete('uselibpqcompat'); target.searchParams.set('sslmode', 'verify-full'); }
  return new Client({ connectionString: target.href, connectionTimeoutMillis: 10000, application_name: 'lms-gradebook-periods-upgrade' });
}
async function main() {
  if (process.argv.slice(2).join(' ') !== '--apply') fail('Use node scripts/upgrade-gradebook-periods.mjs --apply after the local migration rehearsal passes.');
  const read = file => fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {};
  const config = { ...read('.env'), ...read('apps/web/.env.local'), ...process.env };
  const runtimeUrl = config.DATABASE_URL || config.POSTGRES_PRISMA_URL || config.POSTGRES_URL;
  const ownerUrl = config.GRADEBOOK_MIGRATION_DATABASE_URL;
  if (!ownerUrl || !runtimeUrl) fail('Configure GRADEBOOK_MIGRATION_DATABASE_URL locally; keep the runtime account restricted.');
  const target = new URL(ownerUrl), runtimeTarget = new URL(runtimeUrl);
  const host = url => url.hostname.replace('-pooler.', '.');
  if (host(target) !== host(runtimeTarget) || target.pathname !== runtimeTarget.pathname || target.port !== runtimeTarget.port) fail('The migration account must target the configured LMS database.');
  const owner = connection(ownerUrl), runtime = connection(runtimeUrl);
  try {
    await Promise.all([owner.connect(), runtime.connect()]);
    const identity = async client => (await client.query('SELECT current_database() AS db,current_user AS principal')).rows[0];
    const [a, b] = await Promise.all([identity(owner), identity(runtime)]);
    if (a.db !== b.db || a.principal === b.principal) fail('Separate migration and runtime accounts to the same database are required.');
    const bin = config.GRADEBOOK_PG_BIN;
    if (!bin || !path.isAbsolute(bin) || !fs.existsSync(path.join(bin, 'pg_dump.exe'))) fail('Set GRADEBOOK_PG_BIN to the verified PostgreSQL bin directory for the pre-upgrade backup.');
    const directory = path.resolve('tmp/gradebook/private-upgrade-' + Date.now());
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (process.platform === 'win32') execFileSync('pwsh.exe', ['-NoProfile', '-Command', `$ErrorActionPreference='Stop'; $p=[Console]::In.ReadToEnd(); $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User; $acl=Get-Acl -LiteralPath $p; $acl.SetAccessRuleProtection($true,$false); $acl.SetAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')); Set-Acl -LiteralPath $p -AclObject $acl; $verified=Get-Acl -LiteralPath $p; if(-not $verified.AreAccessRulesProtected -or @($verified.Access | Where-Object {$_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value}).Count){throw 'Private backup ACL verification failed'}`], { input: directory, stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
    const backup = path.join(directory, 'before-upgrade.dump');
    const caBundle = path.join(directory, 'trusted-ca.pem'); fs.writeFileSync(caBundle, rootCertificates.join('\n'));
    const address = (await lookup(target.hostname, { family: 4 })).address;
    const pgEnv = { ...process.env, PGHOST: target.hostname, PGHOSTADDR: address, PGPORT: target.port || '5432', PGDATABASE: decodeURIComponent(target.pathname.slice(1)), PGUSER: decodeURIComponent(target.username), PGPASSWORD: decodeURIComponent(target.password), PGSSLMODE: 'verify-full', PGSSLROOTCERT: caBundle, PGCONNECT_TIMEOUT: '15' };
    try { execFileSync(path.join(bin, 'pg_dump.exe'), ['--format=custom', '--no-owner', '--no-privileges', '--file', backup], { env: pgEnv, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true, timeout: 180000 }); }
    catch (error) {
      const detail = String(error.stderr || error.code || 'Backup command failed').replaceAll(decodeURIComponent(target.password), '[redacted]').replaceAll(target.password, '[redacted]').replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted connection]').slice(0, 800);
      fail('The private backup failed before migration: ' + detail);
    }
    execFileSync(path.join(bin, 'pg_restore.exe'), ['--list', backup], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    const result = await upgradeGradebookPeriods(owner, b.principal);
    const grants = (await runtime.query(`SELECT bool_and(has_table_privilege(current_user,'public.'||quote_ident(t),p)) AS ok FROM unnest($1::text[]) t CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) p`, [tables])).rows[0].ok;
    if (!grants) fail('The upgrade committed but runtime grants require review.');
    fs.writeFileSync(path.join(directory, 'receipt.json'), JSON.stringify({ ...result, runtimeGrantsVerified: true, backupVerified: fs.statSync(backup).size > 0 }, null, 2));
    console.log(JSON.stringify({ ...result, runtimeGrantsVerified: true, privateBackup: path.relative(process.cwd(), directory) }));
  } finally { await Promise.allSettled([owner.end(), runtime.end()]); }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch(error => { console.error(error.safe ? error.message : 'The gradebook upgrade could not complete. Connection details and database payloads were withheld.'); process.exitCode = 1; });
