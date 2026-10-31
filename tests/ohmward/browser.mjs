import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fixture, capture, webRequire } from './fixture.mjs';
import { createWebWorkspace } from '../roster/web-workspace.mjs';
import { safeEnvironment, sourceManifest, sha } from '../../scripts/ohmward/evidence.mjs';

const require=createRequire(import.meta.url);
let context, workspace, server;
const output=path.resolve('tmp/roster-import/ohmward-browser-'+Date.now()); fs.mkdirSync(output,{recursive:true});
try {
  context=await fixture({boundary:true});
  const reuseIndex=process.argv.indexOf('--reuse-app'), reuse=reuseIndex<0?null:fs.realpathSync(process.argv[reuseIndex+1]);
  const skipBuild=process.argv.includes('--skip-build');
  const standardBuild=process.argv.includes('--standard-build');
  const productFingerprint=sha(JSON.stringify(sourceManifest().entries.filter(entry=>!entry.file.startsWith('tests/')&&!entry.file.startsWith('scripts/')&&entry.file!=='.env.example')));
  if(skipBuild&&!reuse)throw Error('Skipping a build requires the verified owned copy.');
  if(reuse){
    if(!reuse.startsWith(path.resolve('tmp/roster-import/ohmward-browser-')) || !reuse.endsWith(path.join('apps','web')) || !fs.existsSync(path.join(reuse,'next.config.ts')))throw Error('Reuse requires a task-owned source copy.');
    if(skipBuild){const marker=JSON.parse(fs.readFileSync(path.join(reuse,'owned-ohmward-build.json'),'utf8'));if(marker.productFingerprint!==productFingerprint)throw Error('Product changed; a fresh build is required.');}
    else{fs.cpSync(path.resolve('apps/web/src'),path.join(reuse,'src'),{recursive:true});fs.copyFileSync(path.resolve('apps/web/package.json'),path.join(reuse,'package.json'));fs.copyFileSync(path.resolve('apps/web/next.config.ts'),path.join(reuse,'next.config.ts'));}workspace={appDir:reuse};
  }else workspace=createWebWorkspace(output);
  // Resource settings affect build scheduling only, inside the isolated copy.
  if(!skipBuild){const config=path.join(workspace.appDir,'next.config.ts'); fs.writeFileSync(config,fs.readFileSync(config,'utf8').replace('export default nextConfig;',"nextConfig.experimental = { ...nextConfig.experimental, cpus: 1, webpackMemoryOptimizations: true };\n"+(standardBuild?`nextConfig.turbopack = { ...nextConfig.turbopack, root: ${JSON.stringify(process.cwd())} };\n`:'')+"export default nextConfig;"));}
  const port=await new Promise(resolve=>{const socket=net.createServer();socket.listen(0,'127.0.0.1',()=>{const port=socket.address().port;socket.close(()=>resolve(port));});});
  const origin=`http://127.0.0.1:${port}`;
  const env={...context.env,NODE_ENV:'production',OHMWARD_ENABLED:'true',APP_BASE_URL:origin,NEXT_PUBLIC_APP_URL:origin,EMAIL_INVITATIONS_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1',DATABASE_POOL_MAX:'8'};
  if(!skipBuild){
    if(standardBuild){const workspaceRoot=path.resolve(workspace.appDir,'../..');fs.cpSync(path.resolve('prisma'),path.join(workspaceRoot,'prisma'),{recursive:true});fs.copyFileSync(path.resolve('prisma.config.ts'),path.join(workspaceRoot,'prisma.config.ts'));const pnpm=path.join(process.env.APPDATA,'npm/node_modules/pnpm/bin/pnpm.cjs');await capture('pnpm-build-web',process.execPath,[pnpm,'build:web'],env,workspaceRoot);}
    else await capture('owned-production-build',process.execPath,[webRequire.resolve('next/dist/bin/next'),'build','--webpack'],env,workspace.appDir);
    fs.writeFileSync(path.join(workspace.appDir,'owned-ohmward-build.json'),JSON.stringify({owned:true,productFingerprint}));console.log('PASS production build in owned source copy with disposable database');}
  else console.log('PASS reused production build with matching product fingerprint');
  const state=path.join(context.output,'browser-state.json'); fs.writeFileSync(state,JSON.stringify({owned:true,origin,tokens:context.tokens,output,appDir:workspace.appDir}));
  server=spawn(process.execPath,[webRequire.resolve('next/dist/bin/next'),'start','-H','127.0.0.1','-p',String(port)],{env,cwd:workspace.appDir,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const serverLog=fs.createWriteStream(path.join(output,'server.txt')); server.stdout.pipe(serverLog,{end:false}); server.stderr.pipe(serverLog,{end:false});
  let exited=false; server.on('exit',()=>{exited=true;}); server.on('error',()=>{exited=true;});
  const deadline=Date.now()+60000;
  while(true){if(exited||Date.now()>deadline)throw Error('Owned web server did not become ready.');try{const response=await fetch(origin+'/login?institute=ics');if(response.ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,300));}
  console.log('PASS owned web server readiness');
  if(process.argv.includes('--manual')){
    const actorIndex=process.argv.indexOf('--actor'),actor=actorIndex<0?'student':process.argv[actorIndex+1];if(!context.tokens[actor])throw Error('Unknown synthetic fixture actor.');
    const {chromium}=require('playwright');const browser=await chromium.launch({channel:'chrome',headless:false});const tab=await browser.newContext({baseURL:origin});await tab.addCookies([{name:'lumina_session',value:context.tokens[actor],url:origin,httpOnly:true,sameSite:'Lax'}]);const page=await tab.newPage();await page.goto(origin+'/ics/activities/ohmward');
    console.log('Owned manual fixture opened for '+actor+'. Close its browser or press Ctrl+C to stop and close the disposable database.');
    await new Promise(resolve=>{browser.once('disconnected',resolve);process.once('SIGINT',resolve);});await browser.close();
  }else{
  await capture('playwright',process.execPath,[require.resolve('@playwright/test/cli'),'test','--config','playwright.ohmward.config.ts'],{...safeEnvironment(),OHMWARD_BROWSER_STATE:state});
  console.log('PASS Playwright cookie-session journey, negative APIs, roster, themes and responsive interaction');
  }
}catch(error){console.error('OHMWARD_BROWSER_FAILED',String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g,'[REDACTED owned connection]'));process.exitCode=1;}
finally{
  if(server){server.kill();await new Promise(resolve=>{if(server.exitCode!==null)return resolve();server.once('exit',resolve);setTimeout(resolve,10000);});}
  await context?.stop();
  if(workspace){fs.writeFileSync(path.join(output,'owned-app-path.txt'),workspace.appDir);console.log('Owned source copy retained for review: '+path.relative(process.cwd(),workspace.appDir));}
}
