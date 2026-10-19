const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const directory=path.resolve('tmp/super-user-main-completion'),requireWeb=require('node:module').createRequire(path.resolve('apps/web/package.json'));
const out=fs.openSync(path.join(directory,'main-dev.stdout.log'),'a'),err=fs.openSync(path.join(directory,'main-dev.stderr.log'),'a');
const allowed=/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|LOCALAPPDATA|APPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)$/i;
const env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.test(key))),NEXT_TELEMETRY_DISABLED:'1'};
const argv=[requireWeb.resolve('next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3000'];
const child=spawn(process.execPath,argv,{cwd:path.resolve('apps/web'),env,detached:true,windowsHide:true,stdio:['ignore',out,err]});
child.on('error',error=>{console.error(error.code);process.exitCode=1;});
child.on('spawn',async()=>{
 fs.closeSync(out);fs.closeSync(err);child.unref();
 const report={pid:child.pid,cwd:path.resolve('apps/web'),argv,startedAt:new Date().toISOString(),ready:false};
 const deadline=Date.now()+60000;
 while(Date.now()<deadline){try{const response=await fetch('http://localhost:3000/api/health',{signal:AbortSignal.timeout(5000)});if(response.ok){report.ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}
 fs.writeFileSync(path.join(directory,'main-dev-start.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.ready)process.exitCode=1;
});
