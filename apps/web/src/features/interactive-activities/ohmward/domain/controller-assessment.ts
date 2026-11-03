import { canonicalPin } from './uno';
import type { ControllerResult } from './controller';
export type OutputContract = {kind:'constant';value:number}|{kind:'blink';halfPeriodMs:number}|{kind:'response';targets:{atMs:number;value:number}[];settlingMs:number};
/** Writes, waits and input changes occur at integer ms. Checking every whole-ms interval proves the entire bounded model timeline. */
export function checkOutputTimeline(result:ControllerResult,pin:string,horizonMs:number,contract:OutputContract):{passed:boolean;feedback:string}{
  if(!result.valid)return {passed:false,feedback:result.message};
  if(!Number.isInteger(horizonMs)||horizonMs<1||horizonMs>10000)return {passed:false,feedback:'Assessment horizon must be 1–10000 whole virtual milliseconds.'};
  if(contract.kind==='blink'&&(!Number.isInteger(contract.halfPeriodMs)||contract.halfPeriodMs<1))return {passed:false,feedback:'Blink half-period must be a positive whole millisecond value.'};
  if(contract.kind==='response'&&(!contract.targets.length||contract.targets.length>32||contract.targets[0].atMs!==0||!Number.isInteger(contract.settlingMs)||contract.settlingMs<0||contract.settlingMs>10000||contract.targets.some((target,i)=>!Number.isInteger(target.atMs)||target.atMs<0||target.atMs>10000||i>0&&target.atMs<=contract.targets[i-1].atMs)))return {passed:false,feedback:'Response contracts need bounded, ordered targets starting at zero and a finite settling interval.'};
  const key=canonicalPin(pin);let event=0,outputs:Record<string,number>={},targetIndex=0;
  for(let time=0;time<horizonMs;time++){
    while(event<result.trace.length&&result.trace[event].timeMs<=time)outputs=result.trace[event++].outputs;
    const actual=outputs[key]??0;let allowed:number[];
    if(contract.kind==='constant')allowed=[contract.value];
    else if(contract.kind==='blink')allowed=[Math.floor(time/contract.halfPeriodMs)%2===0?255:0];
    else{
      while(targetIndex+1<contract.targets.length&&contract.targets[targetIndex+1].atMs<=time)targetIndex++;
      const current=contract.targets[targetIndex];allowed=[current.value];
      if(targetIndex>0&&time<current.atMs+contract.settlingMs)allowed.push(contract.targets[targetIndex-1].value);
    }
    if(!allowed.includes(actual))return {passed:false,feedback:`At virtual ${time} ms, ${key} duty was ${actual}; required ${[...new Set(allowed)].join(' or ')}. The full output interval is checked, not only selected snapshots.`};
  }
  return {passed:true,feedback:`${key} satisfies every output interval from 0 through ${horizonMs} ms (end exclusive).`};
}
