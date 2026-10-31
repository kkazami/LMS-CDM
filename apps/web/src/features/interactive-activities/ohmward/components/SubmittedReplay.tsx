'use client';
import dynamic from 'next/dynamic';
import type { Attempt, Level } from '../domain/types';
const ControllerLab=dynamic(()=>import('./ControllerLab').then(module=>module.ControllerLab),{ssr:false,loading:()=> <p role="status">Loading immutable controller replay…</p>});
export function ControllerReplay({attempt,level}:{attempt:Attempt;level:Level}){return attempt.state.controller?<ControllerLab level={level} variantId={attempt.variantId} state={attempt.state} onChange={()=>undefined} readOnly disabled/>:null;}
export function SubmittedReplay({attempt,level}:{attempt:Attempt;level:Level}){
  return <section className="ohm-surface"><h2>{attempt.levelId} · submitted attempt</h2><p className="ohm-muted">Content v{attempt.contentVersion} · variant {attempt.variantId} · submitted {attempt.submittedAt?new Date(attempt.submittedAt).toLocaleString('en-PH',{timeZone:'Asia/Singapore'}):'—'} GMT+8. This is an immutable saved state. Local trace playback changes no learner records.</p><p>{attempt.result?.score}/100 · {attempt.result?.stars}/3 stars</p>{attempt.state.controller?<ControllerLab level={level} variantId={attempt.variantId} state={attempt.state} onChange={()=>undefined} readOnly disabled/>:<details><summary>Read the exact submitted workspace</summary><pre className="ohm-json">{JSON.stringify(attempt.state,null,2)}</pre></details>}{attempt.result?.criteria.map(criterion=><div className="ohm-feedback" key={criterion.id}><strong>{criterion.passed?'Passed':'Review'} · {criterion.concept}</strong><p>{criterion.feedback}</p></div>)}</section>;
}
