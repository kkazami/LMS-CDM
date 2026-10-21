// Operator-only; no dotenv, default database, or implicit legacy key.
import { Client } from 'pg';
import { encryptGithubToken, decryptGithubToken } from '../apps/web/src/lib/github/token-vault';

async function main() {
  const args = process.argv.slice(2);
  const value = (name: string) => args[args.indexOf(name) + 1];
  if (!args.includes('--database') || !args.includes('--host') || !value('--database') || !value('--host')) throw new Error('Explicit target required.');
  const connection = process.env.GITHUB_TOKEN_ROTATION_DATABASE_URL;
  if (!connection) throw new Error('Operator connection required.');
  const url = new URL(connection);
  if (url.hostname !== value('--host')) throw new Error('Target host mismatch.');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) url.searchParams.set('sslmode', 'verify-full');
  // Validate current/previous keys before opening a database connection.
  decryptGithubToken(encryptGithubToken('rotation-self-check'));
  const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000, statement_timeout: 15000 });
  await client.connect();
  try {
    const target = await client.query('SELECT current_database() AS name');
    if (target.rows[0].name !== value('--database')) throw new Error('Target database mismatch.');
    await client.query('BEGIN');
    const rows = await client.query<{ id: string; encryptedToken: string }>('SELECT id,"encryptedToken" FROM "GithubToken" FOR UPDATE');
    const rotated = rows.rows.map(row => ({ id: row.id, encrypted: encryptGithubToken(decryptGithubToken(row.encryptedToken)) }));
    if (args.includes('--apply')) {
      for (const row of rotated) await client.query('UPDATE "GithubToken" SET "encryptedToken"=$1 WHERE id=$2', [row.encrypted, row.id]);
      await client.query('COMMIT');
    } else await client.query('ROLLBACK');
    console.log(JSON.stringify({ mode: args.includes('--apply') ? 'APPLIED' : 'DRY_RUN', tokens: rotated.length }));
  } catch {
    await client.query('ROLLBACK').catch(() => {});
    throw new Error('Rotation was not confirmed; inspect target configuration and decryptability without logging tokens.');
  } finally { await client.end(); }
}
main().catch(() => { console.error('GITHUB_TOKEN_ROTATION_FAILED'); process.exitCode = 1; });
