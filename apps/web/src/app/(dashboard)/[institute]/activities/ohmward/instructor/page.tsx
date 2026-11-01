import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageActor } from '@/features/interactive-activities/ohmward/server/page-access';
import { readRoster } from '@/features/interactive-activities/ohmward/server/service';
import { readCohortAnalytics, analyticsWindow } from '@/features/interactive-activities/ohmward/server/analytics';
import { Banner } from '@/features/interactive-activities/ohmward/components/Shared';
import { AnalyticsFilters } from '@/features/interactive-activities/ohmward/components/AnalyticsFilters';
import { AnalyticsPanel } from '@/features/interactive-activities/ohmward/components/AnalyticsPanel';

export default async function Page({params,searchParams}:{params:Promise<{institute:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const actor=await pageActor((await params).institute);if(actor.role==='STUDENT')notFound();
  const query=await searchParams,text=(key:string)=>typeof query[key]==='string'?query[key] as string:'';
  const courseId=text('courseId')||undefined,search=text('search').slice(0,100),page=/^[1-9]\d{0,5}$/.test(text('page'))?Number(text('page')):1;
  let dateError='';let window;
  try{window=analyticsWindow(text('from')||undefined,text('to')||undefined);}catch(error){dateError=error instanceof Error?error.message:'Invalid dates.';window=analyticsWindow();}
  const defaultWindow=analyticsWindow();
  const data=await readRoster(actor,{courseId,search,page});
  const analytics=dateError?null:await readCohortAnalytics(actor,{courseId,from:window.from,to:window.to});
  const hidden=<><input type="hidden" name="courseId" value={courseId??''}/><input type="hidden" name="search" value={search}/><input type="hidden" name="from" value={window.from}/><input type="hidden" name="to" value={window.to}/></>;
  return <><Banner staff analytics/><section className="ohm-surface"><h2>{actor.role==='ADMIN'?'ICS learning overview':'Your students’ journey'}</h2><p className="ohm-muted">View student progress here. {actor.role==='INSTRUCTOR'?'This shows approved students in your current ICS classes.':'This shows active, enrolled ICS students.'} Students who have not started are included in the totals.</p>
    <AnalyticsFilters key={`${courseId??''}:${text('from')||window.from}:${text('to')||window.to}`} courses={data.courses} applied={{courseId:courseId??'',search,from:text('from')||window.from,to:text('to')||window.to}} defaults={{from:defaultWindow.from,to:defaultWindow.to}}/>
    {dateError&&<p role="alert" className="ohm-feedback">{dateError} Correct the dates to view analytics.</p>}
    <div className="ohm-table-wrap"><table><caption>{data.total} {data.total===1?'student':'students'} found · Page {data.page} · All-time progress</caption><thead><tr><th scope="col">Student</th><th scope="col">Student number</th><th scope="col">Progress</th><th scope="col">Stars</th></tr></thead><tbody>{data.students.map(student=><tr key={student.id}><th scope="row"><Link href={`/ics/activities/ohmward/instructor/students/${student.id}`}>{student.name}</Link></th><td>{student.studentNumber??'—'}</td><td>{student.started?`${student.completed}/30 passed`:'Not started'}</td><td>{student.stars}</td></tr>)}</tbody></table></div>
    {!data.students.length&&<p className="ohm-feedback">No students match this class and search.</p>}<form method="get" className="ohm-actions">{hidden}<button className="ohm-button ohm-secondary" name="page" value={page-1} disabled={page<=1}>Previous</button><button className="ohm-button ohm-secondary" name="page" value={page+1} disabled={page*25>=data.total}>Next</button></form><p className="ohm-muted">Select a student to review their submitted work and feedback. Saved submissions cannot be changed. Ohmward does not affect official grades.</p>
  </section>{analytics&&<AnalyticsPanel data={analytics}/>}</>;
}