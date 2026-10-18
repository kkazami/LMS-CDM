import { randomUUID } from 'node:crypto';

/** Operator-only transaction. Caller verifies the database and handles secrets.
 * Keeps the existing assignment/audit triggers enabled; never promotes an Admin.
 */
export async function provisionProgramHeads(client, { administratorEmail, accounts, requestReference }) {
  if (!administratorEmail || !requestReference || !Array.isArray(accounts) || !accounts.length) throw Error('Explicit setup authority required.');
  for (const account of accounts) {
    if (!['BSIT','BSCPE'].includes(account.programCode) || !/^[^\s@]+@[^\s@]+$/.test(account.email)
      || !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(account.passwordHash)) throw Error('Invalid explicit account setup.');
  }
  if (new Set(accounts.map(a=>a.email.toLowerCase())).size !== accounts.length) throw Error('Duplicate requested email.');
  let committing = false;
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL statement_timeout='15s'; SET LOCAL lock_timeout='3s'");
    const admin = (await client.query('SELECT u.id,u.role,u."isActive",u."instituteId",i.code FROM public."User" u JOIN public."Institute" i ON i.id=u."instituteId" WHERE lower(u.email)=$1 FOR UPDATE OF u,i',[administratorEmail.toLowerCase()])).rows[0];
    if (!admin || admin.role !== 'ADMIN' || !admin.isActive || admin.code !== 'ics') throw Error('Active ICS administrator required; no mutation.');
    await client.query("SELECT set_config('lms.assignment_actor_id',$1,true)",[admin.id]);
    const created = [];
    for (const account of accounts) {
      const email = account.email.toLowerCase();
      if ((await client.query('SELECT 1 FROM public."User" WHERE lower(email)=$1',[email])).rowCount) throw Error('Requested email already exists; reconcile rather than overwrite.');
      const matching = (await client.query('SELECT id,"isActive" FROM public."AcademicProgram" WHERE "instituteId"=$1 AND upper(code)=$2 ORDER BY id FOR UPDATE',[admin.instituteId,account.programCode])).rows;
      if (matching.length>1 || matching[0]?.isActive===false) throw Error('Program state requires reconciliation.');
      const programId=matching[0]?.id??randomUUID();
      if (!matching.length) await client.query('INSERT INTO public."AcademicProgram" (id,"instituteId",code,name) VALUES ($1,$2,$3,$4)',[programId,admin.instituteId,account.programCode,account.programCode==='BSIT'?'BSIT':'BSCpE']);
      const id=randomUUID();
      await client.query('INSERT INTO public."User" (id,name,email,password,role,"isActive","instituteId",permissions) VALUES ($1,$2,$3,$4,\'PROFESSOR\',true,$5,\'[]\')',[id,account.programCode+' Program Head',email,account.passwordHash,admin.instituteId]);
      await client.query('INSERT INTO public."ProgramMembership" ("programId","userId","instituteId",kind,"isActive") VALUES ($1,$2,$3,\'INSTRUCTOR\',true)',[programId,id,admin.instituteId]);
      await client.query('INSERT INTO public."ProgramHeadAssignment" ("programId","userId","isActive") VALUES ($1,$2,true)',[programId,id]);
      if (!(await client.query('SELECT 1 FROM public."ProgramChartNode" WHERE "programId"=$1 AND kind=\'ROOT\'',[programId])).rowCount) await client.query('INSERT INTO public."ProgramChartNode" (id,"programId",kind,label) VALUES ($1,$2,\'ROOT\',$3)',[randomUUID(),programId,account.programCode+' faculty']);
      await client.query('UPDATE public."AcademicProgram" SET "chartVersion"="chartVersion"+1 WHERE id=$1',[programId]);
      await client.query('INSERT INTO public."AuditLog" (id,"adminId","targetId",action,metadata) VALUES ($1,$2,$3,\'PROGRAM_HEAD_OPERATOR_SETUP\',$4)',[randomUUID(),admin.id,id,JSON.stringify({instituteId:admin.instituteId,programId,requestReference,accountRole:'PROFESSOR',designation:'PROGRAM_HEAD',databaseSetup:true})]);
      created.push({email,id,programId,programCode:account.programCode,role:'PROFESSOR',designation:'PROGRAM_HEAD'});
    }
    committing=true; await client.query('COMMIT');
    return {commitAcknowledged:true,accounts:created};
  } catch(error) {
    if (committing) throw Error('COMMIT_OUTCOME_UNCERTAIN: reconcile requested emails before retrying.');
    await client.query('ROLLBACK'); throw error;
  }
}
