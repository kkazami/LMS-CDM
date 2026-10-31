import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageActor } from '@/features/interactive-activities/ohmward/server/page-access';
import { readRoster } from '@/features/interactive-activities/ohmward/server/service';
import { readCohortAnalytics, analyticsWindow } from '@/features/interactive-activities/ohmward/server/analytics';
import { Banner } from '@/features/interactive-activities/ohmward/components/Shared';
import { AnalyticsPanel } from '@/features/interactive-activities/ohmward/components/AnalyticsPanel';

export default async function Page({params,searchParams}:{params:Promise<{institute:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const actor=await pageActor((await params).institute);if(actor.role==='STUDENT')notFound();
  const query=await searchParams,text=(key:string)=>typeof query[key]==='string'?query[key] as string:'';
  const courseId=text('courseId')||undefined,search=text('search').slice(0,100),page=/^[1-9]\d{0,5}$/.test(text('page'))?Number(text('page')):1;
  let dateError='';let window;
  try{window=analyticsWindow(text('from')||undefined,text('to')||undefined);}catch(error){dateError=error instanceof Error?error.message:'Invalid dates.';window=analyticsWindow();}
  const data=await readRoster(actor,{courseId,search,page});
  const analytics=dateError?null:await readCohortAnalytics(actor,{courseId,from:window.from,to:window.to});
  const hidden=<><input type="hidden" name="courseId" value={courseId??''}/><input type="hidden" name="search" value={search}/><input type="hidden" name="from" value={window.from}/><input type="hidden" name="to" value={window.to}/></>;
  return <><Banner staff/><section className="ohm-surface"><h2>{actor.role==='ADMIN'?'ICS learning overview':'Your students’ journey'}</h2><p className="ohm-muted">Read-only progress. {actor.role==='INSTRUCTOR'?'Only approved students in your nonarchived ICS classes appear.':'Only active, enrolled ICS students appear.'} Students with no attempts count in cohort denominators.</p>
    <form method="get" className="ohm-actions" action="/ics/activities/ohmward/instructor">
      <label className="ohm-field">Class<select name="courseId" defaultValue={courseId??''}><option value="">All authorized classes</option>{data.courses.map(course=><option value={course.id} key={course.id}>{course.code} · {course.title}</option>)}</select></label>
      <label className="ohm-field">Find a student<input name="search" maxLength={100} defaultValue={search}/></label>
      <label className="ohm-field">Activity from<input type="date" name="from" min="2000-01-01" max="2100-12-31" defaultValue={text('from')||window.from} required/></label>
      <label className="ohm-field">Activity through<input type="date" name="to" min="2000-01-01" max="2100-12-31" defaultValue={text('to')||window.to} required/></label>
      <button className="ohm-button" type="submit">Apply filters</button>
    </form>{dateError&&<p role="alert" className="ohm-feedback">{dateError} Correct the dates to view analytics.</p>}
    <div className="ohm-table-wrap"><table><caption>{data.total} matching authorized students · Page {data.page} · Lifetime progress</caption><thead><tr><th scope="col">Student</th><th scope="col">Student number</th><th scope="col">Progress</th><th scope="col">Stars</th></tr></thead><tbody>{data.students.map(student=><tr key={student.id}><th scope="row"><Link href={`/ics/activities/ohmward/instructor/students/${student.id}`}>{student.name}</Link></th><td>{student.studentNumber??'—'}</td><td>{student.started?`${student.completed}/30 passed`:'Not started'}</td><td>{student.stars}</td></tr>)}</tbody></table></div>
    {!data.students.length&&<p className="ohm-feedback">No students match this class and search.</p>}<form method="get" className="ohm-actions">{hidden}<button className="ohm-button ohm-secondary" name="page" value={page-1} disabled={page<=1}>Previous</button><button className="ohm-button ohm-secondary" name="page" value={page+1} disabled={page*25>=data.total}>Next</button></form><p className="ohm-muted">Select a student to inspect immutable submitted attempts. Ohmward never changes official grades.</p>
  </section>{analytics&&<AnalyticsPanel data={analytics}/>}</>;
}