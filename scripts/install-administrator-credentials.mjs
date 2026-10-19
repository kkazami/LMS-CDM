import fs from 'node:fs';

/** Explicit owner operation. Never imported by a web handler. */
export async function installAdministratorCredentials(owner) {
  const path = 'prisma/super-user-v1/administrator-credentials.sql';
  const sql = fs.readFileSync(path, 'utf8');
  const previous = fs.readFileSync('prisma/super-user-v1/administrator-consolidation.sql', 'utf8');
  const oldBody = previous.split('AS $$')[1].split('$$;')[0].trim().replaceAll('\r\n', '\n');
  const newBody = sql.split('AS $guard$')[1].split('$guard$;')[0].trim().replaceAll('\r\n', '\n');
  const resetBody = sql.split('AS $reset$')[1].split('$reset$;')[0].trim().replaceAll('\r\n', '\n');
  let committing = false;
  await owner.query('BEGIN');
  try {
  await owner.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s'");
  await owner.query('LOCK TABLE public."User" IN SHARE ROW EXCLUSIVE MODE');
  const installed = (await owner.query(`SELECT p.prosrc, pg_get_userbyid(p.proowner)=current_user AS owned
    FROM pg_proc p WHERE p.oid=to_regprocedure('super_user_security.guard_user()')`)).rows[0];
  if (!installed?.owned) throw new Error('Expected the existing boundary owner. No changes applied.');
  const current = installed.prosrc.trim().replaceAll('\r\n', '\n');
  const reset = (await owner.query(`SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure('super_user_security.reset_administrator_password(text,text,text,text,text)')`)).rows[0];
  if (current === newBody && reset?.prosrc.trim().replaceAll('\r\n', '\n') === resetBody) { await owner.query('ROLLBACK'); return { applied: false, alreadyInstalled: true }; }
  if (current !== oldBody || reset) throw new Error('The installed credential boundary differs from the reviewed predecessor. No changes applied.');
  const fingerprint = async () => (await owner.query(`SELECT encode(sha256(convert_to(coalesce(string_agg(row_to_json(u)::text,'' ORDER BY u.id),''),'UTF8')),'hex') AS digest FROM public."User" u`)).rows[0].digest;
  const before = await fingerprint();
  await owner.query(sql.replace(/\bBEGIN;/, '').replace(/COMMIT;\s*$/, ''));
  if (await fingerprint() !== before) throw new Error('Account preservation failed.');
  committing = true;
  await owner.query('COMMIT');
  return { applied: true, alreadyInstalled: false, accountsUnchanged: true };
  } catch (error) {
    if (committing) throw Object.assign(new Error('Commit outcome is uncertain. Reconcile before retrying.'), { code: 'COMMIT_UNCERTAIN' });
    await owner.query('ROLLBACK'); throw error;
  }
}
