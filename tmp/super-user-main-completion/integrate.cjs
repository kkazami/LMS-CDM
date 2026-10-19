const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),ts=require(require.resolve('typescript',{paths:[path.resolve('apps/web')]}));
const candidate=path.resolve('.orchestra/local-worktrees/super-user-v1');
const out=path.resolve('tmp/super-user-main-completion',String(Date.now()));fs.mkdirSync(out,{recursive:true});
const report={createdAt:new Date().toISOString(),branch:'main',profile:'trusted-local',records:[],api:[],actions:[],pages:[]};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function save(file,bytes){const exists=fs.existsSync(file),before=exists?fs.readFileSync(file):null;if(before?.equals(Buffer.from(bytes)))return; if(before){const p=path.join(out,'before',file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,before);}fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);report.records.push({path:file,action:exists?'UPDATE':'ADD',beforeSHA256:before?sha(before):null,sha256:sha(bytes)});}
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):e.isFile()?[path.join(dir,e.name).replaceAll('\\','/')]:[]);}
const groups=['apps/web/src/app/api/academic-oversight','apps/web/src/app/api/super-user','apps/web/src/app/(dashboard)/[institute]/academic-operations','apps/web/src/components/super-user-v1'];
for(const dir of groups)for(const absolute of files(path.join(candidate,dir))){const relative=path.relative(candidate,absolute).replaceAll('\\','/');if(fs.existsSync(relative))throw Error('Unexpected existing target '+relative);save(relative,fs.readFileSync(absolute));}
for(const name of ['oversight','metadata-policy','dto','institute-admin']){const p=`apps/web/src/lib/super-user-v1/${name}.ts`;save(p,fs.readFileSync(path.join(candidate,p)));}
for(const p of ['apps/web/src/lib/auth-session.ts','apps/web/src/lib/api-auth.ts','apps/web/src/app/api/auth/login/route.ts','apps/web/src/app/api/auth/logout/route.ts','apps/web/src/app/api/auth/forgot-password/route.ts','apps/web/src/app/api/auth/reset-password/route.ts'])save(p,fs.readFileSync(path.join(candidate,p)));
// Explicitly preserve legacy ADMIN's current workflows; no mapping or aliasing.
save('apps/web/src/lib/super-user-v1/legacy-entry-guard.ts',`import { getSession } from '@/lib/auth-session';
import { getSessionFromRequest } from '@/lib/api-auth';
import { canonicalRole } from './capabilities';
import { AccessError } from './actor';
const legacy = (role: unknown) => ['ADMIN','INSTRUCTOR','STUDENT'].includes(canonicalRole(role));
/** Dedicated roles never inherit legacy authority through permission strings. */
export async function denyLegacyApi(request: Request, _operation: string): Promise<Response | null> {
  const session = await getSessionFromRequest(request);
  if (!session || legacy(session.user.role)) return null;
  return Response.json({error:{code:'FORBIDDEN',message:'Forbidden.'}},{status:403});
}
export async function requireLegacyActor(_operation: string) {
  const session=await getSession();
  if(!session) throw new AccessError(401,'Authentication required.');
  if(!legacy(session.user.role)) throw new AccessError(403,'Forbidden.');
  return session.user;
}
`);
const dedicated=['academic-oversight/','super-user/','programs/','institute-administration/'];
const publicRoutes=['health/route.ts','institutes/route.ts','public/leaderboard/route.ts'];
const basic=['auth/login/route.ts','auth/logout/route.ts','auth/me/route.ts','auth/forgot-password/route.ts','auth/reset-password/route.ts','auth/register/route.ts'];
const iaBranches={'GET admin/users/route.ts':'USER_LIST','GET admin/users/[userId]/route.ts':'USER_DETAIL','PATCH admin/users/[userId]/route.ts':'USER_UPDATE','PATCH admin/users/[userId]/status/route.ts':'USER_STATUS','GET courses/route.ts':'COURSE_LIST','GET courses/[courseId]/route.ts':'COURSE_DETAIL'};
function exported(n){return n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword);}
function importsAfterDirectives(sf,text,line){let pos=0;for(const s of sf.statements){if(ts.isExpressionStatement(s)&&ts.isStringLiteral(s.expression))pos=s.end;else break;}return text.slice(0,pos)+(pos?'\n':'')+line+'\n'+text.slice(pos);}
for(const p of files('apps/web/src/app/api').filter(p=>p.endsWith('/route.ts'))){const rel=p.slice('apps/web/src/app/api/'.length);if(dedicated.some(d=>rel.startsWith(d))||publicRoutes.includes(rel)||basic.includes(rel))continue;
 const text=fs.readFileSync(p,'utf8'),sf=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true);const edits=[];let ia=false;
 for(const n of sf.statements){if(!ts.isFunctionDeclaration(n)||!exported(n)||!n.body||!['GET','POST','PUT','PATCH','DELETE','HEAD'].includes(n.name?.text))continue;
 const verb=n.name.text;let request=n.parameters[0]?.name.getText(sf);if(request&&!/^[\w$]+$/.test(request))throw Error('Destructured route request '+p);if(!request){request='ceilingRequest';edits.push({pos:n.parameters.pos,text:'ceilingRequest: Request'});}
 const operation=verb+' '+rel;const branch=iaBranches[operation];let pre='';if(branch){ia=true;const param=n.parameters[1]?.name.getText(sf);const target=['USER_DETAIL','USER_UPDATE','USER_STATUS'].includes(branch)?`, (await ${param}.params).userId`:branch==='COURSE_DETAIL'?`, (await ${param}.params).courseId`:'';pre=`\n  const instituteResponse = await instituteAdminOperation(${request}, ${JSON.stringify(branch)}${target});\n  if (instituteResponse) return instituteResponse;`;}
 edits.push({pos:n.body.getStart(sf)+1,text:`${pre}\n  const ceilingDenial = await denyLegacyApi(${request}, ${JSON.stringify(operation)});\n  if (ceilingDenial) return ceilingDenial;\n`});report.api.push({path:p,verb,iaBranch:branch??null});}
 if(edits.length){let revised=text;for(const e of edits.sort((a,b)=>b.pos-a.pos))revised=revised.slice(0,e.pos)+e.text+revised.slice(e.pos);revised=importsAfterDirectives(sf,revised,`import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';${ia?"\nimport { instituteAdminOperation } from '@/lib/super-user-v1/institute-admin';":''}`);save(p,revised);}
}
// All server-action entrypoints, including inline actions, receive their own ceiling.
for(const p of files('apps/web/src').filter(p=>/\.(ts|tsx)$/.test(p)&&!p.includes('/lib/super-user-v1/'))){
 const text=fs.readFileSync(p,'utf8');if(/^\s*['"]use client['"]/.test(text))continue;const sf=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true);const server=/^\s*['"]use server['"]/.test(text),edits=[];
 function visit(n){if((ts.isFunctionDeclaration(n)||ts.isArrowFunction(n)||ts.isFunctionExpression(n))&&n.body&&ts.isBlock(n.body)){
  const inline=n.body.statements[0]&&ts.isExpressionStatement(n.body.statements[0])&&n.body.statements[0].expression.text==='use server';
  const exportedAction=server&&(exported(n)||ts.isVariableDeclaration(n.parent)&&exported(n.parent.parent.parent));
  const skill=p.includes('/lib/skills/')&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)&&(exported(n)||ts.isVariableDeclaration(n.parent));
  if(inline||exportedAction||skill){const name=n.name?.getText(sf)||n.parent.name?.getText(sf)||'inline';const pos=inline?n.body.statements[0].end:n.body.getStart(sf)+1;edits.push({pos,text:`\n  await requireLegacyActor(${JSON.stringify(p+'#'+name)});\n`});report.actions.push({path:p,name,inline:!!inline});}}
 ts.forEachChild(n,visit);}
 visit(sf);if(edits.length){let revised=text;for(const e of edits.sort((a,b)=>b.pos-a.pos))revised=revised.slice(0,e.pos)+e.text+revised.slice(e.pos);save(p,importsAfterDirectives(sf,revised,"import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';"));}
}
// Direct page/RSC execution must deny separately from its parent layout.
for(const p of files('apps/web/src/app/(dashboard)').filter(p=>p.endsWith('/page.tsx')&&!p.includes('/academic-operations/')&&!p.includes('/institute-administration/')&&!p.includes('/organization/'))){const text=fs.readFileSync(p,'utf8');if(/^\s*['"]use client['"]/.test(text))continue;const sf=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true);const edits=[];
 for(const n of sf.statements){if(!ts.isFunctionDeclaration(n)||!n.body||!n.modifiers?.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword))continue;edits.push({pos:n.body.getStart(sf)+1,text:`\n  await requireLegacyActor(${JSON.stringify(p)});\n`});if(!n.modifiers.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)){const f=text.indexOf('function',n.getStart(sf));edits.push({pos:f,text:'async '});}report.pages.push(p);}
 if(edits.length){let revised=text;for(const e of edits.sort((a,b)=>b.pos-a.pos))revised=revised.slice(0,e.pos)+e.text+revised.slice(e.pos);save(p,importsAfterDirectives(sf,revised,"import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';"));}}
fs.writeFileSync(path.join(out,'changes.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({evidence:out,changedFiles:report.records.length,api:report.api.length,actions:report.actions.length,pages:report.pages.length}));
