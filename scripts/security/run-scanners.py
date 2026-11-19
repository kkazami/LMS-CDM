"""Parent-side bounded scanner orchestration, explicitly excludes blocked audit units."""
import importlib.util, json, os, shutil, sys, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('runner', ROOT/'scripts/security/run-scoped.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)

def main(mode):
    if mode not in ['static', 'secrets']: raise ValueError('Invalid scanner')
    folder = ROOT/'tmp/security-sprint-2'/('scan-'+mode+'-'+uuid.uuid4().hex[:8])
    folder.mkdir(exist_ok=False)
    source = folder/'source'
    source.mkdir()
    scope = json.loads((ROOT/'scripts/security/scan-scope.json').read_text())
    files = set(scope['files'] + scope['automationFiles'] + ['tests/sprint-2/tooling_test.py','tests/sprint-2/semgrep/client.ts'])
    for directory in scope['automationDirectories']:
        files.update(str(p.relative_to(ROOT)).replace('\\', '/') for p in (ROOT/directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    for name in sorted(files):
        p = ROOT/name
        if not p.is_file() or p.is_symlink() or p.name.startswith('.env') or '__pycache__' in name or p.stat().st_size > 2*1024*1024:
            raise ValueError('Unsafe or oversized scan input: '+name)
        runner.copy(p, source/name)
    pins = json.loads((ROOT/'scripts/security/tools.json').read_text())
    name = 'lms-sprint2-scanner-'+uuid.uuid4().hex
    tools = ROOT/'tmp/security-sprint-2/linux-tools'
    command = ['docker','run','--pull=never','--name',name,'--label','lms.sprint2='+name,'--network','none',
        '--ipc','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','2',
        '--memory','2048m','--pids-limit','128','--ulimit','core=0:0','--ulimit','fsize=67108864:67108864',
        '--tmpfs','/scratch:rw,exec,nosuid,nodev,size=256m,mode=1777',
        '--mount',f'type=bind,source={source},target=/source,readonly',
        '--mount',f'type=bind,source={tools},target=/tools,readonly',
        '--workdir','/source','--entrypoint','/usr/bin/env',pins['semgrepImage'],'-i',
        'PATH=/usr/local/bin:/usr/bin:/bin','HOME=/scratch','TMPDIR=/scratch','PYTHONDONTWRITEBYTECODE=1',
        'SEMGREP_SEND_METRICS=off','SEMGREP_ENABLE_VERSION_CHECK=0',
        'timeout','-k','5','180','sh','-c',
        'cp /tools/gitleaks /scratch/gitleaks && chmod 500 /scratch/gitleaks && exec python3 scripts/security/scanner-entry.py "$@"',
        'scanner',mode]
    try:
        code, output = runner.bounded(command, timeout=200)
        (folder/'output.txt').write_text(output, encoding='utf8')
        (folder/'receipt.json').write_text(json.dumps({'mode': mode, 'exit': code, 'files': sorted(files),
            'image': pins['semgrepImage'], 'network': 'none', 'scratch_bytes':268435456,
            'memory_bytes':2147483648,'cpus':2,'pids':128,'seconds':180}, indent=2)+'\n')
        print(output[-12000:])
        return code
    finally:
        code, owner = runner.bounded(['docker','inspect','--format','{{index .Config.Labels "lms.sprint2"}}',name])
        if code == 0 and owner.strip() == name: runner.bounded(['docker','rm','-f',name])

if __name__ == '__main__': sys.exit(main(*sys.argv[1:]))
