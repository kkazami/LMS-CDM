// Applies only the reviewed additive lab migration; never replays historical migrations.
import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';

export const migrationName = '20261025140000_guided_practical_labs';
const migrationBytes = fs.readFileSync(new URL(`../prisma/migrations/${migrationName}/migration.sql`, import.meta.url));
export const migrationChecksum = createHash('sha256').update(migrationBytes).digest('hex');
const tables = ['LabTemplate', 'LabTemplateVersion', 'LabStep', 'LabAssignment', 'LabAttempt', 'LabStepResponse', 'LabSubmission', 'LabEvidence', 'LabSubmissionEvidence', 'LabReview'];
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const refuse = message => { const error = new Error(message); error.safe = true; throw error; };

export async function upgradeGuidedLabs(owner, runtimePrincipal) {
  await owner.query('BEGIN');
  try {
    await owner.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; SET LOCAL search_path=public,pg_catalog");
    await owner.query("SELECT pg_advisory_xact_lock(hashtextextended('lms-guided-labs-migration',0))");
    const runtime = (await owner.query(`SELECT rolname,NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolbypassrls AS restricted,
      rolname<>session_user AS separate,has_schema_privilege(oid,'public','CREATE') AS can_create FROM pg_roles WHERE rolname=$1`, [runtimePrincipal])).rows[0];
    if (!runtime?.restricted || !runtime.separate || runtime.can_create) refuse('A separate restricted runtime principal without schema CREATE is required.');
    const receipts = await owner.query(`SELECT checksum,finished_at,rolled_back_at FROM "_prisma_migrations" WHERE migration_name=$1`, [migrationName]);
    if (receipts.rows.length) {
      if (receipts.rows.length !== 1 || receipts.rows[0].checksum !== migrationChecksum || !receipts.rows[0].finished_at || receipts.rows[0].rolled_back_at) refuse('Migration history needs reconciliation; nothing was changed.');
      await owner.query('ROLLBACK');
      return { status: 'ALREADY_APPLIED', checksum: migrationChecksum };
    }
    const pending = (await owner.query('SELECT count(*)::int n FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL')).rows[0].n;
    if (pending) refuse('Resolve the existing incomplete migration before applying this upgrade.');
    const existing = (await owner.query(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1::text[])`, [tables])).rows[0].n;
    const provenance = (await owner.query(`SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('SyllabusItem','StudentSubmission') AND column_name='workHistoryState'`)).rows[0].n;
    if (existing || provenance) refuse('Unrecorded or partial lab schema detected; nothing was changed.');
    await owner.query('LOCK TABLE "SyllabusItem", "StudentSubmission" IN ACCESS EXCLUSIVE MODE');
    const counts = async () => (await owner.query('SELECT (SELECT count(*)::int FROM "SyllabusItem") AS items,(SELECT count(*)::int FROM "StudentSubmission") AS submissions')).rows[0];
    const before = await counts();
    await owner.query(migrationBytes.toString('utf8'));
    await owner.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE ${tables.map(name => 'public.' + quote(name)).join(',')} TO ${quote(runtimePrincipal)}`);
    await owner.query(`GRANT SELECT,INSERT ON TABLE public."SubmissionRequest" TO ${quote(runtimePrincipal)}`);
    if (JSON.stringify(before) !== JSON.stringify(await counts())) refuse('Academic record counts changed; upgrade rolled back.');
    const unknown = (await owner.query(`SELECT (SELECT count(*)::int FROM "SyllabusItem" WHERE "workHistoryState"<>'UNKNOWN') + (SELECT count(*)::int FROM "StudentSubmission" WHERE "workHistoryState"<>'UNKNOWN') AS n`)).rows[0].n;
    if (unknown) refuse('Historical provenance was not preserved; upgrade rolled back.');
    await owner.query(`INSERT INTO "_prisma_migrations"(id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES($1,$2,CURRENT_TIMESTAMP,$3,CURRENT_TIMESTAMP,1)`, [randomUUID(), migrationChecksum, migrationName]);
    await owner.query('COMMIT');
    return { status: 'APPLIED', checksum: migrationChecksum, existingAcademicRecordsPreserved: true };
  } catch (error) {
    await owner.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

function connect(url) {
  const target = new URL(url);
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) refuse('PostgreSQL connection required.');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
    target.searchParams.delete('uselibpqcompat'); target.searchParams.set('sslmode', 'verify-full');
  }
  return new Client({ connectionString: target.href, connectionTimeoutMillis: 10000, application_name: 'lms-guided-labs-upgrade' });
}
async function main() {
  if (process.argv.slice(2).join(' ') !== '--apply') refuse('Usage: LAB_MIGRATION_DATABASE_URL=<owner URL> node scripts/upgrade-guided-practical-labs.mjs --apply');
  const env = file => fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {};
  const config = { ...env('.env'), ...env('apps/web/.env.local') };
  const runtimeUrl = config.DATABASE_URL || config.POSTGRES_PRISMA_URL || config.POSTGRES_URL;
  const ownerUrl = process.env.LAB_MIGRATION_DATABASE_URL;
  if (!ownerUrl || !runtimeUrl) refuse('A migration connection and the existing runtime connection are required.');
  const a = new URL(ownerUrl), b = new URL(runtimeUrl);
  const host = url => url.hostname.replace('-pooler.', '.');
  if (host(a) !== host(b) || a.pathname !== b.pathname || a.port !== b.port) refuse('Migration connection does not target the configured LMS database.');
  const owner = connect(ownerUrl), runtime = connect(runtimeUrl);
  try {
    await Promise.all([owner.connect(), runtime.connect()]);
    const identity = async client => (await client.query('SELECT current_database() AS db,current_user AS principal')).rows[0];
    const [migration, application] = await Promise.all([identity(owner), identity(runtime)]);
    if (migration.db !== application.db || migration.principal === application.principal) refuse('Separate migration and runtime connections to the same database are required.');
    const result = await upgradeGuidedLabs(owner, application.principal);
    const ready = (await runtime.query(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public' AND table_name=ANY($1::text[])`, [tables])).rows[0].n;
    const grants = (await runtime.query(`SELECT bool_and(has_table_privilege(current_user,'public.'||quote_ident(t),p)) AS ok FROM unnest($1::text[]) t CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) p`, [tables])).rows[0].ok;
    if (ready !== tables.length || !grants) refuse('Upgrade committed, but runtime verification failed; reconcile before enabling labs.');
    console.log(JSON.stringify({ ...result, runtimeVerified: true, runtimeSchemaCreate: false }));
  } finally { await Promise.all([owner.end().catch(() => {}), runtime.end().catch(() => {})]); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(JSON.stringify({ status: 'UPGRADE_NOT_CONFIRMED', code: /^[A-Z0-9_]{1,40}$/.test(error.code || '') ? error.code : 'REFUSED', ...(error.safe ? { message: error.message } : {}) }));
    process.exitCode = 1;
  });
}
