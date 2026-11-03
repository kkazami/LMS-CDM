import { db } from '@/lib/db';
import { rosterWhere, staffOnly, type Actor } from './access';
import { OhmwardError } from '../domain/schema';
import { serializeAttempt } from './service';

function studentScope(actor:Actor,studentId?:string){staffOnly(actor);return {...rosterWhere(actor),...(studentId?{id:studentId}:{})};}
export async function submittedInspection(actor:Actor,attemptId:string){
  const scope=studentScope(actor);
  const row=await db.ohmwardAttempt.findFirst({where:{id:attemptId,instituteId:actor.instituteId,status:'SUBMITTED',learner:{student:{is:scope}}},include:{learner:{select:{student:{select:{id:true,name:true,studentNumber:true}}}}}});
  if(!row)throw new OhmwardError(404,'Submitted attempt not found in your authorized roster.');
  return {student:row.learner.student,attempt:serializeAttempt(row)};
}
export async function studentInspection(actor:Actor,studentId:string,page=1){
  const scope=studentScope(actor,studentId);
  if(!Number.isInteger(page)||page<1||page>100000)throw new OhmwardError(400,'Invalid attempt page.');
  const student=await db.user.findFirst({where:scope,select:{id:true,name:true,studentNumber:true,ohmwardLearner:{select:{progress:{select:{levelId:true,bestScore:true,bestStars:true,firstPassedAt:true,submittedCount:true}}}}}});
  if(!student)throw new OhmwardError(404,'Student not found in your authorized roster.');
  const where={studentId,instituteId:actor.instituteId,status:'SUBMITTED',learner:{student:{is:scope}}};
  const [total,attempts]=await Promise.all([db.ohmwardAttempt.count({where}),db.ohmwardAttempt.findMany({where,skip:(page-1)*25,take:25,orderBy:[{submittedAt:'desc'},{id:'desc'}],select:{id:true,levelId:true,contentVersion:true,variantId:true,submittedAt:true}})]);
  return {student,attempts:attempts.map(row=>({...row,submittedAt:row.submittedAt!.toISOString()})),page,pageSize:25,total};
}
