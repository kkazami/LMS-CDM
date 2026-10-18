import fs from 'node:fs';
import { createHash } from 'node:crypto';

const identifier=value=>{if(!/^[a-z][a-z0-9_]{3,60}$/.test(value))throw Error('Invalid explicit principal.');return '"'+value+'"';};
const hash=value=>createHash('sha256').update(value).digest('hex');
/** Explicit operator operation; never imported by application routes. */
export async function installSuperUserBoundary(owner,{runtimePrincipal,operatorPrincipal,runtimePassword,operatorPassword,qualificationReference}) {
  const app=identifier(runtimePrincipal),operator=identifier(operatorPrincipal);
  if(runtimePrincipal===operatorPrincipal||![runtimePassword,operatorPassword].every(v=>/^[A-Za-z0-9_-]{32,128}$/.test(v))||!qualificationReference)throw Error('Distinct bounded principals and qualification evidence required.');
  const files=['current-target-security.sql','guard-validation.sql','ics-faculty-designation.sql'].map(name=>({path:'prisma/super-user-v1/'+name,bytes:fs.readFileSync('prisma/super-user-v1/'+name,'utf8')}));
  const identity=(await owner.query('SELECT current_database() db')).rows[0];
  const database='"'+identity.db.replaceAll('"','""')+'"';
  if((await owner.query("SELECT to_regnamespace('super_user_security') IS NOT NULL AS exists")).rows[0].exists)throw Error('Existing boundary requires reconciliation; never overwrite.');
  if((await owner.query('SELECT 1 FROM public."User" WHERE upper(role) IN (\'SUPER_USER\',\'INSTITUTE_ADMIN\') LIMIT 1')).rowCount)throw Error('Existing privileged accounts require explicit containment review; no mutation.');
  if((await owner.query('SELECT 1 FROM pg_roles WHERE rolname=ANY($1::text[])',[[runtimePrincipal,operatorPrincipal]])).rowCount)throw Error('Existing principal requires reconciliation; never overwrite.');
  let committing=false;
  await owner.query('BEGIN');
  try {
    await owner.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s'");
    for(const file of files)await owner.query(file.bytes.replace(/^\s*BEGIN;/,'').replace(/COMMIT;\s*$/,''));
    await owner.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    for(const [role,password]of [[app,runtimePassword],[operator,operatorPassword]])await owner.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${password}'`);
    await owner.query(`GRANT CONNECT ON DATABASE ${database} TO ${app},${operator}; GRANT USAGE ON SCHEMA public TO ${app}; GRANT USAGE ON SCHEMA super_user_security TO ${app},${operator}; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO ${app}`);
    await owner.query(`GRANT EXECUTE ON FUNCTION super_user_security.application_boundary_qualified() TO ${app}; GRANT EXECUTE ON FUNCTION super_user_security.set_ics_faculty(text,text,text,text,text,integer) TO ${app}`);
    for(const signature of ['bootstrap_super_user(text,text,text,text,text,text,text,text)','complete_handoff(text,text,text,text,text,text,text)','activate_new_bootstrap(text,text,text,text,text,text)','contain_account(text,text,text,text,text)'])await owner.query(`GRANT EXECUTE ON FUNCTION super_user_security.${signature} TO ${operator}`);
    await owner.query('INSERT INTO super_user_security.writer_bindings (principal,kind,enabled,qualification_reference) VALUES ($1,\'APPLICATION\',true,$3),($2,\'OPERATOR\',true,$3)',[runtimePrincipal,operatorPrincipal,qualificationReference]);
    committing=true;await owner.query('COMMIT');
    return {commitAcknowledged:true,runtimePrincipal,operatorPrincipal,files:files.map(f=>({path:f.path,sha256:hash(f.bytes)}))};
  } catch(error) {
    if(committing)throw Error('BOUNDARY_COMMIT_UNCERTAIN: reconcile catalogs before retrying.');
    await owner.query('ROLLBACK');throw error;
  }
}
