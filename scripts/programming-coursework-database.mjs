import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { Prisma } from '@prisma/client';
import { configuration, databaseIdentity, poolOptions } from './ohmward/check-database.mjs';

export const migrationName = '20261031000100_programming_coursework';
const migration = fs.readFileSync(new URL(`../prisma/migrations/${migrationName}/migration.sql`, import.meta.url));
const checksum = createHash('sha256').update(migration.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');

export async function inspectProgrammingCoursework(client) {
  const columns = (await client.query(`SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns
    WHERE table_schema='public' AND table_name='SyllabusItem' AND column_name IN ('isProgramming','requireGithubRepo') ORDER BY column_name`)).rows;
  const constraint = (await client.query(`SELECT count(*)::int n FROM pg_constraint WHERE conrelid=to_regclass('public."SyllabusItem"') AND conname='SyllabusItem_programming_submission_check' AND convalidated`)).rows[0].n === 1;
  const identity = (await client.query(`SELECT pg_has_role(current_user,c.relowner,'USAGE') AS "canMigrate",
    (SELECT bool_and(has_table_privilege(current_user,c.oid,p)) FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) p) AS "runtimeAccess" FROM pg_class c WHERE c.oid=to_regclass('public."SyllabusItem"')`)).rows[0];
  const ready = columns.length === 2 && columns.every(column => column.data_type === 'boolean' && column.is_nullable === 'NO' && column.column_default === 'false') && constraint;
  return { ready, columns: columns.map(column => column.column_name), constraint, canMigrate: Boolean(identity?.canMigrate), runtimeAccess: Boolean(identity?.runtimeAccess) };
}

export async function inspectPrismaColumns(client) {
  const rows = (await client.query(`SELECT c.relname AS table_name,a.attname AS column_name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
    WHERE n.nspname='public' AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped`)).rows;
  const columns = new Set(rows.map(row => `${row.table_name}.${row.column_name}`));
  return Prisma.dmmf.datamodel.models.flatMap(model => model.fields.filter(field => field.kind !== 'object')
    .map(field => `${model.dbName || model.name}.${field.dbName || field.name}`).filter(name => !columns.has(name)));
}

/** Apply this additive migration only; historical pending migrations are not replayed. */
export async function upgradeProgrammingCoursework(owner) {
  await owner.query('BEGIN');
  try {
    await owner.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; SET LOCAL search_path=public,pg_catalog");
    await owner.query("SELECT pg_advisory_xact_lock(hashtextextended('lms-programming-coursework-migration',0))");
    const state = await inspectProgrammingCoursework(owner);
    const receipts = (await owner.query('SELECT checksum,finished_at,rolled_back_at FROM "_prisma_migrations" WHERE migration_name=$1', [migrationName])).rows;
    if (receipts.length) {
      if (receipts.length !== 1 || receipts[0].checksum !== checksum || !receipts[0].finished_at || receipts[0].rolled_back_at || !state.ready) throw Error('Migration history or schema needs reconciliation.');
      await owner.query('ROLLBACK');
      return { status: 'ALREADY_APPLIED' };
    }
    if (state.columns.length || state.constraint) throw Error('Partial or unrecorded programming coursework schema; reconcile before migration.');
    if (!state.canMigrate) throw Error('A database owner migration connection is required.');
    const pending = (await owner.query('SELECT count(*)::int n FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL')).rows[0].n;
    if (pending) throw Error('Resolve incomplete migrations before applying this upgrade.');
    await owner.query(migration.toString('utf8'));
    if (!(await inspectProgrammingCoursework(owner)).ready) throw Error('Migration verification failed.');
    await owner.query(`INSERT INTO "_prisma_migrations"(id,checksum,finished_at,migration_name,started_at,applied_steps_count)
      VALUES($1,$2,CURRENT_TIMESTAMP,$3,CURRENT_TIMESTAMP,1)`, [randomUUID(), checksum, migrationName]);
    await owner.query('COMMIT');
    return { status: 'APPLIED' };
  } catch (error) {
    await owner.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function main() {
  if (process.argv[2] === '--vercel-build' && process.env.VERCEL !== '1') return;
  const apply = process.argv[2] === '--apply';
  if (process.argv.length > 3 || process.argv[2] && !['--check', '--apply', '--vercel-build'].includes(process.argv[2])) throw Error('Use --check or --apply.');
  const config = configuration(fileURLToPath(new URL('../', import.meta.url)));
  if (config.cli && databaseIdentity(config.cli) !== databaseIdentity(config.runtime)) throw Error('Root Prisma and web runtime databases differ.');
  const runtime = new Pool(poolOptions(config.runtime));
  let owner;
  try {
    if (apply) {
      const ownerUrl = process.env.PROGRAMMING_COURSEWORK_DATABASE_URL;
      if (!ownerUrl) throw Error('Set PROGRAMMING_COURSEWORK_DATABASE_URL to the database owner connection for this upgrade.');
      if (databaseIdentity(ownerUrl) !== databaseIdentity(config.runtime)) throw Error('Migration and runtime connections must target the same database.');
      owner = new Pool(poolOptions(ownerUrl));
      const client = await owner.connect();
      try { console.log(JSON.stringify(await upgradeProgrammingCoursework(client))); } finally { client.release(); }
    }
    const client = await runtime.connect();
    try {
      await client.query('BEGIN READ ONLY');
      const result = await inspectProgrammingCoursework(client);
      const missingPrismaColumns = await inspectPrismaColumns(client);
      await client.query('ROLLBACK');
      console.log(JSON.stringify({ ...result, missingPrismaColumns, checkedAt: new Date().toISOString() }));
      if (!result.ready || !result.runtimeAccess || missingPrismaColumns.length) {
        console.error('Apply the programming coursework migration with the database owner before deploying. See docs/deployment/programming-coursework.md.');
        process.exitCode = 1;
      }
    } finally { client.release(); }
  } finally { await Promise.all([runtime.end(), owner?.end()]); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    // Connection and SQL errors may contain private query arguments or credentials.
    console.error(JSON.stringify({ status: 'DATABASE_NOT_READY', code: /^[A-Z0-9_]{1,40}$/.test(error.code || '') ? error.code : 'CHECK_FAILED', ...(!error.code && error.constructor === Error ? { message: error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]') } : {}) }));
    process.exitCode = 1;
  });
}
