'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Tutorial } from './Tutorial';
import { SURFACE_GUIDES,SANDBOX_UNLOCKS } from '../domain/guidance';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { GraphKind, ResponseState } from '../domain/types';
import { emptyWorkspace } from '../domain/workspace';
import { useDraftRecovery, INITIAL_DRAFT, type DraftSnapshot } from './DraftRecovery';
import { api } from './useAttempt';
import { SensorExplorer } from './SensorExplorer';
import { EMPTY_CONTROLLER } from '../domain/controller-preview';
const Workbench=dynamic(()=>import('../workbench/Workbench'),{ssr:false,loading:()=> <p role="status">Loading sandbox…</p>});
const ControllerLab=dynamic(()=>import('./ControllerLab').then(module=>module.ControllerLab),{ssr:false,loading:()=> <p role="status">Loading controller sandbox…</p>});
type SavedSandbox={revision:number;state:ResponseState;capabilities:{parts:GraphKind[];sensors:boolean}};
export function Sandbox(){
  const recovery=useDraftRecovery(),entry=useMemo(()=>recovery.get('_sandbox'),[recovery]);
  const subscribe=useCallback((listener:()=>void)=>{entry.listeners.add(listener);return ()=>{entry.listeners.delete(listener);};},[entry]);
  const snapshot=useSyncExternalStore(subscribe,()=>entry.snapshot,()=>INITIAL_DRAFT);
  const [labMode,setLabMode]=useState<'automatic'|'circuit'|'controller'>('automatic');
  const update=useCallback((patch:Partial<DraftSnapshot>)=>{entry.snapshot={...entry.snapshot,...patch};entry.listeners.forEach(listener=>listener());recovery.notify();},[entry,recovery]);
  const load=useCallback(async(replace=false)=>{
    if(entry.snapshot.busy)return;
    if(replace&&entry.generation!==entry.saved&&!window.confirm('Replace unsaved sandbox work with the latest saved workspace?'))return;
    update({busy:true,error:''});const serial=entry.generation;
    try{
      await entry.queue;
      const row=await api<SavedSandbox>('sandbox');
      if(serial!==entry.generation){update({error:'Newer edits were preserved. Retry reload if you want the saved version.'});return;}
      entry.sandbox={revision:row.revision,capabilities:row.capabilities,loaded:true};entry.saved=++entry.generation;entry.blocked=false;
      update({state:row.state,status:'Saved',error:''});
    }catch(error){update({status:'Not loaded',error:error instanceof Error?error.message:'Could not load sandbox.'});}
    finally{update({busy:false});}
  },[entry,update]);
  useEffect(()=>{
    if(!entry.sandbox?.loaded){void load();return;}
    let cancelled=false;
    // Refresh earned tools after SPA navigation without replacing unsaved work or its revision.
    void api<SavedSandbox>('sandbox').then(row=>{
      if(cancelled||!entry.sandbox)return;
      entry.sandbox={...entry.sandbox,capabilities:row.capabilities};update({});
    }).catch(error=>{if(!cancelled)update({error:error instanceof Error?error.message:'Could not refresh tools. Your current workspace was preserved.'});});
    return ()=>{cancelled=true;};
  },[entry,load,update]);
  const flush=useCallback(()=>{
    entry.queue=entry.queue.catch(()=>false).then(async()=>{
      if(!entry.sandbox?.loaded||entry.blocked)return false;
      if(entry.generation===entry.saved)return true;
      const serial=entry.generation,state=entry.snapshot.state;update({status:'Saving…'});
      try{const row=await api<SavedSandbox>('sandbox','PATCH',{revision:entry.sandbox.revision,state});entry.saved=serial;entry.sandbox={...entry.sandbox,revision:row.revision,capabilities:row.capabilities};update({status:entry.generation===serial?'Saved':'Unsaved changes',error:''});return true;}
      catch(error){if((error as {status?:number}).status===409)entry.blocked=true;update({status:entry.blocked?'Save conflict':'Not saved',error:error instanceof Error?error.message:'Save failed. Your work stays in this tab.'});return false;}
    });return entry.queue;
  },[entry,update]);
  useEffect(()=>{if(entry.generation===entry.saved||!entry.sandbox?.loaded)return;const timer=setTimeout(()=>void flush(),800);return ()=>clearTimeout(timer);},[snapshot.state,entry,flush]);
  useEffect(()=>()=>{if(entry.generation!==entry.saved)void flush();},[entry,flush]);
  function edit(state:ResponseState){if(entry.snapshot.busy||!entry.sandbox?.loaded)return;entry.generation++;update({state,status:'Unsaved changes'});}
  const capabilities=entry.sandbox?.capabilities??{parts:[],sensors:false};
  const controllerMode=labMode==='controller'||labMode==='automatic'&&Boolean(snapshot.state.controller);
  const loaded=Boolean(entry.sandbox?.loaded),hasParts=capabilities.parts.length>0;
  return <section className="ohm-surface"><h2>Your free-build sandbox</h2><p className="ohm-muted">One saved workspace. No score, stars or XP. Earn parts by passing their learning levels, then add them from Component tray before choosing them in a dropdown.</p>
    {loaded && <Tutorial key={hasParts?(controllerMode?'controller':'circuit'):'locked'} guide={hasParts ? controllerMode ? {title:'Walk through the controller sandbox',steps:[{title:'Run your own program',body:'Click Run virtual trace to inspect your existing controller workspace. This walkthrough does not add parts or change your program.',target:'[data-ohm-tour="run"]',event:'click'}]} : SURFACE_GUIDES.sandbox : {title:'Unlock your sandbox tools',steps:[{title:'Open the starter-parts level',body:'The sandbox has no components yet. Click the outlined action to open CIR-03, then follow any earlier prerequisites it lists. Passing CIR-03 earns the starter parts.',target:'[data-ohm-tour="sandbox-unlock"]',event:'click'}]}}/>}
    <p role="status" className="ohm-status">{snapshot.status}</p>
    {snapshot.error&&<div role="alert" className="ohm-feedback"><p>{snapshot.error}</p><div className="ohm-actions"><button className="ohm-button ohm-secondary" disabled={snapshot.busy} onClick={()=>void flush()}>Retry save</button><button className="ohm-button ohm-secondary" disabled={snapshot.busy} onClick={()=>void load(true)}>Reload saved workspace</button></div></div>}
    {loaded?<>
      <details className="ohm-tools" open={!hasParts}><summary>Your tools and unlocks</summary><ul>{SANDBOX_UNLOCKS.map(group=>{const available=group.parts.every(part=>capabilities.parts.includes(part));return <li key={group.level}><span><strong>{group.label}</strong><span className="ohm-muted">{available?'Available in Component tray':'Pass '+group.level+' to unlock'}</span></span>{available?<span className="ohm-status">Unlocked</span>:<Link className="ohm-button ohm-secondary" href={'/ics/activities/ohmward/levels/'+group.level}>Open {group.level}</Link>}</li>;})}<li><span><strong>Environmental experiments</strong><span className="ohm-muted">{capabilities.sensors?'Available below':'Pass SEN-04 to unlock'}</span></span>{capabilities.sensors?<span className="ohm-status">Unlocked</span>:<Link className="ohm-button ohm-secondary" href="/ics/activities/ohmward/levels/SEN-04">Open SEN-04</Link>}</li></ul></details>
      {!hasParts?<div className="ohm-empty-workbench"><h3>Your first components are waiting</h3><p>There are no component or terminal choices yet because no workbench parts have been unlocked. Pass CIR-03 for a battery, resistor, LED and switch. Its lesson shows any earlier steps you still need.</p><Link data-ohm-tour="sandbox-unlock" className="ohm-button" href="/ics/activities/ohmward/levels/CIR-03">Unlock the starter parts</Link><Link className="ohm-button ohm-secondary" href="/ics/activities/ohmward">Return to my journey</Link></div>:<>
        <div className="ohm-actions"><button type="button" className="ohm-button ohm-secondary" aria-pressed={!controllerMode} onClick={()=>setLabMode('circuit')}>Circuit / logic view</button>{capabilities.parts.includes('uno')&&<button type="button" className="ohm-button ohm-secondary" aria-pressed={controllerMode} onClick={()=>{setLabMode('controller');if(!snapshot.state.controller)edit({...snapshot.state,controller:structuredClone(EMPTY_CONTROLLER)});}}>Controller view</button>}</div>
        {controllerMode&&capabilities.parts.includes('uno')?<ControllerLab state={snapshot.state} onChange={edit} disabled={snapshot.busy} allowedKinds={capabilities.parts.filter(kind=>['uno','resistor','led','button','light-sensor','temperature-sensor','ultrasonic-sensor','soil-sensor','pump-driver','pump'].includes(kind))}/>:<Workbench state={snapshot.state.graph?snapshot.state:emptyWorkspace()} onChange={edit} disabled={snapshot.busy} allowedKinds={capabilities.parts}/>}
      </>}
      {capabilities.sensors&&<details><summary>Environmental experiments</summary><SensorExplorer state={snapshot.state} onChange={edit} disabled={snapshot.busy}/></details>}
      {(hasParts||capabilities.sensors)&&<button className="ohm-button ohm-secondary" disabled={snapshot.busy} onClick={()=>void flush()}>Save workspace now</button>}
    </>:<button className="ohm-button" disabled={snapshot.busy} onClick={()=>void load()}>{snapshot.busy?'Opening saved workspace…':'Open workspace'}</button>}
    <p className="ohm-muted">Physics is limited to protected series LED loops, separate acyclic Boolean networks and supported Uno input/output models. Unsupported arrangements explain their limits. This is not a general-purpose electronics simulator.</p>
  </section>;
}
