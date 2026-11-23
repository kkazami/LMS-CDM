"""Parent-side preparation only. Public manifests/tools; never load dotenv or run package scripts."""
import base64, hashlib, io, json, os, shutil, subprocess, sys, tarfile, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / 'tmp/security-sprint-2'
PINS = json.loads((ROOT / 'scripts/security/tools.json').read_text())

def workspace(ref=None):
    if ref is not None and (len(ref) != 40 or any(c not in '0123456789abcdef' for c in ref)):
        raise ValueError('Exact base commit required')
    target = HERE / ('base-workspace' if ref else 'dependency-workspace')
    target.mkdir(parents=True, exist_ok=True)
    files = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']
    files += [str(p.relative_to(ROOT)) for directory in ['apps', 'packages'] for p in (ROOT/directory).glob('*/package.json')]
    for name in files:
        output = target / name
        output.parent.mkdir(parents=True, exist_ok=True)
        content = subprocess.check_output(['git', 'show', ref+':'+name.replace('\\', '/')], cwd=ROOT) if ref else (ROOT/name).read_bytes()
        output.write_bytes(content)
    config = HERE / 'config'
    config.mkdir(exist_ok=True)
    (config/'empty.npmrc').write_text('registry=https://registry.npmjs.org/\n')
    print('Prepared public manifest-only workspace: ' + target.name)

def download(url, integrity):
    with urllib.request.urlopen(url, timeout=60) as response:
        data = response.read(160 * 1024 * 1024 + 1)
    if len(data) > 160 * 1024 * 1024: raise ValueError('Oversized tool')
    if integrity.startswith('sha512-'):
        valid = base64.b64encode(hashlib.sha512(data).digest()).decode() == integrity[7:]
    else: valid = hashlib.sha256(data).hexdigest() == integrity
    if not valid: raise ValueError('Tool integrity mismatch')
    return data

def tools():
    out = HERE/'linux-tools'
    out.mkdir(parents=True, exist_ok=True)
    entries = [
        ('https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.28.1.tgz', PINS['esbuild']['tarball_integrity'],
         {'package/bin/esbuild': out/'esbuild'}),
        ('https://registry.npmjs.org/@next/swc-linux-x64-gnu/-/swc-linux-x64-gnu-16.4.6.tgz', PINS['swc']['integrity'],
         {name: HERE/'dependency-workspace/node_modules/.pnpm/node_modules/@next/swc-linux-x64-gnu'/Path(name).name for name in PINS['swc']['files']}),
        (PINS['gitleaks']['url'], PINS['gitleaks']['sha256'], {'gitleaks': out/'gitleaks'})]
    for url, integrity, expected in entries:
        blob = download(url, integrity)
        with tarfile.open(fileobj=io.BytesIO(blob), mode='r:gz') as archive:
            for name, destination in expected.items():
                member = archive.getmember(name)
                if not member.isfile() or member.size > 160*1024*1024: raise ValueError('Unsafe tool archive entry')
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(archive.extractfile(member).read())
    print('Prepared checksum-verified Linux tools; no tool executed')

if __name__ == '__main__':
    if sys.argv[1] == 'workspace': workspace(*sys.argv[2:])
    elif sys.argv[1] == 'tools': tools()
    else: raise ValueError('Unknown preparation mode')
