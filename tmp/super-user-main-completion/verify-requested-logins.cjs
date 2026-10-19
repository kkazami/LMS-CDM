const fs=require('node:fs');
const ph=JSON.parse(fs.readFileSync('tmp/super-user-main-completion/program-head-account-receipt.json'));
const su=JSON.parse(fs.readFileSync('tmp/super-user-main-completion/super-user-setup-receipt.json'));
if(!ph.commitAcknowledged||su.status!=='SETUP_COMPLETED')throw Error('Completed account receipts required.');
const lines=fs.readFileSync(ph.handoffFile,'utf8').split(/\r?\n/);
const entries=ph.accounts.map(account=>({...account,password:lines[lines.indexOf(account.email)+1]}));
const superLines=fs.readFileSync(su.handoffFile,'utf8').split(/\r?\n/);
entries.push({email:su.email,password:superLines.find(s=>s.startsWith('Password: ')).slice('Password: '.length),role:'SUPER_USER'});
const report={startedAt:new Date().toISOString(),base:'http://localhost:3000',scope:'requested account login, own identity, scoped chart/approved metadata and logout only',accounts:[]};
const request=(path,options={})=>fetch(report.base+path,{...options,signal:AbortSignal.timeout(60000)});
(async()=>{try{for(const entry of entries){const result={email:entry.email};report.accounts.push(result);let token;
 try {
  const response=await request('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:entry.email,password:entry.password,instituteCode:'ics'})});result.loginStatus=response.status;if(!response.ok)throw Error('Requested login failed: '+response.status);
  const body=await response.json();token=body.token;if(!token||body.user.role!==entry.role)throw Error('Unexpected authenticated role.');result.role=body.user.role;
  const headers={Authorization:'Bearer '+token};result.identityStatus=(await request('/api/auth/me',{headers})).status;
  if(result.identityStatus!==200)throw Error('Own identity unavailable');
  if(entry.role==='SUPER_USER'){
   result.oversight=[];for(const code of ['ics','ibe','ite']){const r=await request('/api/academic-oversight/'+code+'/courses',{headers});const record={institute:code,status:r.status};result.oversight.push(record);if(!r.ok)throw Error('Approved oversight unavailable: '+code+' '+r.status);const data=await r.json();record.courseCount=data.courses.length;record.joinCodesBlank=data.courses.every(c=>c.courseCode==='');if(!record.joinCodesBlank)throw Error('Join-code disclosure');
    if(data.courses.length){const detail=await request('/api/academic-oversight/'+code+'/courses/'+encodeURIComponent(data.courses[0].id),{headers});record.firstCourseDetailStatus=detail.status;if(!detail.ok)throw Error('Course detail policy binding failed: '+code+' '+detail.status);}
   }
   result.instituteAdminListStatus=(await request('/api/super-user/ics/institute-admins',{headers})).status;if(result.instituteAdminListStatus!==200)throw Error('Institute Admin directory unavailable');
  }else{
   const r=await request('/api/programs/'+entry.programId+'/chart',{headers});result.chartStatus=r.status;if(!r.ok)throw Error('Requested Program Head chart unavailable: '+r.status);const chart=await r.json();result.currentHead=chart.isHead;result.facultyCount=chart.members.length;if(!chart.isHead)throw Error('Current Program Head assignment missing');
   const page=await request('/ics/organization',{headers:{Cookie:'lumina_session='+token}});result.organizationPageStatus=page.status;if(!page.ok)throw Error('Program Head page unavailable');const html=await page.text();if(!html.includes('Organizational Chart'))throw Error('Expected chart page missing');
  }
 }finally{if(token){const logout=await request('/api/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+token}});result.logoutStatus=logout.status;if(!logout.ok)throw Error('Verification-session cleanup failed');}}
 }}catch(error){report.error=error.message;process.exitCode=1;}finally{report.finishedAt=new Date().toISOString();fs.writeFileSync('tmp/super-user-main-completion/requested-login-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}})();
