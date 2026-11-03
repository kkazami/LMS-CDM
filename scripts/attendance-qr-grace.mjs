import fs from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';

const migrationName = '20261102000100_attendance_qr_grace';
const sql = fs.readFileSync(new URL(`../prisma/migrations/${migrationName}/migration.sql`, import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const checksum = hash(sql);
const checksums = new Set([sql, sql.replace(/\r\n/g, '\n'), sql.replace(/\r?\n/g, '\r\n')].map(hash));
export async function inspectQrGrace(client) {
  const result = (await client.query(`SELECT pg_get_constraintdef(c.oid) AS definition,
    (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='AttendanceSession' AND column_name='qrGraceSeconds') AS default_value
    FROM pg_constraint c WHERE c.conrelid=to_regclass('public."AttendanceSession"') AND c.conname='AttendanceSession_timing' AND c.convalidated`)).rows[0];
  return !!result && /"qrGraceSeconds" <= 60/.test(result.definition) && result.default_value === '30';
}
export async function upgradeQrGrace(client) {
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='60s'; SET LOCAL search_path=public,pg_catalog");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('lms-attendance-migration',0))");
    const receipts = (await client.query('SELECT checksum,finished_at,rolled_back_at FROM "_prisma_migrations" WHERE migration_name=$1', [migrationName])).rows;
    if (receipts.length) {
      if (receipts.length !== 1 || !checksums.has(receipts[0].checksum) || !receipts[0].finished_at || receipts[0].rolled_back_at || !await inspectQrGrace(client)) throw Error('QR grace schema or migration receipt needs reconciliation.');
      await client.query('ROLLBACK'); return { status: 'ALREADY_APPLIED', migrationName };
    }
    if ((await client.query('SELECT count(*)::int n FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL')).rows[0].n) throw Error('Resolve incomplete migrations before applying QR grace.');
    await client.query(sql.replace(/^\s*BEGIN;/, '').replace(/COMMIT;\s*$/, ''));
    if (!await inspectQrGrace(client)) throw Error('QR grace migration verification failed.');
    await client.query(`INSERT INTO "_prisma_migrations"(id,checksum,finished_at,migration_name,started_at,applied_steps_count)
      VALUES($1,$2,CURRENT_TIMESTAMP,$3,CURRENT_TIMESTAMP,1)`, [randomUUID(), checksum, migrationName]);
    await client.query('COMMIT'); return { status: 'APPLIED', migrationName, checksum };
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
}
