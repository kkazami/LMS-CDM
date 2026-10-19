// Authorized retry smoke check; no runtime repair, credential refresh or product work.
import fs from 'node:fs';import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
const root=process.cwd(),out=path.join(root,'plans');
const manifest=JSON.parse(fs.readFileSync(path.join(out,'013-independent-hierarchy-review-manifest.json'),'utf8'));
const preflight=JSON.parse(fs.readFileSync(path.join(out,'014-provider-retry-preflight.json'),'utf8'));
const exe=manifest.approvedProvider.executable,worker=manifest.approvedProvider.worker;
const hash=x=>createHash('sha256').update(x).digest('hex');
const clean=x=>String(x).replace(/(?:postgres(?:ql)?|https?):\/\/[^\s/@]+:[^\s/@]+@[^\s"']+/gi,'[REDACTED_URL]').replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[REDACTED_TOKEN]');
if(hash(fs.readFileSync(exe))!==preflight.executableSha256)throw Error('Executable changed after preflight');
for(const r of manifest.requests)if(hash(fs.readFileSync(path.join(out,r.file)))!==r.sha256)throw Error('Review packet drift');
const nonce=randomUUID(),prefix='014-provider-startup-'+nonce,guest='/tmp/su-v1-review-smoke-'+nonce;
const str={type:'string'};const requestId='SU-V1-RETRY-STARTUP';
const packet=JSON.stringify({requestId,instruction:'Acknowledge this harmless startup request only. No tools, reads, commands, network, file edits, approvals or review verdict. Return requestId and acknowledged=true.'});
const schema={type:'object',properties:{requestId:{type:'string',enum:[requestId]},acknowledged:{type:'boolean',enum:[true]}},required:['requestId','acknowledged'],additionalProperties:false};
const schemaFile=path.join(out,prefix+'.schema.json');fs.writeFileSync(schemaFile,JSON.stringify(schema),{flag:'wx'});
const argv=['exec','--interactive',worker,'codex','-a','never','exec','--ignore-user-config','--ignore-rules','--ephemeral','--sandbox','read-only','--skip-git-repo-check','--json','--color','never','-C',guest,'-c','model_provider="sandboxd"','-c','model_providers.sandboxd.name="Docker Sandboxes OAuth broker"','-c','model_providers.sandboxd.base_url="https://chatgpt.com/backend-api/codex"','-c','model_providers.sandboxd.requires_openai_auth=false','-c','mcp_servers={}','-c','features.apps=false','-c','features.plugins=false','-c','features.multi_agent=false','-c','web_search="disabled"','--output-schema',guest+'/schema.json','--output-last-message',guest+'/output.json','-'];
const env={};for(const k of ['PATH','Path','SystemRoot','SYSTEMROOT','COMSPEC','PATHEXT','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA'])if(process.env[k])env[k]=process.env[k];
const opts={env,windowsHide:true,encoding:'utf8',timeout:30000};
let stdout='',stderr='',workerProbe=null,isolationProbe=null,error=null,exitCode=null,timedOut=false;
const startedAt=new Date().toISOString();console.log(JSON.stringify({event:'startup-check-started',startedAt,requestId}));
try{
 workerProbe=execFileSync(exe,['exec',worker,'node','--version'],opts).trim();
 const platform=execFileSync(exe,['exec',worker,'node','-e','process.stdout.write(JSON.stringify({platform:process.platform,uid:process.getuid?.(),node:process.version}))'],opts).trim();
 let mounts;try{mounts=execFileSync(exe,['exec',worker,'findmnt','-rn','-t','virtiofs','-o','TARGET,SOURCE,OPTIONS'],opts).trim();}catch(e){if(e.status===1)mounts='';else throw e;}
 isolationProbe={platform:JSON.parse(platform),virtiofsMounts:mounts};
 if(isolationProbe.platform.platform!=='linux'||/lms-monorepo-skeleton|\/host|\/mnt\/c|\/workspace/.test(mounts))throw Error('Unexpected shared/native worker environment; do not dispatch');
 execFileSync(exe,['exec',worker,'mkdir','-p',guest],opts);
 execFileSync(exe,['cp',schemaFile,worker+':'+guest+'/schema.json'],opts);
 exitCode=await new Promise((resolve,reject)=>{
  const child=spawn(exe,argv,{env,windowsHide:true,shell:false});
  const timer=setTimeout(()=>{timedOut=true;child.kill();},180000);
  child.stdout.on('data',b=>{stdout+=b;if(stdout.length>1000000)child.kill();});child.stderr.on('data',b=>{stderr+=b;});
  child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);resolve(code);});
  child.stdin.end('This is a genuine fresh harmless provider startup verification in the already approved isolated microVM. No tools, file reads, commands, network requests, edits, approvals, product tests or architecture judgment. Only return the schema acknowledgment for the supplied request.\n'+packet);
 });
}catch(e){error=clean(e.message);stderr+=clean(e.stderr?.toString()||'');exitCode=e.status??1;}
stdout=clean(stdout);stderr=clean(stderr);
const events=stdout.split(/\r?\n/).flatMap(line=>{try{return[JSON.parse(line)];}catch{return[];}});
const session=events.find(e=>e.type==='thread.started')?.thread_id||null;
const tools=events.filter(e=>/^item\./.test(e.type||'')&&e.item&&['command_execution','mcp_tool_call','web_search','file_change'].includes(e.item.type));
const receipt={kind:'Harmless approved-provider retry startup; not an architecture verdict',requestId,requestHash:hash(packet),startedAt,finishedAt:new Date().toISOString(),provider:{executable:exe,executableSha256:preflight.executableSha256,worker,backend:'microvm',modelProvider:'sandboxd',guest,argv},sourceDigest:manifest.sourceDigest,contractSha256:manifest.contractSha256,evidenceManifestSha256:manifest.evidenceManifestSha256,workerProbe,isolationProbe,session,exitCode,timedOut,error,prohibitedToolItems:tools.length,successfulSession:false,outputHash:null,outputFile:null,transcriptFile:prefix+'.transcript.jsonl',transcriptHash:hash(stdout),stderrFile:prefix+'.stderr.log',stderrHash:hash(stderr),architectureVerdict:null,repairPerformed:false,endpointDeleted:false,aclChanged:false,manualRestart:false,credentialRefresh:false,fallback:false};
if(exitCode===0&&!timedOut&&session&&!tools.length&&events.some(e=>e.type==='turn.completed')&&!events.some(e=>e.type==='turn.failed')){
 try{
  const outputFile=path.join(out,prefix+'.output.json');execFileSync(exe,['cp',worker+':'+guest+'/output.json',outputFile],opts);
  const raw=fs.readFileSync(outputFile,'utf8'),response=JSON.parse(raw);
  if(response.requestId!==requestId||response.acknowledged!==true)throw Error('Wrong harmless acknowledgment');
  receipt.outputFile=path.basename(outputFile);receipt.outputHash=hash(raw);receipt.successfulSession=true;
 }catch(e){receipt.error=clean(e.message);}
}
fs.writeFileSync(path.join(out,prefix+'.transcript.jsonl'),stdout,{flag:'wx'});fs.writeFileSync(path.join(out,prefix+'.stderr.log'),stderr,{flag:'wx'});
fs.writeFileSync(path.join(out,prefix+'.receipt.json'),JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({event:'startup-check-completed',successfulSession:receipt.successfulSession,session,workerProbe,isolationProbe,error:receipt.error||(!receipt.successfulSession?stderr.slice(-1600):null),receipt:prefix+'.receipt.json'}));
if(!receipt.successfulSession)process.exitCode=1;
