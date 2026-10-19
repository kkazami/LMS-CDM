const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{parseEnv}=require('node:util'),{spawnSync}=require('node:child_process'),{Client}=require('pg'),{hash}=require('bcryptjs');
const attempt='program_heads_'+Date.now();
const handoffDirectory=path.join(process.env.LOCALAPPDATA,'LuminaLMS','account-handoffs',attempt);
const handoffFile=path.join(handoffDirectory,'program-head-logins.txt');
const quote=s=>s.replaceAll("'","''");
const root=parseEnv(fs.readFileSync('.env','utf8')),web=parseEnv(fs.readFileSync('apps/web/.env.local','utf8'));
const value=web.DATABASE_URL||root.DATABASE_URL,target=new URL(value);
if(target.hostname!=='ep-bold-lab-az9n3hq4-pooler.c-3.ap-southeast-1.aws.neon.tech'||target.pathname!=='/neondb')throw Error('Target mismatch; no connection attempted.');
let client,prepared=false;
(async()=>{try{
 const {provisionProgramHeads}=await import('../../scripts/provision-program-heads.mjs');
 const setup=spawnSync('pwsh.exe',['-NoProfile','-Command',`$ErrorActionPreference='Stop';$directory='${quote(handoffDirectory)}';$allowed=[IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'LuminaLMS/account-handoffs'));if(-not [IO.Path]::GetFullPath($directory).StartsWith($allowed+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Boundary'};if(Test-Path -LiteralPath $directory){throw 'Already exists'};for($p=[IO.Path]::GetDirectoryName($directory);$p;$p=[IO.Path]::GetDirectoryName($p)){if((Test-Path -LiteralPath $p)-and((Get-Item -LiteralPath $p -Force).Attributes-band[IO.FileAttributes]::ReparsePoint)){throw 'Reparse'}};New-Item -ItemType Directory -Path $directory -Force|Out-Null;$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User;$acl=Get-Acl -LiteralPath $directory;$acl.SetAccessRuleProtection($true,$false);$rule=[Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow');$acl.SetAccessRule($rule);Set-Acl -LiteralPath $directory -AclObject $acl;$verified=Get-Acl -LiteralPath $directory;if(-not $verified.AreAccessRulesProtected-or@($verified.Access|Where-Object{$_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value-ne$sid.Value}).Count){throw 'ACL validation'};Write-Output 'ACL_VALIDATED'`],{encoding:'utf8',windowsHide:true});
 if(setup.status!==0||!setup.stdout.includes('ACL_VALIDATED'))throw Error('Protected handoff directory could not be validated.');
 const accounts=[];const lines=['Lumina LMS — Program Head login handoff','Store these passwords securely. This local file is ACL-restricted, not encrypted.','Portal: http://localhost:3000/login?institute=ics',''];
 for(const [programCode,email]of [['BSIT','programhead@bsit.edu.ph'],['BSCPE','programhead@bscpe.edu.ph']]){const password='Lms9!'+crypto.randomBytes(24).toString('base64url');accounts.push({programCode,email,passwordHash:await hash(password,12)});lines.push(programCode,email,password,'');}
 fs.writeFileSync(handoffFile,lines.join('\r\n'),{flag:'wx'});prepared=true;
 client=new Client({connectionString:value,connectionTimeoutMillis:10000});await client.connect();
 if((await client.query('SELECT current_database() db')).rows[0].db!=='neondb')throw Error('Database mismatch');
 const result=await provisionProgramHeads(client,{administratorEmail:'admin@ics.edu.ph',accounts,requestReference:'USER_REQUEST_2026_10_18_ADMIN_ICS_TWO_PROGRAM_HEADS'});
 const record={attempt,createdAt:new Date().toISOString(),...result,administratorEmail:'admin@ics.edu.ph',handoffFile,ACLValidated:true,encrypted:false,CalendarChanges:false,SuperUserCreated:false};
 fs.writeFileSync('tmp/super-user-main-completion/program-head-account-receipt.json',JSON.stringify(record,null,2));
 console.log(JSON.stringify(record,null,2));
}catch(error){const uncertain=String(error.message).includes('COMMIT_OUTCOME_UNCERTAIN');if(prepared&&!uncertain){fs.unlinkSync(handoffFile);fs.rmdirSync(handoffDirectory);}console.error(JSON.stringify({result:uncertain?'COMMIT_OUTCOME_UNCERTAIN':'NO_SUCCESS_RECORDED',error:error.code??error.message,handoffRetained:prepared&&uncertain}));process.exitCode=1;}finally{await client?.end().catch(()=>{});}})();
