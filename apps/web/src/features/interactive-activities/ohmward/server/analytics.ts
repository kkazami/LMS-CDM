import 'server-only';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { assertCourse, rosterWhere, type Actor } from './access';
import { activityWindow, cohortMetrics, type ActivityWindow, type LatestEvidence } from '../domain/analytics';
import { OhmwardError } from '../domain/schema';
import { LEVELS } from '../curriculum/catalog';

export function analyticsWindow(from?:string,to?:string):ActivityWindow {
  try{return activityWindow(from,to);}catch(error){throw new OhmwardError(400,error instanceof Error?error.message:'Invalid date range.');}
}
// Read-only snapshot: roster membership and every aggregate use the same authorized identities.
// No learner/workspace creation, answer keys, or draft states enter analytics.
export async function readCohortAnalytics(actor:Actor,options:{courseId?:string;from?:string;to?:string}={}){
  await assertCourse(actor,options.courseId);const window=analyticsWindow(options.from,options.to);
  return db.$transaction(async tx=>{
    const rows=await tx.user.findMany({where:rosterWhere(actor,options.courseId),select:{id:true,ohmwardLearner:{select:{instituteId:true,primerCompletedAt:true,progress:{where:{instituteId:actor.instituteId},select:{levelId:true,firstPassedAt:true}},_count:{select:{attempts:true}}}}}});
    const students=rows.map(row=>({id:row.id,started:row.ohmwardLearner?.instituteId===actor.instituteId&&Boolean(row.ohmwardLearner.primerCompletedAt||row.ohmwardLearner._count.attempts),progress:row.ohmwardLearner?.instituteId===actor.instituteId?row.ohmwardLearner.progress:[]}));
    const empty={attempts:0,students:0,elapsedMs:0,recentAt:null};
    if(!students.length)return cohortMetrics(students,[],empty,[],window);
    const identities=Prisma.join(students.map(s=>s.id)),levels=Prisma.join(LEVELS.map(l=>l.id));
    const scope=Prisma.sql`"instituteId"=${actor.instituteId} AND "studentId" IN (${identities}) AND "levelId" IN (${levels}) AND "status"='SUBMITTED' AND "submittedAt" IS NOT NULL`;
    const latest=await tx.$queryRaw<LatestEvidence[]>(Prisma.sql`SELECT DISTINCT ON ("studentId","levelId") "studentId","levelId","result" FROM "OhmwardAttempt" WHERE ${scope} ORDER BY "studentId","levelId","submittedAt" DESC,"id" DESC`);
    const period=Prisma.sql`${scope} AND "submittedAt">=${window.start} AND "submittedAt"<${window.end}`;
    const [activity]=await tx.$queryRaw<{attempts:bigint;students:bigint;elapsedMs:number;recentAt:Date|null}[]>(Prisma.sql`SELECT COUNT(*) AS attempts,COUNT(DISTINCT "studentId") AS students,COALESCE(SUM(GREATEST(0,EXTRACT(EPOCH FROM ("submittedAt"-"startedAt"))*1000)),0)::double precision AS "elapsedMs",MAX("submittedAt") AS "recentAt" FROM "OhmwardAttempt" WHERE ${period}`);
    const misconceptions=await tx.$queryRaw<{concept:string;count:bigint}[]>(Prisma.sql`SELECT concept,COUNT(*) AS count FROM (SELECT DISTINCT a.id,m.concept FROM "OhmwardAttempt" a CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(a.result->'misconceptions')='array' THEN a.result->'misconceptions' ELSE '[]'::jsonb END) AS m(concept) WHERE ${period} AND length(m.concept) BETWEEN 1 AND 150) occurrences GROUP BY concept ORDER BY count DESC,concept ASC LIMIT 10`);
    return cohortMetrics(students,latest,{attempts:Number(activity.attempts),students:Number(activity.students),elapsedMs:activity.elapsedMs,recentAt:activity.recentAt?.toISOString()??null},misconceptions.map(m=>({concept:m.concept,count:Number(m.count)})),window);
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:15000});
}
