'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { ControllerProgram, GraphKind, Level, ResponseState } from '../domain/types';
import { emptyWorkspace } from '../domain/workspace';
import { executeController, type ControllerResult } from '../domain/controller';
import { controllerSchema } from '../domain/controller-schema';
import { controllerWiring } from '../domain/controller-wiring';
import { inferredSpec, workspaceFrame, EMPTY_CONTROLLER } from '../domain/controller-preview';
import { starterState, controllerSpec } from '../curriculum/controller-starters';
import { SensorExplorer } from './SensorExplorer';
import { InstructionEditor } from './InstructionEditor';
const Workbench=dynamic(()=>import('../workbench/Workbench'),{ssr:false,loading:()=> <p role="status">Loading board workbench…</p>});
export const CONTROLLER_PARTS:GraphKind[]=['uno','resistor','led','button','light-sensor','temperature-sensor','ultrasonic-sensor','soil-sensor','pump-driver','pump'];
export function ControllerLab({level,variantId,state,onChange,disabled=false,readOnly=false,allowedKinds=CONTROLLER_PARTS}:{level?:Level;variantId?:string;state:ResponseState;onChange:(state:ResponseState)=>void;disabled?:boolean;readOnly?:boolean;allowedKinds?:GraphKind[]}){
  const template=useMemo(()=>level&&variantId?starterState(level,variantId):{...emptyWorkspace(),controller:EMPTY_CONTROLLER},[level,variantId]);
  const actual=useMemo(()=>state.controller||readOnly?state:level?template:{...state,controller:EMPTY_CONTROLLER},[state,readOnly,level,template]),program=actual.controller??EMPTY_CONTROLLER;
  const spec=level&&variantId?controllerSpec(level,variantId):inferredSpec(actual);
  const [tested,setTested]=useState<{state:ResponseState;result:ControllerResult}|null>(null),[index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[error,setError]=useState('');
  const reduce=useReducedMotion(),result=tested?.state===actual?tested.result:null,event=result?.trace[index];
  useEffect(()=>{if(!playing||!result||index>=result.trace.length-1)return;const timer=setTimeout(()=>{setIndex(index+1);if(index+1>=result.trace.length-1)setPlaying(false);},250);return ()=>clearTimeout(timer);},[playing,result,index]);
  function edit(next:ResponseState){if(disabled||readOnly)return;setPlaying(false);setTested(null);onChange(next);}
  function updateProgram(next:ControllerProgram){const parsed=controllerSchema.safeParse(next);if(!parsed.success){setError('Keep 1–32 unique instructions, no more than two nested conditions, whole-number values and positive waits within the shown ranges.');return;}setError('');edit({...actual,controller:parsed.data});}
  function run(){
    setPlaying(false);setIndex(0);
    if(!actual.controller){setError('No controller program is recorded in this workspace.');return;}
    const wiring=controllerWiring(actual,spec);if(!wiring.valid){setError(wiring.message);setTested(null);return;}
    const result=executeController(actual.controller,[workspaceFrame(actual,spec)]);setError(result.valid?'':result.message);setTested({state:actual,result});
  }
  const editable=!disabled&&!readOnly;
  return <div className="ohm-controller-lab"><p className="ohm-muted">Uno R3-style 5 V model · supported outputs: a 330 Ω / 2 V protected LED or isolated virtual pump-driver load · typed instructions and virtual time only.</p>{level&&<dl className="ohm-values">{Object.entries(level.variants.find(v=>v.id===variantId)!.values).map(([key,value])=><div key={key}><dt>{key==='echoPinNumber'?'Echo input pin':key==='triggerPinNumber'?'Trigger output pin':key==='stopCm'?'Stop distance (cm)':key==='warningCm'?'Warning distance (cm)':key==='outputPinNumber'?'Digital output pin':key==='buttonPinNumber'?'Button input pin':key==='analogPinNumber'?'Analog input pin':key==='halfPeriodMs'?'Half-period (ms)':`Threshold (${level.id==='INT-03'?'°C':'%'})`}</dt><dd>{key.includes('PinNumber')?`${key==='analogPinNumber'?'A':'D'}${value}`:value}</dd></div>)}</dl>}
    <Workbench state={actual} onChange={edit} allowedKinds={allowedKinds} disabled={!editable} simulation={false} signalActive={Boolean(playing&&result?.valid)} activePin={event?.pin} externalDuty={event?.outputs[spec.outputPin]??0}/>
    {spec.button&&<button type="button" className="ohm-button ohm-secondary" disabled={!editable} aria-pressed={actual.switchClosed} onClick={()=>edit({...actual,switchClosed:!actual.switchClosed})}>Button {actual.switchClosed?'pressed · LOW':'released · HIGH'}</button>}
    {spec.sensor&&<details><summary>Sensor environment and current readings</summary><SensorExplorer state={actual} onChange={edit} disabled={!editable}/></details>}
    <InstructionEditor program={program} onChange={updateProgram} disabled={!editable} active={event?.instructionId}/>
    {error&&<p role="alert" className="ohm-feedback">{error}</p>}
    <div className="ohm-actions"><button data-ohm-tour="run" type="button" className="ohm-button" disabled={disabled&&!readOnly} onClick={run}>Run virtual trace</button>{editable&&<button type="button" className="ohm-button ohm-secondary" onClick={()=>{if(window.confirm('Replace this controller workspace with its starting template?'))edit(structuredClone(template));}}>Restore starting template</button>}</div>
    {result&&<section className="ohm-feedback" aria-label="Virtual execution trace"><h3>{result.valid?'Virtual trace ready':'Trace stopped'}</h3><p>{result.message}</p>{event&&<p role="status">{spec.outputKind==='pump'?`Virtual pump ${event.outputs[spec.outputPin]===255?'ON':'OFF'} · driver load pair supplies motor power`:spec.sensor==='ultrasonic-sensor'?`Parking state: ${event.outputs[spec.outputPin]===255?'STOP':event.outputs[spec.outputPin]===127?'WARNING':'SAFE'}`:''}</p>}<div className="ohm-actions"><button type="button" className="ohm-button ohm-secondary" disabled={!result.trace.length||Boolean(reduce)} aria-pressed={playing} onClick={()=>{if(index>=result.trace.length-1)setIndex(0);setPlaying(!playing);}}>{playing?'Pause trace':'Play trace'}</button><button type="button" className="ohm-button ohm-secondary" disabled={index===0} onClick={()=>{setPlaying(false);setIndex(index-1);}}>Previous step</button><button type="button" className="ohm-button ohm-secondary" disabled={index>=result.trace.length-1} onClick={()=>{setPlaying(false);setIndex(index+1);}}>Next step</button></div>{reduce&&<p>Reduced motion is enabled. Use the step controls or table.</p>}{event&&<div aria-live="polite"><p>Step {index+1}/{result.trace.length} · virtual {event.timeMs} ms · {event.op} {event.pin??''}</p><dl className="ohm-values">{Object.entries(event.outputs).map(([pin,value])=><div key={pin}><dt>{pin} duty</dt><dd>{value}/255 · {value===0?'OFF':value===255?'ON':'PWM switching'}</dd></div>)}</dl></div>}<details><summary>Read the entire trace as a table</summary><div className="ohm-table-wrap"><table><caption>Virtual instruction trace; output values are 0–255 duty units</caption><thead><tr><th scope="col">Step</th><th scope="col">Virtual ms</th><th scope="col">Instruction</th><th scope="col">Pin</th><th scope="col">Outputs</th></tr></thead><tbody>{result.trace.map((item,i)=><tr key={i} aria-current={index===i?'step':undefined}><td>{i+1}</td><td>{item.timeMs}</td><td>{item.op}</td><td>{item.pin??'—'}</td><td>{Object.entries(item.outputs).map(([pin,value])=>`${pin}: ${value}`).join(', ')||'No output yet'}</td></tr>)}</tbody></table></div></details></section>}
  </div>;
}
