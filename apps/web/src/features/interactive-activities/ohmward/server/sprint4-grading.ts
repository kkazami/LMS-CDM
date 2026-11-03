import type { Criterion, Instruction, Level, ResponseState } from '../domain/types';
import { executeController, type ControllerFrame } from '../domain/controller';
import { checkOutputTimeline, type OutputContract } from '../domain/controller-assessment';
import { controllerWiring } from '../domain/controller-wiring';
import { controllerSpec, finalStarter } from '../curriculum/controller-starters';
import { canonicalPin } from '../domain/uno';
import { instructionList } from '../domain/controller-preview';
export const SPRINT4_HINTS:Record<string,string[]>={
  'INT-04':['Keep the STOP and WARNING equality boundaries distinct.','Use TRIG OUTPUT, ECHO INPUT, and two nested distance comparisons; duty codes are 255/127/0.','Outer distance ≤stop gives PWM255; else inner distance ≤warning gives PWM127; else PWM0. Wait 100 ms and repeat.'],
  'INT-05':['Trace power, measurement, decision and output independently.','Correct readings do not repair a wrong output pin or open LED return.','Use a driver for pump power; equality is part of the decision rule, and echo time needs round-trip division.'],
  'INT-06':['GPIO controls the driver input; only the driver load pair powers the pump.','Calibrated moisture increases from dry to wet. Equality must stop watering.','Use moisturePercent < threshold: write1 else write0 on the specified driver-control pin, wait 50 ms, repeat.'],
};
const keys=['0','1','2','0','1','2'];
const feedback=['Restore the sensor power/input connection before adjusting the rule.','Use the actual connected output pin in the controller.','Repair the open output circuit/return.','Use a suitable driver/module and load power, never motor current through GPIO.','Implement the exact specified decision boundary.','Echo duration is round trip; divide by two when computing one-way distance.'];
const criterion=(id:string,passed:boolean,possible:number,text:string,mandatory=true):Criterion=>({id,concept:id,passed,points:passed?possible:0,possible,feedback:text,mandatory});
export function finalCases(level:Level,variantId:string):{name:string;frames:ControllerFrame[];horizon:number;expected:OutputContract}[]{
  const spec=controllerSpec(level,variantId),values=level.variants.find(v=>v.id===variantId)!.values,parking=level.id==='INT-04';
  const frame=(value:number,atMs=0):ControllerFrame=>({atMs,sensors:{[spec.inputPin!]:parking?{quantity:'distanceCm',value,triggerPin:spec.triggerPin}:{quantity:'moisturePercent',value}}});
  const output=(value:number)=>parking?value<=values.stopCm?255:value<=values.warningCm?127:0:value<values.threshold?255:0;
  const points=parking?[2,values.stopCm-0.01,values.stopCm,values.stopCm+0.01,(values.stopCm+values.warningCm)/2,values.warningCm-0.01,values.warningCm,values.warningCm+0.01,400]:[0,values.threshold-0.01,values.threshold,values.threshold+0.01,100];
  const result:{name:string;frames:ControllerFrame[];horizon:number;expected:OutputContract}[]=points.map(value=>({name:`boundary ${value}`,frames:[frame(value)],horizon:10000,expected:{kind:'constant',value:output(value)}}));
  const sequence=parking?[values.warningCm+1,(values.stopCm+values.warningCm)/2,values.stopCm-1,values.warningCm+1]:[values.threshold-1,values.threshold+1,values.threshold-1];
  for(const reverse of [false,true]){const samples=reverse?[...sequence].reverse():sequence,times=parking?[0,113,327,541]:[0,113,227];result.push({name:reverse?'reverse transitions':'forward transitions',frames:samples.map((value,i)=>frame(value,times[i])),horizon:10000,expected:{kind:'response',settlingMs:parking?100:50,targets:samples.map((value,i)=>({atMs:times[i],value:output(value)}))}});}
  return result;
}
function exactAction(actions:Instruction[],op:'write'|'pwm',pin:string,value:number){const action=actions[0];return actions.length===1&&action.op===op&&canonicalPin(action.pin)===canonicalPin(pin)&&action.value===value;}
export function sprint4Criteria(level:Level,variantId:string,state:ResponseState):Criterion[]{
  if(level.id==='INT-05')return level.variants.find(v=>v.id===variantId)!.questions.map(question=>{const i=Number(question.id.slice(1))-1;return criterion(`${level.id}-${question.id}`,state.answers[question.id]===keys[i],1,feedback[i],['q4','q5','q6'].includes(question.id));});
  const spec=controllerSpec(level,variantId),values=level.variants.find(v=>v.id===variantId)!.values,parking=level.id==='INT-04',cases=finalCases(level,variantId),wiring=controllerWiring(state,spec);
  const behavior=cases.map(test=>{const result=executeController(state.controller?{...state.controller,horizonMs:test.horizon}:undefined,test.frames),proof=checkOutputTimeline(result,spec.outputPin,test.horizon,test.expected);return {...criterion(`${level.id}-${test.name}`,proof.passed,80/cases.length,`${test.name}: ${proof.feedback}`),concept:parking?'parking-distance-response':'watering-response'};});
  const all=instructionList(state.controller),root=state.controller?.instructions.find((item):item is Extract<Instruction,{op:'if'}>=>item.op==='if');
  const matches=(rule:Extract<Instruction,{op:'if'}>|undefined,source:'distanceCm'|'moisturePercent',operator:'lte'|'lt',threshold:number)=>Boolean(rule&&rule.condition.source===source&&canonicalPin(rule.condition.pin)===canonicalPin(spec.inputPin!)&&rule.condition.operator===operator&&rule.condition.threshold===threshold);
  const inner=root?.else[0]?.op==='if'?root.else[0]:undefined;
  const ruleOk=parking?matches(root,'distanceCm','lte',values.stopCm)&&root!==undefined&&root.else.length===1&&matches(inner,'distanceCm','lte',values.warningCm)&&inner!==undefined&&exactAction(root.then,'pwm',spec.outputPin,255)&&exactAction(inner.then,'pwm',spec.outputPin,127)&&exactAction(inner.else,'pwm',spec.outputPin,0)&&all.filter(i=>i.op==='if').length===2:matches(root,'moisturePercent','lt',values.threshold)&&root!==undefined&&exactAction(root.then,'write',spec.outputPin,1)&&exactAction(root.else,'write',spec.outputPin,0)&&all.filter(i=>i.op==='if').length===1;
  const modes=all.some(i=>i.op==='mode'&&canonicalPin(i.pin)===canonicalPin(spec.outputPin)&&i.mode==='OUTPUT')&&all.some(i=>i.op==='mode'&&canonicalPin(i.pin)===canonicalPin(spec.inputPin!)&&i.mode==='INPUT')&&(!spec.triggerPin||all.some(i=>i.op==='mode'&&canonicalPin(i.pin)===canonicalPin(spec.triggerPin!)&&i.mode==='OUTPUT'));
  const configuration=wiring.valid&&ruleOk&&modes&&state.controller?.repeat===true&&state.controller.instructions.every(i=>['mode','if','wait'].includes(i.op))&&all.some(i=>i.op==='wait'&&i.ms===(parking?100:50));
  return [...behavior,criterion(`${level.id}-required-configuration`,configuration,20,wiring.message+' Use the exact documented direct rule tree/actions, input/output modes, positive sampling wait and repeat. No extra output rules or bypasses are supported.')];
}
export function sprint4Fixture(level:Level,variantId:string):ResponseState{
  if(level.id==='INT-05')return {answers:Object.fromEntries(keys.map((key,i)=>[`q${i+1}`,key])),wires:[],switchClosed:true};
  const state=finalStarter(level,variantId),spec=controllerSpec(level,variantId),values=level.variants.find(v=>v.id===variantId)!.values,parking=level.id==='INT-04';
  const write=(id:string,value:number):Instruction=>parking?{id,op:'pwm',pin:spec.outputPin,value}:{id,op:'write',pin:spec.outputPin,value};
  state.controller={version:1,repeat:true,horizonMs:1000,instructions:[{id:'output',op:'mode',pin:spec.outputPin,mode:'OUTPUT'},{id:'input',op:'mode',pin:spec.inputPin!,mode:'INPUT'},...(spec.triggerPin?[{id:'trigger',op:'mode' as const,pin:spec.triggerPin,mode:'OUTPUT' as const}]:[]),parking?{id:'stop',op:'if',condition:{source:'distanceCm',pin:spec.inputPin!,operator:'lte',threshold:values.stopCm},then:[write('stop-on',255)],else:[{id:'warning',op:'if',condition:{source:'distanceCm',pin:spec.inputPin!,operator:'lte',threshold:values.warningCm},then:[write('warning-on',127)],else:[write('safe',0)]}]}:{id:'water',op:'if',condition:{source:'moisturePercent',pin:spec.inputPin!,operator:'lt',threshold:values.threshold},then:[write('on',1)],else:[write('off',0)]},{id:'wait',op:'wait',ms:parking?100:50}]};return state;
}
