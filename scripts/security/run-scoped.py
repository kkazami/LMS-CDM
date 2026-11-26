"""Parent-owned offline execution of explicit Sprint 2 commands, not the audit suite."""
import os,sys,json,subprocess,hashlib,uuid,threading,shutil,time,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=ROOT/'tmp/security-sprint-2'
DEPS=HERE/'dependency-workspace';TOOLS=HERE/'linux-tools'
TEST_MANIFESTS = [json.loads((ROOT / name).read_text()) for name in (
 'tests/sprint-2/allowed-tests.json', 'tests/sprint-3/allowed-tests.json', 'tests/sprint-4/allowed-tests.json',
 'tests/sprint-5/allowed-tests.json', 'tests/sprint-6/allowed-tests.json',
)]
TESTS = [file for manifest in TEST_MANIFESTS for file in manifest['testFiles']]
EXPECTED_TESTS = sum(manifest['expectedTestCount'] for manifest in TEST_MANIFESTS)
STAGING_TESTS = {
 'staging':'tests/sprint-2/staging.test.cjs',
 'rls-staging':'tests/sprint-5/prisma-rls.test.cjs',
 'writer-staging':'tests/sprint-5/password-writer-staging.test.cjs',
 'rls-principals':'tests/sprint-6/rls-principals.test.cjs',
 'instructor-staging':'tests/sprint-6/instructor-provisioning.test.cjs',
}
BLOCKED=['tests/forms/','tests/attendance/','tests/harness/runner','tests/harness-integration/','tests/security/audit-regressions','tests/security/admin-mfa-cases','tests/web-quality/security.test','tests/mobile/upload','tests/mobile/kx-upload']
def bounded(argv,timeout=45,max_bytes=262144):
 p=subprocess.Popen(argv,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);tail=bytearray()
 def read():
  while True:
   b=p.stdout.read(8192)
   if not b:break
   tail.extend(b)
   if len(tail)>max_bytes:del tail[:-max_bytes]
 t=threading.Thread(target=read,daemon=True);t.start()
 try:code=p.wait(timeout=timeout)
 except subprocess.TimeoutExpired:p.kill();p.wait(timeout=10);raise
 t.join(timeout=10);return code,tail.decode('utf-8','replace')
def copy(src,dst):
 assert src.is_file() and not src.is_symlink() and not src.name.startswith('.env')
 dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dst)
def stage(folder):
 allowed=['apps/web/src','apps/mobile/src','apps/mobile/app','apps/desktop/electron','apps/desktop/renderer','scripts/security','packages','scripts','tests/harness','tests/harness-integration']
 for rel in allowed:
  for base,dirs,files in os.walk(ROOT/rel,followlinks=False):
   dirs[:]=[d for d in dirs if d not in ['node_modules','.git','.next','dist'] and not (Path(base)/d).is_symlink()]
   for name in files:
    p=Path(base)/name
    if p.suffix in ['.ts','.tsx','.js','.cjs','.mjs','.json','.css','.html'] and not name.startswith('.env'):copy(p,folder/p.relative_to(ROOT))
 for f in ['tsconfig.base.json','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','prisma/schema.prisma','prisma/admin-mfa/revocation.sql','prisma/migrations/20261115010000_admin_mfa/migration.sql','apps/web/tsconfig.json','apps/web/next-env.d.ts','apps/web/next.config.ts','apps/web/package.json','apps/mobile/tsconfig.json','apps/mobile/package.json','apps/mobile/expo-env.d.ts','apps/mobile/app.json','apps/mobile/metro.config.js','apps/desktop/tsconfig.json','apps/desktop/tsconfig.build.json','apps/desktop/electron-builder.json','apps/desktop/package.json','scripts/harness/tsconfig.json','.orchestra/harness/playwright.config.ts','.orchestra/playwright.config.ts','playwright.config.ts']:
  if (ROOT/f).exists():copy(ROOT/f,folder/f)
 for p in (ROOT/'prisma/super-user-v1').glob('*.sql'):copy(p,folder/p.relative_to(ROOT))
 for f in TESTS+list(STAGING_TESTS.values())+['tests/security/typescript-register.cjs','tests/sprint-2/allowed-tests.json','tests/sprint-5/prisma-course-rls.sql','tests/sprint-6/rls-principals.sql']:
  if (ROOT/f).exists():copy(ROOT/f,folder/f)
 for name in ['programming','database','networking','webdev','cybersecurity']:
  p=ROOT/f'apps/web/public/course-banners/mobile/{name}.svg'
  copy(p,folder/p.relative_to(ROOT))
 for folder_name in ['apps/mobile/assets','apps/web/src/fonts']:
  for p in (ROOT/folder_name).rglob('*'):
   if p.is_file() and not p.is_symlink():copy(p,folder/p.relative_to(ROOT))
 # Shared test helpers only; do not stage blocked suites or broad launchers.
 for f in ['tests/codelab/helpers.cjs','tests/codelab/fixture.cjs']:
  if (ROOT/f).exists():copy(ROOT/f,folder/f)
 (folder/'tests/sprint-1').mkdir(parents=True,exist_ok=True)
 (folder/'tests/sprint-1/network-guard.cjs').write_text("globalThis.fetch=async()=>{throw Error('External fetch forbidden by Sprint 2 fixture')};const M=require('node:module');const resolve=M._resolveFilename;M._resolveFilename=function(n,p,...a){return resolve.call(this,n==='@prisma/client'?process.cwd()+'/generated/client/index.js':n,p,...a)};",encoding='utf-8')
 # Workspace package links must resolve only the matching current public source.
 for p in (ROOT/'packages').glob('*/src'):
  shutil.copytree(p,DEPS/'packages'/p.parent.name/'src',dirs_exist_ok=True)
def main(label,mode='tests',network='none',fixture=None):
 assert label.replace('-','').isalnum();base=HERE/label;base.mkdir();source=base/'source';source.mkdir();stage(source)
 selected=TESTS if mode=='tests' else []
 testing = mode=='tests' or mode in STAGING_TESTS
 if testing:
  if mode in STAGING_TESTS:
   assert fixture is not None and network.startswith('container:lms-sprint2-pg-')
   selected=[STAGING_TESTS[mode]]
  assert all((f in TESTS or f in STAGING_TESTS.values()) and not any(f.startswith(b) for b in BLOCKED) for f in selected)
  argv=['node','--require','./tests/sprint-1/network-guard.cjs','--require','./tests/security/typescript-register.cjs','--test','--test-concurrency=1',*selected]
 elif mode=='web-types':argv=['sh','-c','node /deps/node_modules/prisma/build/index.js generate --config ./prisma.sprint.config.ts && for x in /deps/node_modules/.pnpm/@prisma+client@7.9.1*/node_modules; do ln -s \"$x\" generated/client/node_modules; break; done && cd apps/web && node node_modules/next/dist/bin/next typegen && node node_modules/typescript/bin/tsc --noEmit --incremental false']
 elif mode=='mobile-types':argv=['sh','-c','node /deps/node_modules/prisma/build/index.js generate --config ./prisma.sprint.config.ts && for x in /deps/node_modules/.pnpm/@prisma+client@7.9.1*/node_modules; do ln -s \"$x\" generated/client/node_modules; break; done && cd apps/mobile && node node_modules/typescript/bin/tsc --noEmit --incremental false']
 elif mode=='mobile-export':argv=['sh','-c','cd apps/mobile && node node_modules/expo/bin/cli export --platform android --platform ios --output-dir /scratch/mobile-export --max-workers 2']
 elif mode=='web-build':argv=['sh','-c','node /deps/node_modules/prisma/build/index.js generate --config ./prisma.sprint.config.ts && for x in /deps/node_modules/.pnpm/@prisma+client@7.9.1*/node_modules; do ln -s "$x" generated/client/node_modules; break; done && node scripts/prepare-codelab-runtimes.mjs && cd apps/web && node node_modules/next/dist/bin/next build --webpack && test -s .next/BUILD_ID && test -s .next/required-server-files.json && test -s .next/server/app/api/health/route.js.nft.json && printf "Build ID: " && cat .next/BUILD_ID']
 elif mode=='web-runtimes':argv=['sh','-c','node scripts/prepare-codelab-runtimes.mjs && test -s apps/web/public/codelab-runtime/pyodide-314.0.7/pyodide.asm.wasm && test -s apps/web/public/codelab-runtime/sql.js-1.15.2/sql-wasm.wasm']
 elif mode=='sbom':argv=['node','scripts/security/sbom.cjs','/deps',subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'-']
 elif mode=='desktop-package':argv=['sh','-c','cd apps/desktop && node ../../node_modules/typescript/bin/tsc -p tsconfig.build.json && node node_modules/electron-builder/out/cli/cli.js --dir --win --x64 --publish never -c.electronDist=/tools/electron-win -c.win.signAndEditExecutable=false && node ../../scripts/security/inspect-package.cjs']
 elif mode=='desktop-compile':argv=['sh','-c','cd apps/desktop && node ../../node_modules/typescript/bin/tsc -p tsconfig.build.json && test -s dist/electron/main.js && test -s dist/electron/preload.js']
 elif mode=='desktop-types':argv=['sh','-c','cd apps/desktop && node ../../node_modules/typescript/bin/tsc --noEmit --incremental false']
 elif mode=='harness-types':argv=['sh','-c','node /deps/node_modules/prisma/build/index.js generate --config ./prisma.sprint.config.ts && for x in /deps/node_modules/.pnpm/@prisma+client@7.9.1*/node_modules; do ln -s \"$x\" generated/client/node_modules; break; done && node node_modules/typescript/bin/tsc --noEmit --incremental false --project scripts/harness/tsconfig.json']
 else:raise ValueError(mode)
 if mode not in ['desktop-types','desktop-compile','desktop-package','sbom','web-runtimes']:
  schema=source/'prisma/schema.prisma';original=schema.read_text(encoding='utf-8');assert original.count('generator client {')==1
  schema.write_text(original.replace('generator client {','generator client {\n  output = \"../generated/client\"',1),encoding='utf-8')
  (source/'prisma.sprint.config.ts').write_text("export default {schema:'./prisma/schema.prisma',datasource:{url:'postgresql://dummy:unused@127.0.0.1:1/sprint2_offline'}};",encoding='utf-8')
  for f,prefix in [('apps/web/tsconfig.json','../../'),('apps/mobile/tsconfig.json','../../'),('scripts/harness/tsconfig.json','../../')]:
   config=source/f;data=json.loads(config.read_text(encoding='utf-8'));opt=data.setdefault('compilerOptions',{});opt.setdefault('paths',{})['@prisma/client']=[prefix+'generated/client'];config.write_text(json.dumps(data,indent=2),encoding='utf-8')
 if testing:
  argv=['sh','-c','node /deps/node_modules/prisma/build/index.js generate --config ./prisma.sprint.config.ts && for x in /deps/node_modules/.pnpm/@prisma+client@7.9.1*/node_modules; do ln -s \"$x\" generated/client/node_modules; break; done && exec \"$@\"','scoped-tests',*argv]
 name='lms-sprint2-'+uuid.uuid4().hex;labelvalue=name
 linux='/mnt/host/'+str(DEPS).replace('\\','/')[0].lower()+str(DEPS).replace('\\','/')[2:] if os.name=='nt' else str(DEPS)
 scratch_mb=4096 if mode=='web-build' else 1024
 scratch_dir=base/'scratch' if mode=='web-build' else None
 if scratch_dir is not None:
  scratch_dir.mkdir();os.chmod(scratch_dir,0o777)
 fsize_bytes=1073741824 if mode=='web-build' else 536870912
 # The capability-dropped sandbox cannot preserve the host runner's UID or GID.
 shell='cp -a --no-preserve=ownership /source /scratch/app && cp /tools/esbuild /scratch/esbuild && chmod 500 /scratch/esbuild && cd /scratch/app && ln -s /deps/node_modules node_modules && for x in web mobile desktop; do ln -s /deps/apps/$x/node_modules apps/$x/node_modules; done && exec "$@"'
 memory='6144m' if mode=='web-build' else '4096m' if mode in ['web-types','web-build','mobile-export'] else '2304m';seconds=600 if mode in ['mobile-export','web-build'] else 300 if mode in ['web-types','web-build','mobile-export','tests','desktop-package'] else 180
 env=['NODE_OPTIONS=--max-old-space-size='+('3584' if mode=='web-build' else '3072' if mode in ['web-types','mobile-export'] else '1536'),'PATH=/usr/local/bin:/usr/bin:/bin','HOME=/scratch','TMPDIR=/scratch','NODE_ENV=test','NEXT_TELEMETRY_DISABLED=1','DATABASE_URL=postgresql://dummy:unused@127.0.0.1:1/sprint2_offline','ESBUILD_BINARY_PATH=/scratch/esbuild','TSX_TSCONFIG_PATH=apps/web/tsconfig.json','EXPO_OFFLINE=1','EXPO_NO_TELEMETRY=1','EXPO_PUBLIC_API_URL=https://staging.example.invalid','SENTRY_DISABLE_AUTO_UPLOAD=true']
 scratch_mount=['--mount',f'type=bind,source={scratch_dir},target=/scratch'] if scratch_dir is not None else ['--tmpfs',f'/scratch:rw,exec,nosuid,nodev,size={scratch_mb}m,mode=1777']
 cmd=['docker','run','--pull=never','--name',name,'--label','lms.sprint2='+labelvalue,'--network',network,'--ipc','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory',memory,'--cpus','2','--pids-limit','128','--ulimit','core=0:0','--ulimit','nofile=4096:4096','--ulimit',f'fsize={fsize_bytes}:{fsize_bytes}',*scratch_mount,'--mount',f'type=bind,source={source},target=/source,readonly','--mount',f'type=bind,source={DEPS},target=/deps,readonly','--mount',f'type=bind,source={DEPS},target={linux},readonly','--mount',f'type=bind,source={TOOLS},target=/tools,readonly','--entrypoint','/usr/bin/env',json.loads((ROOT/'scripts/security/tools.json').read_text())['nodeImage'],'-i',*env,'timeout','--kill-after=5s',str(seconds)+'s','sh','-c',shell,'sprint2',*argv]
 if os.name == 'posix':
  # Match the install owner so Prisma detects the read-only mount instead of an ownership error.
  index=cmd.index('--entrypoint')
  cmd[index:index]=['--user',f'{os.geteuid()}:{os.getegid()}']
 if mode in STAGING_TESTS:
  index=cmd.index('--entrypoint')
  cmd[index:index]=['--mount',f'type=bind,source={fixture},target=/fixture,readonly']
  envindex=cmd.index('-i')+1
  cmd[envindex:envindex]=['SPRINT2_DISPOSABLE=1','ADMIN_MFA_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=']
  old='DATABASE_URL=postgresql://dummy:unused@127.0.0.1:1/sprint2_offline'
  cmd[cmd.index(old)]='DATABASE_URL=postgresql://sprint_app:dummy_fixture_only@127.0.0.1:5432/sprint2_staging'
  env=cmd[cmd.index('-i')+1:cmd.index('timeout')]
 start=time.monotonic()
 try:
  code,out=bounded(cmd,timeout=seconds+20,max_bytes=8388608 if mode=='sbom' else 262144)
  inspectcode,state=bounded(['docker','inspect','--format','{{json .State}}',name]);assert inspectcode==0 and not json.loads(state)['Running']
  counts={key:int(value) for key,value in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$',out,re.M)} if testing else {}
  if code==0 and testing:
   expected=2 if mode=='rls-principals' else 1 if mode in STAGING_TESTS else EXPECTED_TESTS
   assert counts.get('tests')==counts.get('pass')==expected and all(counts.get(k)==0 for k in ['fail','cancelled','skipped','todo']), 'Missing, skipped or unexpected test results'
  receipt={'label':label,'mode':mode,'exit':code,'counts':counts,'seconds':round(time.monotonic()-start,2),'argv':argv,'tests':selected,'safe_environment':env,'limits':{'network':network,'read_only_source_and_tools':True,'scratch_bytes':scratch_mb*1024*1024,'memory_bytes':6442450944 if mode=='web-build' else 4294967296 if mode in ['web-types','web-build','mobile-export'] else 2415919104,'cpus':2,'pids':128,'file_bytes':fsize_bytes,'seconds':seconds},'lock_sha256':hashlib.sha256((DEPS/'pnpm-lock.yaml').read_bytes()).hexdigest(),'source_hashes':{str(p.relative_to(source)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in source.rglob('*') if p.is_file()},'terminated':True}
  if mode=='sbom' and code==0:
   bom=json.loads(out)
   assert bom['bomFormat']=='CycloneDX' and bom['specVersion']=='1.6' and 0<len(bom['components'])<10000
   (base/'sbom.json').write_text(json.dumps(bom,indent=2)+'\n',encoding='utf8')
   out=json.dumps({'bomFormat':bom['bomFormat'],'components':len(bom['components']),'dependencyNodes':len(bom['dependencies'])})
  # Container receives no credentials or retained output directory; only bounded stdout is retained.
  (base/'output.txt').write_text(out,encoding='utf-8');(base/'receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
  print(json.dumps({k:receipt[k] for k in ['label','mode','exit','seconds','terminated']}));print(out[-9000:].encode('ascii','backslashreplace').decode())
 finally:
  c,owner=bounded(['docker','inspect','--format','{{index .Config.Labels "lms.sprint2"}}',name])
  if c==0 and owner.strip()==labelvalue:bounded(['docker','rm','-f',name])
  if scratch_dir is not None:shutil.rmtree(scratch_dir,ignore_errors=True)
 return code
if __name__=='__main__':sys.exit(main(*sys.argv[1:]))
