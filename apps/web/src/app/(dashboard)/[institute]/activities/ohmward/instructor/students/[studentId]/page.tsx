import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageActor } from '@/features/interactive-activities/ohmward/server/page-access';
import { studentInspection, submittedInspection } from '@/features/interactive-activities/ohmward/server/inspection';
import { getLevel } from '@/features/interactive-activities/ohmward/curriculum/catalog';
import { OhmwardError } from '@/features/interactive-activities/ohmward/domain/schema';
import { Banner } from '@/features/interactive-activities/ohmward/components/Shared';
import { SubmittedReplay } from '@/features/interactive-activities/ohmward/components/SubmittedReplay';
export default async function Page({params,searchParams}:{params:Promise<{institute:string;studentId:string}>;searchParams:Promise<{page?:string;attemptId?:string}>}){
  const {institute,studentId}=await params,actor=await pageActor(institute);if(actor.role==='STUDENT')notFound();
  const query=await searchParams,page=/^[1-9]\d{0,5}$/.test(query.page??'1')?Number(query.page??1):1;
  try{
    const data=await studentInspection(actor,studentId,page),selected=typeof query.attemptId==='string'?await submittedInspection(actor,query.attemptId):null;
    if(selected&&selected.student.id!==studentId)notFound();
    const level=selected?getLevel(selected.attempt.levelId,selected.attempt.contentVersion):null;
    return <><Banner staff/><Link data-ohm-tour="roster" className="ohm-button ohm-secondary" href="/ics/activities/ohmward/instructor">Back to authorized roster</Link><section className="ohm-surface"><h2>{data.student.name}</h2><p>{data.student.studentNumber??'No student number'} · {data.student.ohmwardLearner?.progress.filter(row=>row.firstPassedAt).length??0}/30 levels passed</p><div className="ohm-table-wrap"><table><caption>{data.total} immutable submitted attempts · Page {page}</caption><thead><tr><th scope="col">Level</th><th scope="col">Version / variant</th><th scope="col">Submitted (GMT+8)</th><th scope="col">Review</th></tr></thead><tbody>{data.attempts.map(attempt=><tr key={attempt.id}><th scope="row">{attempt.levelId}</th><td>{attempt.contentVersion} / {attempt.variantId}</td><td>{new Date(attempt.submittedAt).toLocaleString('en-PH',{timeZone:'Asia/Singapore'})}</td><td><Link data-ohm-tour="inspect-attempt" className="ohm-button ohm-secondary" href={`?page=${page}&attemptId=${encodeURIComponent(attempt.id)}`}>Inspect saved attempt</Link></td></tr>)}</tbody></table></div>{!data.total&&<p>No submitted attempts yet. The learner remains included in your roster.</p>}<div className="ohm-actions">{page>1&&<Link className="ohm-button ohm-secondary" href={`?page=${page-1}`}>Previous attempts</Link>}{page*25<data.total&&<Link className="ohm-button ohm-secondary" href={`?page=${page+1}`}>Next attempts</Link>}</div></section>{selected&&level?<SubmittedReplay key={selected.attempt.id} attempt={selected.attempt} level={level}/>:selected?<p>That content version is unavailable for playback. The submitted result is preserved.</p>:null}</>;
  }catch(error){if(error instanceof OhmwardError&&[403,404].includes(error.status))notFound();throw error;}
}
