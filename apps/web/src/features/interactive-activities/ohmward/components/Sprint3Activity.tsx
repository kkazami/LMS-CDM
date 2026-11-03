'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { Level, ResponseState } from '../domain/types';
import { starterState } from '../curriculum/controller-starters';
import { UnoBoard } from './UnoBoard';
import { Sprint2Activity } from './Sprint2Activity';
const ControllerLab=dynamic(()=>import('./ControllerLab').then(module=>module.ControllerLab),{ssr:false,loading:()=> <p role="status">Loading typed controller workspace…</p>});
function Pipeline(){return <div className="ohm-pipeline" role="img" aria-label="Light module measurement goes to a comparison rule, then to a protected LED indicator"><div>Light module<br/>Measurement</div><div>Threshold rule<br/>Decision</div><div>Protected LED<br/>Response</div></div>;}
export function Sprint3Activity({level,variant,state,onChange,disabled=false}:{level:Level;variant:Level['variants'][number];state:ResponseState;onChange:(state:ResponseState)=>void;disabled?:boolean}){
  return level.kind==='controller-build'||level.kind==='instruction-order'?<ControllerLab level={level} variantId={variant.id} state={state} onChange={onChange} disabled={disabled}/>:<>{level.id==='INT-01'&&<Pipeline/>}<Sprint2Activity level={level} variant={variant} state={state} onChange={onChange} disabled={disabled}/></>;
}
export function Sprint3Practice({level}:{level:Level}){
  const [state,setState]=useState(()=>starterState(level,level.variants[0].id));
  return level.kind==='quiz'?<>{level.moduleId==='integration'?<Pipeline/>:<UnoBoard/>}<p className="ohm-feedback">{level.id==='INT-05'?'Practice: a light reading changes correctly, the expected output pin goes HIGH, but the LED return is open. The failed layer is the output circuit. Restore the return and retest the complete path.':level.id==='INT-01'?'Information passes from measurement through a decision to a response. Power and a shared reference support the whole path.':'Select a pin and compare its documented capabilities before choosing a connection or instruction.'}</p></>:<ControllerLab level={level} variantId={level.variants[0].id} state={state} onChange={setState}/>;
}
