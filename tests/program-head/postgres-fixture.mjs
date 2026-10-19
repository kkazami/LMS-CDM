import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { Client } from 'pg';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function createDisposablePostgres() {
  const root = process.cwd();
  const evidence = path.resolve('.orchestra/product-development/program-head-integration');
  const retained = path.resolve('.orchestra/local-worktrees/trusted-local-harness/.orchestra/runs/run_trusted_local_profile_20261009/checkpoint/bqual-01-phase-3');
  const manifest = JSON.parse(fs.readFileSync(path.join(retained, '020-phase3-artifact-manifest-v1.json'), 'utf8'));
  for (const binary of manifest.distribution.binaries) {
    if (sha(fs.readFileSync(path.join(retained, binary.path))) !== binary.sha256) throw new Error('Retained binary hash mismatch.');
  }
  const attempt = `local_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const data = path.join(evidence, attempt, 'postgres-data');
  fs.mkdirSync(path.dirname(data), { recursive: true });
  const bin = path.join(retained, 'local-postgresql/distribution/pgsql/bin');
  const roles = ['bqual_bootstrap_admin','bqual_test_migrator','bqual_test_app','bqual_test_operator'];
  const passwords = Object.fromEntries(roles.map(role => [role, randomBytes(32).toString('hex')]));
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(PG|DATABASE_URL|POSTGRES|SUPER_USER|HARNESS)/i.test(key)));
  async function command(program, args, stdin = '') {
    return new Promise((resolve, reject) => {
      // pg_ctl's server child can inherit pipes after pg_ctl exits on Windows.
      // File-backed output preserves the actual controller close without waiting for server lifetime.
      const daemonControl = path.basename(program) === 'pg_ctl.exe';
      const outFile = path.join(path.dirname(data), `control-${Date.now()}.stdout.log`);
      const errFile = outFile.replace('stdout','stderr');
      const descriptors = daemonControl ? [fs.openSync(outFile,'wx'),fs.openSync(errFile,'wx')] : [];
      const child = spawn(program, args, { cwd: root, env, windowsHide: true, stdio: daemonControl ? ['ignore',...descriptors] : ['pipe','pipe','pipe'] });
      let stdout = '', stderr = ''; const timeout = setTimeout(() => { child.kill(); reject(new Error('Disposable setup deadline.')); }, 60000);
      child.stdout?.on('data', value => { stdout += value; }); child.stderr?.on('data', value => { stderr += value; });
      child.on('error', error => { clearTimeout(timeout); reject(error); });
      child.on('close', (code, signal) => { clearTimeout(timeout); for(const fd of descriptors)fs.closeSync(fd); if(daemonControl){stdout=fs.readFileSync(outFile,'utf8');stderr=fs.readFileSync(errFile,'utf8');} const record = { program: path.basename(program), args, code, signal, stdout, stderr };
        fs.writeFileSync(path.join(path.dirname(data), `${path.basename(program)}-${Date.now()}.json`), JSON.stringify(record,null,2));
        if (code !== 0) reject(new Error(`Disposable ${path.basename(program)} exit ${code}; retained receipt.`)); else resolve(record); });
      child.stdin?.end(stdin);
    });
  }
  // This Windows initdb does not support --pwfile=-. Create an ACL-restricted,
  // single-use TEMP file outside repositories; never print/read back its contents.
  const secretDirectory = path.join(os.tmpdir(), `su-v1-${randomBytes(16).toString('hex')}`);
  const passwordFile = path.join(secretDirectory,'initdb.pw');
  const quotedDirectory = secretDirectory.replaceAll("'", "''");
  const provisioning = `$ErrorActionPreference='Stop'; $directory='${quotedDirectory}'; if(Test-Path -LiteralPath $directory){throw 'Temporary path already exists'}; New-Item -ItemType Directory -Path $directory | Out-Null; $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User; $acl=Get-Acl -LiteralPath $directory; $acl.SetAccessRuleProtection($true,$false); $rule=[Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'); $acl.SetAccessRule($rule); Set-Acl -LiteralPath $directory -AclObject $acl; $verified=Get-Acl -LiteralPath $directory; if(-not $verified.AreAccessRulesProtected -or @($verified.Access | Where-Object {$_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value}).Count){throw 'Temporary ACL validation failed'}; $password=[Console]::In.ReadToEnd(); if($password -notmatch '^[a-f0-9]{64}$'){throw 'Invalid synthetic password'}; [IO.File]::WriteAllText((Join-Path $directory 'initdb.pw'),$password); Write-Output 'Temporary synthetic password ACL verified; no secret output.'`;
  await command('pwsh.exe',['-NoProfile','-Command',provisioning],passwords.bqual_bootstrap_admin);
  try {
    await command(path.join(bin,'initdb.exe'), ['-D',data,'-U','bqual_bootstrap_admin','--auth-host=scram-sha-256','--auth-local=scram-sha-256',`--pwfile=${passwordFile}`,'--encoding=UTF8','--locale-provider=builtin','--builtin-locale=C.UTF-8','--no-instructions']);
  } finally {
    if(path.dirname(passwordFile)!==secretDirectory || fs.lstatSync(secretDirectory).isSymbolicLink())throw new Error('Temporary cleanup boundary mismatch.');
    fs.unlinkSync(passwordFile); fs.rmdirSync(secretDirectory);
  }
  const port = await new Promise(resolve => { const listener=net.createServer(); listener.listen(0,'127.0.0.1',()=>{const port=listener.address().port;listener.close(()=>resolve(port));}); });
  fs.appendFileSync(path.join(data,'postgresql.conf'), `\nlisten_addresses='127.0.0.1'\nport=${port}\nlog_statement='none'\nlog_min_error_statement='panic'\ntimezone='GMT'\n`);
  const clients=[];
  try {
  await command(path.join(bin,'pg_ctl.exe'), ['start','-D',data,'-l',path.join(path.dirname(data),'postgres.log'),'-w','-t','20']);
  const database = `harness_superuser_${Date.now()}`;
  async function connect(role='bqual_test_app', db=database, owner=false) {
    if (!roles.includes(role) || !['postgres',database].includes(db)) throw new Error('Unowned test target.');
    const client = new Client({ host:'127.0.0.1', port, database:db, user:role, password:passwords[role], ssl:false,
      ...(owner ? { options:'-c role=bqual_schema_owner' } : {}), connectionTimeoutMillis:5000 });
    await client.connect(); clients.push(client);
    const actual=(await client.query('SELECT current_database() AS db,session_user AS principal,inet_server_port() AS port,host(inet_server_addr()) AS address')).rows[0];
    if(actual.db!==db||actual.principal!==role||actual.port!==port||actual.address!=='127.0.0.1') { await client.end(); throw new Error('Actual disposable target mismatch.'); }
    return client;
  }
  const admin=await connect('bqual_bootstrap_admin','postgres');
  await admin.query('CREATE ROLE bqual_schema_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
  for(const role of roles.slice(1)) await admin.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${passwords[role]}'`);
  await admin.query('GRANT bqual_schema_owner TO bqual_test_migrator WITH ADMIN FALSE, INHERIT FALSE, SET TRUE');
  await admin.query(`CREATE DATABASE ${database} OWNER bqual_schema_owner TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER builtin BUILTIN_LOCALE 'C.UTF-8'`);
  const owner=await connect('bqual_test_migrator',database,true);
  await owner.query('REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO bqual_test_app;');
  await admin.query(`REVOKE ALL ON DATABASE ${database} FROM PUBLIC; GRANT CONNECT ON DATABASE ${database} TO bqual_test_app,bqual_test_operator,bqual_test_migrator`);
  const url = `postgresql://bqual_test_app:${passwords.bqual_test_app}@127.0.0.1:${port}/${database}`;
  const stop=async()=>{for(const client of clients)await client.end().catch(()=>{});await command(path.join(bin,'pg_ctl.exe'),['stop','-D',data,'-m','fast','-w','-t','20']);};
  fs.writeFileSync(path.join(path.dirname(data),'target-provenance.json'),JSON.stringify({attempt,database,port,host:'127.0.0.1',principals:roles,emptyOwnedDatabase:true,OSIsolation:false,realAccounts:false,sharedTarget:false},null,2));
  return { connect, owner, database, port, url, stop, artifactDirectory:path.dirname(data) };
  } catch(error) {
    for (const client of clients) await client.end().catch(()=>{});
    if (fs.existsSync(path.join(data,'postmaster.pid'))) {
      const resolved=path.resolve(data),boundary=path.resolve(evidence)+path.sep;
      if (!resolved.startsWith(boundary) || fs.lstatSync(data).isSymbolicLink()) throw new Error('Owned cluster cleanup boundary mismatch.');
      try { await command(path.join(bin,'pg_ctl.exe'), ['stop','-D',resolved,'-m','fast','-w','-t','20']); }
      catch { throw new Error('Disposable setup failed and owned cluster stop could not be confirmed; retained exact target provenance.'); }
    }
    throw error;
  }
}
