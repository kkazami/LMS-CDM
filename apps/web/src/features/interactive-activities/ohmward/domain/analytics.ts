import { LEVELS } from '../curriculum/catalog';

const DAY=86400000, OFFSET=8*3600000;
export type ActivityWindow={from:string;to:string;start:Date;end:Date};
export function activityWindow(from?:string,to?:string,now=new Date()):ActivityWindow {
  const day=(date:Date)=>new Date(date.getTime()+OFFSET).toISOString().slice(0,10);
  const last=to??day(now),first=from??day(new Date(now.getTime()-29*DAY));
  const parse=(value:string)=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'2000-01-01'||value>'2100-12-31')throw Error('Use valid dates from 2000 through 2100.');
    const date=new Date(value+'T00:00:00.000Z');
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw Error('Use a real calendar date.');
    return new Date(date.getTime()-OFFSET);
  };
  const start=parse(first),end=new Date(parse(last).getTime()+DAY);
  if(end<=start||end.getTime()-start.getTime()>366*DAY)throw Error('Choose an ordered date range of at most 366 days.');
  return {from:first,to:last,start,end};
}
export type LearnerMetric={id:string;started:boolean;progress:{levelId:string;firstPassedAt:Date|null}[]};
export type LatestEvidence={studentId:string;levelId:string;result:unknown};
export type ActivityMetric={attempts:number;students:number;elapsedMs:number;recentAt:string|null};
export type MisconceptionMetric={concept:string;count:number};
export function cohortMetrics(students:readonly LearnerMetric[],latest:readonly LatestEvidence[],activity:ActivityMetric,misconceptions:MisconceptionMetric[],window:ActivityWindow){
  const known=new Map(LEVELS.map(level=>[level.id,level])),ids=new Set(students.map(s=>s.id));
  const passes=students.flatMap(s=>[...new Map(s.progress.filter(p=>known.has(p.levelId)&&p.firstPassedAt).map(p=>[p.levelId,p])).values()]);
  const modules=['circuitry','sensors','microcontrollers','integration'].map(moduleId=>{
    const total=LEVELS.filter(l=>l.moduleId===moduleId).length,passed=passes.filter(p=>known.get(p.levelId)?.moduleId===moduleId).length;
    return {module:moduleId,passed,possible:students.length*total,percent:students.length?passed/(students.length*total)*100:0};
  });
  const daily=new Map<number,number>();
  for(const p of passes){const at=p.firstPassedAt!.getTime();if(at>=window.start.getTime()&&at<window.end.getTime()){const day=window.start.getTime()+Math.floor((at-window.start.getTime())/DAY)*DAY;daily.set(day,(daily.get(day)??0)+1);}}
  const trend=[];let cumulative=passes.filter(p=>p.firstPassedAt!.getTime()<window.start.getTime()).length;
  for(let at=window.start.getTime();at<window.end.getTime();at+=DAY){
    cumulative+=daily.get(at)??0;
    trend.push({date:new Date(at+OFFSET).toISOString().slice(0,10),passed:cumulative});
  }
  const concepts=new Map<string,{concept:string;module:string;points:number;possible:number;learners:Set<string>}>();
  let invalidEvidence=0;const seen=new Set<string>();
  for(const entry of latest){
    const level=known.get(entry.levelId),key=entry.studentId+'\u0000'+entry.levelId;
    if(!level||!ids.has(entry.studentId)||seen.has(key))continue;seen.add(key);
    const value=entry.result as {criteria?:unknown}|null;
    if(!value||!Array.isArray(value.criteria)||!value.criteria.length){invalidEvidence++;continue;}
    const valid=value.criteria.every((c:unknown)=>{const r=c as {concept?:unknown;points?:unknown;possible?:unknown}|null;return r&&typeof r.concept==='string'&&r.concept.length>0&&r.concept.length<=150&&typeof r.points==='number'&&Number.isFinite(r.points)&&typeof r.possible==='number'&&Number.isFinite(r.possible)&&r.possible>0&&r.points>=0&&r.points<=r.possible;});
    if(!valid){invalidEvidence++;continue;}
    for(const c of value.criteria as {concept:string;points:number;possible:number}[]){
      const conceptKey=level.moduleId+'\u0000'+c.concept;
      const row=concepts.get(conceptKey)??{concept:c.concept,module:level.moduleId,points:0,possible:0,learners:new Set<string>()};
      row.points+=c.points;row.possible+=c.possible;row.learners.add(entry.studentId);concepts.set(conceptKey,row);
    }
  }
  return {roster:students.length,started:students.filter(s=>s.started).length,completed:students.filter(s=>new Set(s.progress.filter(p=>p.firstPassedAt&&known.has(p.levelId)).map(p=>p.levelId)).size===30).length,
    passed:passes.length,completionPercent:students.length?passes.length/(students.length*30)*100:0,modules,trend,
    concepts:[...concepts.values()].map(c=>({concept:c.concept,module:c.module,percent:c.points/c.possible*100,assessed:c.learners.size,points:c.points,possible:c.possible})).sort((a,b)=>a.module.localeCompare(b.module)||a.concept.localeCompare(b.concept)),
    invalidEvidence,activity:{...activity,averageElapsedMs:activity.attempts?activity.elapsedMs/activity.attempts:0},misconceptions,
    window:{from:window.from,to:window.to,timeZone:'Asia/Manila (UTC+08:00)'},
  };
}
export type CohortMetrics=ReturnType<typeof cohortMetrics>;
