import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { evidenceRoot, sourceManifest, sha } from './evidence.mjs';

fs.mkdirSync(evidenceRoot,{recursive:true});
const manifest=sourceManifest(), snapshots=path.join(evidenceRoot,'source');fs.mkdirSync(snapshots,{recursive:true});
const connected=['.env.example','prisma/schema.prisma','tests/business-plan/business-plan.test.ts','apps/web/src/lib/business-plan/export.ts','apps/web/src/lib/gamification/grant-exp.ts','apps/web/src/lib/gamification/exp-engine.ts','apps/web/src/lib/api-auth.ts','apps/web/src/lib/auth-session.ts','apps/web/src/lib/request-security.ts','apps/web/src/lib/session-policy.ts','apps/web/src/lib/roster/rate-limit.ts','apps/web/src/lib/student-access.ts','apps/web/src/lib/super-user-v1/capabilities.ts','apps/web/src/components/layout/DashboardLayout.tsx','apps/web/src/components/common/PageTransition.tsx'];
const selection=manifest.entries.filter(entry=>entry.file.includes('/ohmward/') && /\.(ts|tsx|mjs|cjs)$/.test(entry.file) || connected.includes(entry.file) || entry.file.includes('20261030000100_ohmward_foundation'));
const source=[];
for(const entry of selection){const destination=path.join(snapshots,entry.file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(entry.file,destination);source.push({...entry,snapshot:path.relative(evidenceRoot,destination).replaceAll('\\','/')});}
fs.writeFileSync(path.join(evidenceRoot,'final-source-manifest.json'),JSON.stringify({...manifest,snapshots:source},null,2));
fs.writeFileSync(path.join(evidenceRoot,'tracked-changes.patch'),execFileSync('git',['-c','core.fsmonitor=false','diff','--','.env.example','package.json','apps/web/src','prisma/schema.prisma','tests/business-plan/business-plan.test.ts'],{encoding:'utf8',windowsHide:true}));
const commands=fs.readdirSync(evidenceRoot).filter(name=>name.endsWith('.command.json')).sort().map(name=>JSON.parse(fs.readFileSync(path.join(evidenceRoot,name),'utf8')));
const lines=['# Verification command index','',`Candidate fingerprint: \`${manifest.fingerprint}\`. Each receipt retains its own execution fingerprint; historical results are not relabeled as final-source results.`,'','| Command | Started (UTC) | Exit | Raw stdout | Raw stderr | Receipt |','|---|---|---:|---|---|---|'];
for(const item of commands){lines.push(`| \`${item.command.join(' ').replaceAll('|','\\|')}\` | ${item.startedAt} | ${item.exitCode} | [stdout](${item.id}.stdout.txt) | [stderr](${item.id}.stderr.txt) | [metadata](${item.id}.command.json) |`);}
fs.writeFileSync(path.join(evidenceRoot,'COMMANDS.md'),lines.join('\n')+'\n');
fs.writeFileSync(path.join(evidenceRoot,'SOURCE.md'),['# Full source snapshots','',`Candidate fingerprint: \`${manifest.fingerprint}\``,'',...source.map(item=>`- [${item.file}](${item.snapshot}) — SHA-256 \`${item.sha256}\``)].join('\n')+'\n');
const visuals=path.join(evidenceRoot,'visuals');fs.mkdirSync(visuals,{recursive:true});
for(const entry of fs.readdirSync('tmp/roster-import',{withFileTypes:true}).filter(item=>item.isDirectory()&&item.name.startsWith('ohmward-browser-'))){
  const directory=path.join('tmp/roster-import',entry.name);
  for(const name of fs.readdirSync(directory).filter(name=>name.endsWith('.png')))fs.copyFileSync(path.join(directory,name),path.join(visuals,entry.name+'-'+name));
  const results=path.join(directory,'results');if(fs.existsSync(results))for(const file of fs.readdirSync(results,{recursive:true}).filter(file=>file.endsWith('.png')||file.endsWith('error-context.md'))){const destination=path.join(visuals,entry.name,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(results,file),destination);}
}
fs.writeFileSync(path.join(evidenceRoot,'VISUALS.md'),['# Captured visual evidence','',...fs.readdirSync(visuals,{recursive:true}).filter(file=>fs.statSync(path.join(visuals,file)).isFile()).sort().map(file=>`- [${file.replaceAll('\\','/')}](${('visuals/'+file).replaceAll('\\','/')})`)].join('\n')+'\n');
const artifacts=fs.readdirSync(evidenceRoot,{recursive:true}).filter(name=>fs.statSync(path.join(evidenceRoot,name)).isFile()&&!name.endsWith('ARTIFACTS.json')).sort().map(file=>({file:file.replaceAll('\\','/'),sha256:sha(fs.readFileSync(path.join(evidenceRoot,file)))}));
fs.writeFileSync(path.join(evidenceRoot,'ARTIFACTS.json'),JSON.stringify(artifacts,null,2));
console.log('Packet annexes captured without truncation. Candidate '+manifest.fingerprint+'. Commands: '+commands.length+'. Source snapshots: '+source.length+'.');
