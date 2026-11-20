"""Start an isolated, ephemeral PostgreSQL cluster; no published ports, supplied DB URL or real records."""
import hashlib, importlib.util, json, shutil, sys, time, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('runner', ROOT/'scripts/security/run-scoped.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

def main(label, fixture_directory, mode='staging'):
    if not label or not label.replace('-', '').isalnum(): raise ValueError('Invalid fixture label')
    if mode not in runner.STAGING_TESTS: raise ValueError('Unknown staging profile')
    fixture = Path(fixture_directory).resolve()
    schema = ROOT/'prisma/schema.prisma'
    # DDL may be prepared offline with Prisma migrate diff --from-empty --to-schema ... --script.
    if (fixture/'schema.prisma').read_bytes() != schema.read_bytes(): raise ValueError('DDL companion schema differs from current schema')
    sql = (fixture/'schema.sql').read_bytes()
    if len(sql) > 4*1024*1024 or b'CREATE TABLE' not in sql: raise ValueError('Invalid fixture DDL')
    base = ROOT/'tmp/security-sprint-2'/('fixture-'+label)
    base.mkdir(exist_ok=False)
    shutil.copyfile(fixture/'schema.sql', base/'schema.sql')
    pins = json.loads((ROOT/'scripts/security/tools.json').read_text())
    name = 'lms-sprint2-pg-'+uuid.uuid4().hex
    command = ['docker','run','-d','--pull=never','--name',name,'--label','lms.sprint2='+name,
        '--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','postgres',
        '--memory','768m','--cpus','1','--pids-limit','128','--ulimit','core=0:0','--ulimit','nofile=512:512',
        '--ulimit','fsize=67108864:67108864','--tmpfs','/scratch:rw,nosuid,nodev,noexec,size=384m,mode=1777',
        '--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=16m','--tmpfs','/dev/shm:rw,nosuid,nodev,noexec,size=64m',
        '--entrypoint','/usr/bin/env',pins['postgresImage'],'-i','PATH=/usr/lib/postgresql/17/bin:/usr/bin:/bin',
        'HOME=/scratch','TMPDIR=/tmp','timeout','-k','5','480','sh','-c',
        'initdb -D /scratch/data --auth=trust --encoding=UTF8 --no-locale >/scratch/init.log && exec postgres -D /scratch/data -h 127.0.0.1 -c unix_socket_directories=/scratch -c shared_buffers=32MB -c max_connections=20 -c statement_timeout=15000 -c log_min_error_statement=panic']
    try:
        code, output = runner.bounded(command)
        if code: raise RuntimeError('Unable to start isolated PostgreSQL: '+output)
        for attempt in range(60):
            code, _ = runner.bounded(['docker','exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'])
            if code == 0: break
            time.sleep(.25)
        else: raise RuntimeError('Disposable PostgreSQL not ready')
        code, output = runner.bounded(['docker','exec',name,'createdb','-h','127.0.0.1','-U','postgres','sprint2_staging'])
        if code: raise RuntimeError('Unable to create dummy database')
        code = runner.main(label, mode, 'container:'+name, base)
        recovery = 'not run because staging failed'
        if code == 0:
            # Both databases are disposable and contain synthetic records only. Never export the dump.
            start = time.monotonic()
            restore = ['pg_restore','-h','127.0.0.1','-U','postgres','--exit-on-error','--no-owner']
            if mode != 'rls-staging': restore += ['--no-acl']
            verify_sql = """SELECT (SELECT count(*) FROM "User"), (SELECT count(*) FROM "Course"), (SELECT count(*) FROM "Enrollment"), (SELECT count(*) FROM "AuditLog" WHERE action='DATABASE_TABLE_EXPORTED');"""
            if mode == 'rls-staging':
                verify_sql = """SELECT (SELECT count(*) FROM "Course"),
                  (SELECT count(*) FROM "Course" WHERE title IN ('Teacher title', 'Admin title')),
                  (SELECT count(*) FROM pg_policies WHERE tablename='Course'),
                  has_column_privilege('sprint5_runtime','public."Course"','title','UPDATE'),
                  has_column_privilege('sprint5_runtime','public."Course"','instituteId','UPDATE'),
                  has_column_privilege('sprint5_job','public."Course"','title','SELECT');"""
            elif mode == 'writer-staging':
                verify_sql = """SELECT (SELECT count(*) FROM "User" WHERE password LIKE '$argon2id$%'),
                  (SELECT count(*) FROM "Session"),
                  (SELECT count(*) FROM "AuditLog" WHERE action='SELF_PASSWORD_CHANGED');"""
            commands = [
                ['pg_dump','-h','127.0.0.1','-U','postgres','-Fc','-f','/scratch/synthetic.dump','sprint2_staging'],
                ['createdb','-h','127.0.0.1','-U','postgres','sprint2_recovery'],
                [*restore,'-d','sprint2_recovery','/scratch/synthetic.dump'],
                ['psql','-h','127.0.0.1','-U','postgres','-d','sprint2_recovery','-Atc',
                 verify_sql]]
            for arguments in commands:
                recovery_code, recovery_output = runner.bounded(['docker','exec',name,*arguments], timeout=45)
                if recovery_code: raise RuntimeError('Synthetic recovery command failed: '+arguments[0])
            expected = {'staging':'3|1|1|1', 'rls-staging':'3|2|3|t|f|f', 'writer-staging':'1|0|1'}[mode]
            if recovery_output.strip() != expected: raise RuntimeError('Synthetic recovery assertions failed')
            recovery = {'format':'pg_dump custom / pg_restore','verified_summary':expected,'seconds':round(time.monotonic()-start,3),
                'production_restore':False,'cluster_roles_reprovisioned':False,
                'same_cluster_role_grants_preserved':mode == 'rls-staging'}
        (base/'receipt.json').write_text(json.dumps({'exit':code,'image':pins['postgresImage'],
            'schema_sha256':hashlib.sha256(schema.read_bytes()).hexdigest(),'ddl_sha256':hashlib.sha256(sql).hexdigest(),
            'data':'Current-schema dummy accounts, courses and institutes; no production data','profile':mode,
            'network':'isolated loopback namespace, no published ports','durable_volume':False,'recovery':recovery},indent=2)+'\n')
        return code
    finally:
        code, owner = runner.bounded(['docker','inspect','--format','{{index .Config.Labels "lms.sprint2"}}',name])
        if code == 0 and owner.strip() == name: runner.bounded(['docker','rm','-f',name])

if __name__ == '__main__': sys.exit(main(*sys.argv[1:]))
