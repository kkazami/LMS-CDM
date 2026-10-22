// Read-only comparison. Operators restore first to a separately owned synthetic target.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { Client } from 'pg';
import { flags, outputPath, requiredText } from './evidence.mjs';

export function validateRestore(config, env = process.env) {
  if (config.syntheticOnly !== true || config.environmentKind !== 'staging') throw Error('Synthetic staging required.');
  requiredText(config.environmentId, 'environment'); requiredText(config.ownershipNonce, 'restore ownership nonce');
  const urls = ['sourceUrlEnv', 'restoredUrlEnv'].map(key => {
    if (!/^LMS_QUALITY_[A-Z0-9_]+$/.test(config[key] ?? '') || !env[config[key]]) throw Error('Explicit quality-only database reference required.');
    const url = new URL(env[config[key]]);
    if (!['postgresql:', 'postgres:'].includes(url.protocol) || !config.allowedHosts?.includes(url.hostname)) throw Error('Unreviewed database host.');
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (!local && (url.searchParams.get('sslmode') !== 'verify-full' || url.searchParams.get('uselibpqcompat') === 'true')) throw Error('Remote comparison requires verified TLS.');
    return url;
  });
  if (urls[0].hostname === urls[1].hostname && (urls[0].port || '5432') === (urls[1].port || '5432') && urls[0].pathname === urls[1].pathname) throw Error('Restore target must be a separate database.');
  if (!/^\/(harness_restore|quality_restore)_[a-zA-Z0-9_]+$/.test(urls[1].pathname)) throw Error('Owned restore database name required.');
  if (!Number.isFinite(Date.parse(config.backupCapturedAt))) throw Error('Backup timestamp required.');
  return urls.map(url => url.href);
}
const quote = value => '"' + value.replaceAll('"', '""') + '"';
export async function snapshot(client) {
  // A read-only snapshot and cursor keep client memory bounded. Sorting happens in PostgreSQL.
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout='60s'");
    const tables = (await client.query("SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('public','super_user_security') ORDER BY schemaname,tablename")).rows;
    const result = [];
    for (const { schemaname, tablename } of tables) {
      const hash = createHash('sha256'); let rows = 0;
      await client.query(`DECLARE quality_rows NO SCROLL CURSOR FOR SELECT to_jsonb(t)::text AS row FROM ${quote(schemaname)}.${quote(tablename)} t ORDER BY to_jsonb(t)::text COLLATE "C"`);
      for (;;) {
        const page = await client.query('FETCH FORWARD 500 FROM quality_rows');
        if (!page.rowCount) break;
        for (const r of page.rows) { hash.update(r.row); hash.update('\n'); rows++; }
      }
      await client.query('CLOSE quality_rows');
      result.push({ schema: schemaname, table: tablename, rows, sha256: hash.digest('hex') });
    }
    return result;
  } finally { await client.query('ROLLBACK'); }
}
export async function compareRestore(config, env = process.env) {
  const urls = validateRestore(config, env), clients = [], report = { startedAt: new Date().toISOString(), environmentId: config.environmentId, syntheticOnly: true,
    operation: 'read-only comparison of already restored separate database', backupCapturedAt: config.backupCapturedAt,
    limitations: ['Requires frozen synthetic source; no concurrent writes during backup/comparison.', 'Does not prove provider backups, PITR, encryption, firewall policy or runtime grants.', 'RPO is observed backup age at verification; RTO must include operator detection, provisioning and application recovery.'] };
  try {
    for (const url of urls) {
      const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000, query_timeout: 65000, options: '-c default_transaction_read_only=on' }); clients.push(client); await client.connect();
      // URL startup options (for example SET ROLE) can override pg's options field.
      await client.query('SET default_transaction_read_only=on');
    }
    const actual = await Promise.all(clients.map(async (client, i) => {
      const row = (await client.query('SELECT current_database() db,host(inet_server_addr()) address,inet_server_port() port,current_setting(\'default_transaction_read_only\') read_only')).rows[0];
      if (row.db !== decodeURIComponent(new URL(urls[i]).pathname.slice(1)) || row.read_only !== 'on') throw Error('Actual restore target mismatch.');
      return row;
    }));
    if (actual[0].db === actual[1].db && actual[0].address === actual[1].address && actual[0].port === actual[1].port) throw Error('Source and destination resolved to the same database.');
    const marker = await clients[1].query('SELECT "environmentId",nonce FROM public.quality_restore_ownership');
    if (marker.rowCount !== 1 || marker.rows[0].environmentId !== config.environmentId || marker.rows[0].nonce !== config.ownershipNonce) throw Error('Restore ownership mismatch.');
    const [source, restored] = await Promise.all(clients.map(snapshot));
    report.tables = source; report.matches = isDeepStrictEqual(source, restored);
    report.observedBackupAgeSeconds = (Date.now() - Date.parse(config.backupCapturedAt)) / 1000;
    report.result = report.matches ? 'PASS' : 'FAIL';
  } catch { report.result = 'FAIL'; report.error = 'Restore comparison failed or ownership was not verified.'; }
  finally { await Promise.allSettled(clients.map(c => c.end())); }
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(outputPath(config.output), JSON.stringify(report, null, 2)); return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = flags(process.argv.slice(2), ['--config']);
    const report = await compareRestore(JSON.parse(fs.readFileSync(args['--config'], 'utf8')));
    console.log(JSON.stringify({ result: report.result, tables: report.tables?.length, matches: report.matches }));
    if (report.result !== 'PASS') process.exitCode = 1;
  } catch { console.error('Restore check refused: explicit separate owned synthetic target required.'); process.exitCode = 1; }
}
