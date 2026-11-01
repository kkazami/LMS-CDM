import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import { rootCertificates } from 'node:tls';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { configuration, databaseIdentity, poolOptions } from './ohmward/check-database.mjs';
import { inspectPrismaColumns } from './programming-coursework-database.mjs';
import { inspectQrGrace, upgradeQrGrace } from './attendance-qr-grace.mjs';

export const migrationName = '20261101000100_attendance';
const sql = fs.readFileSync(new URL(`../prisma/migrations/${migrationName}/migration.sql`, import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
export const checksum = hash(sql);
const checksums = new Set([sql, sql.replace(/\r\n/g, '\n'), sql.replace(/\r?\n/g, '\r\n')].map(hash));
const tables = ['AttendancePolicy', 'AttendanceSettings', 'AttendanceSession', 'AttendanceRecord', 'AttendanceRequest', 'AttendanceVerificationDetail', 'AttendanceEvent', 'AttendanceArrangement', 'AttendanceGrant', 'AttendanceJob'];
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const fail = message => { const error = new Error(message); error.safe = true; throw error; };

export async function inspectAttendance(client) {
  const missingPrismaColumns = await inspectPrismaColumns(client);
  const constraints = (await client.query(`SELECT count(*)::int n FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace
    WHERE n.nspname='public' AND c.convalidated AND c.conname=ANY($1::text[])`, [['AttendancePolicy_bounds', 'AttendanceSettings_limits', 'AttendanceSession_timing']])).rows[0].n;
  return { ready: !missingPrismaColumns.length && constraints === 3, missingPrismaColumns };
}

/** Only this reviewed additive migration and its receipt commit together. */
export async function upgradeAttendance(owner, runtimePrincipal) {
  await owner.query('BEGIN');
  try {
    await owner.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; SET LOCAL search_path=public,pg_catalog");
    await owner.query("SELECT pg_advisory_xact_lock(hashtextextended('lms-attendance-migration',0))");
    const runtime = (await owner.query(`SELECT NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication AND NOT rolbypassrls AS restricted,
      rolname<>session_user AS separate,has_schema_privilege(oid,'public','CREATE') AS can_create FROM pg_roles WHERE rolname=$1`, [runtimePrincipal])).rows[0];
    if (!runtime?.restricted || !runtime.separate || runtime.can_create) fail('A separate restricted runtime account without schema CREATE is required.');
    const state = await inspectAttendance(owner);
    const receipts = (await owner.query('SELECT checksum,finished_at,rolled_back_at FROM "_prisma_migrations" WHERE migration_name=$1', [migrationName])).rows;
    if (receipts.length) {
      if (receipts.length !== 1 || !checksums.has(receipts[0].checksum) || !receipts[0].finished_at || receipts[0].rolled_back_at || !state.ready) fail('Attendance migration history or schema needs reconciliation.');
      await owner.query('ROLLBACK');
      return { status: 'ALREADY_APPLIED', checksum };
    }
    if ((await owner.query('SELECT count(*)::int n FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL')).rows[0].n) fail('Resolve incomplete migrations before applying attendance.');
    if (state.missingPrismaColumns.some(name => !name.startsWith('Attendance') && name !== 'Institute.timezone')) fail('Unrelated schema drift must be resolved first.');
    const partial = (await owner.query(`SELECT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[]))
      OR EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname LIKE 'Attendance%')
      OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Institute' AND column_name='timezone') AS present`, [tables])).rows[0].present;
    if (partial) fail('Partial or unrecorded attendance schema; nothing was changed.');
    await owner.query('LOCK TABLE "Institute" IN ACCESS EXCLUSIVE MODE');
    const fingerprint = async () => (await owner.query(`SELECT md5(coalesce(string_agg((to_jsonb(i)-'timezone')::text,'' ORDER BY id),'')) AS digest FROM "Institute" i`)).rows[0].digest;
    const before = await fingerprint();
    // The migration has its own transaction; strip it so validation and receipt remain atomic.
    if (!/^\s*BEGIN;/.test(sql) || !/COMMIT;\s*$/.test(sql)) fail('Expected a transactional attendance migration.');
    await owner.query(sql.replace(/^\s*BEGIN;/, '').replace(/COMMIT;\s*$/, ''));
    await owner.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE ${tables.filter(t => t !== 'AttendanceEvent').map(t => 'public.' + quote(t)).join(',')} TO ${quote(runtimePrincipal)}`);
    await owner.query(`GRANT SELECT,INSERT,DELETE ON TABLE public."AttendanceEvent" TO ${quote(runtimePrincipal)}; REVOKE UPDATE ON TABLE public."AttendanceEvent" FROM ${quote(runtimePrincipal)}`);
    if (!(await inspectAttendance(owner)).ready || before !== await fingerprint()) fail('Attendance schema or institute preservation verification failed.');
    if ((await owner.query('SELECT count(*)::int n FROM "AttendancePolicy"')).rows[0].n) fail('Attendance rollout must remain disabled.');
    await owner.query(`INSERT INTO "_prisma_migrations"(id,checksum,finished_at,migration_name,started_at,applied_steps_count)
      VALUES($1,$2,CURRENT_TIMESTAMP,$3,CURRENT_TIMESTAMP,1)`, [randomUUID(), checksum, migrationName]);
    await owner.query('COMMIT');
    return { status: 'APPLIED', checksum, instituteRecordsPreserved: true, rolloutDisabled: true };
  } catch (error) { await owner.query('ROLLBACK').catch(() => {}); throw error; }
}

async function backupDatabase(ownerUrl, bin) {
  const executable = name => path.join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
  if (!bin || !path.isAbsolute(bin) || !fs.existsSync(executable('pg_dump')) || !fs.existsSync(executable('pg_restore'))) fail('Set ATTENDANCE_PG_BIN to a trusted PostgreSQL client bin directory.');
  const directory = path.resolve('tmp/attendance/private-upgrade-' + Date.now());
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (process.platform === 'win32') execFileSync('pwsh.exe', ['-NoProfile', '-Command', `$ErrorActionPreference='Stop'; $p=[Console]::In.ReadToEnd(); $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User; $acl=Get-Acl -LiteralPath $p; $acl.SetAccessRuleProtection($true,$false); $acl.SetAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')); Set-Acl -LiteralPath $p -AclObject $acl; $verified=Get-Acl -LiteralPath $p; if(-not $verified.AreAccessRulesProtected -or @($verified.Access | Where-Object {$_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value}).Count){throw 'Private backup ACL verification failed'}`], { input: directory, stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true });
  const target = new URL(ownerUrl);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
  const caBundle = path.join(directory, 'trusted-ca.pem');
  fs.writeFileSync(caBundle, rootCertificates.join('\n'), { mode: 0o600 });
  const address = (await lookup(target.hostname, { family: 4 })).address;
  const pgEnv = { ...process.env, PGHOST: target.hostname, PGHOSTADDR: address, PGPORT: target.port || '5432', PGDATABASE: decodeURIComponent(target.pathname.slice(1)), PGUSER: decodeURIComponent(target.username), PGPASSWORD: decodeURIComponent(target.password), PGSSLMODE: local ? 'disable' : 'verify-full', PGSSLROOTCERT: caBundle, PGCONNECT_TIMEOUT: '15' };
  const backup = path.join(directory, 'before-upgrade.dump');
  try {
    execFileSync(executable('pg_dump'), ['--format=custom', '--no-owner', '--no-privileges', '--file', backup], { env: pgEnv, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true, timeout: 180000 });
    execFileSync(executable('pg_restore'), ['--list', backup], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true, timeout: 30000 });
  } catch { fail('The private backup failed; no migration was applied. Database details were withheld.'); }
  if (!fs.statSync(backup).size) fail('The backup is empty; no migration was applied.');
  return directory;
}

async function main() {
  const mode = process.argv[2] || '--check';
  if (process.argv.length > 3 || !['--check', '--apply'].includes(mode)) fail('Use --check or --apply.');
  const root = fileURLToPath(new URL('../', import.meta.url));
  const config = configuration(root);
  if (config.cli && databaseIdentity(config.cli) !== databaseIdentity(config.runtime)) fail('Root Prisma and web runtime databases differ.');
  const runtime = new Pool(poolOptions(config.runtime));
  let owner;
  try {
    let result;
    if (mode === '--apply') {
      const read = file => fs.existsSync(path.join(root, file)) ? parseEnv(fs.readFileSync(path.join(root, file), 'utf8')) : {};
      const local = { ...read('.env'), ...read('apps/web/.env'), ...read('apps/web/.env.local'), ...process.env };
      const ownerUrl = local.ATTENDANCE_MIGRATION_DATABASE_URL;
      if (!ownerUrl) fail('Configure ATTENDANCE_MIGRATION_DATABASE_URL with a separate database owner connection.');
      if (databaseIdentity(ownerUrl) !== databaseIdentity(config.runtime)) fail('Owner and runtime connections must target the same database.');
      owner = new Pool(poolOptions(ownerUrl));
      const client = await owner.connect();
      try {
        const identity = async db => (await db.query('SELECT current_database() AS database,current_user AS principal')).rows[0];
        const [a, b] = await Promise.all([identity(client), identity(runtime)]);
        if (a.database !== b.database || a.principal === b.principal) fail('Separate owner and runtime principals for the same database are required.');
        const before = (await runtime.query('SELECT super_user_security.application_boundary_qualified() AS qualified')).rows[0].qualified;
        if (!before) fail('The runtime security boundary is not qualified.');
        const directory = await backupDatabase(ownerUrl, local.ATTENDANCE_PG_BIN);
        result = await upgradeAttendance(client, b.principal);
        result = { ...result, qrGrace: await upgradeQrGrace(client) };
        const grants = (await runtime.query(`SELECT bool_and(has_table_privilege(current_user,'public.'||quote_ident(t),p)) AS ok FROM unnest($1::text[]) t CROSS JOIN unnest(ARRAY['SELECT','INSERT','DELETE']) p`, [tables])).rows[0].ok;
        const boundary = (await runtime.query(`SELECT super_user_security.application_boundary_qualified() AS qualified,has_table_privilege(current_user,'public."AttendanceEvent"','UPDATE') AS audit_edits`)).rows[0];
        if (!grants || !boundary.qualified || boundary.audit_edits) fail('Migration committed; runtime permission verification needs review.');
        const receipt = { ...result, privateBackupVerified: true, runtimeGrantsVerified: true, securityBoundaryPreserved: true, verifiedAt: new Date().toISOString() };
        fs.writeFileSync(path.join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2), { mode: 0o600 });
        console.log(JSON.stringify({ ...receipt, privateBackup: path.relative(root, directory) }));
      } finally { client.release(); }
    }
    const client = await runtime.connect();
    try {
      await client.query('BEGIN READ ONLY');
      const state = await inspectAttendance(client);
      const qrGraceReady = await inspectQrGrace(client);
      await client.query('ROLLBACK');
      console.log(JSON.stringify({ ...state, qrGraceReady, checkedAt: new Date().toISOString() }));
      if (!state.ready || !qrGraceReady) process.exitCode = 1;
    } finally { client.release(); }
  } finally { await Promise.allSettled([runtime.end(), owner?.end()]); }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch(error => {
  console.error(JSON.stringify({ status: 'ATTENDANCE_DATABASE_NOT_READY', code: /^[A-Z0-9_]{1,40}$/.test(error.code || '') ? error.code : 'CHECK_FAILED', ...(error.safe ? { message: error.message } : {}) }));
  process.exitCode = 1;
});
