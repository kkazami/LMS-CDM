import type { ControllerProgram, Instruction, ResponseState } from './types';
import { DEFAULT_ENVIRONMENT } from './types';
import type { ControllerFrame } from './controller';
import type { ControllerSpec } from './controller-wiring';
export const EMPTY_CONTROLLER:ControllerProgram={version:1,instructions:[{id:'mode',op:'mode',pin:'D13',mode:'OUTPUT'},{id:'write',op:'write',pin:'D13',value:0}],repeat:false,horizonMs:1000};
export function instructionList(program:ControllerProgram|undefined):Instruction[]{const all=[...(program?.instructions??[])];for(let i=0;i<all.length;i++){const item=all[i];if(item.op==='if')all.push(...item.then,...item.else);}return all;}
export function inferredSpec(state:ResponseState):ControllerSpec{
  const all=instructionList(state.controller),driven=all.find(i=>i.op==='write'||i.op==='pwm'||i.op==='map'),read=all.find(i=>i.op==='if'||i.op==='map');
  const sensorPart=state.graph?.components.find(p=>['light-sensor','temperature-sensor','ultrasonic-sensor','soil-sensor'].includes(p.kind));
  const sensor=sensorPart?.kind as ControllerSpec['sensor'];
  const triggerWire=sensorPart&&state.wires.find(w=>w.from.componentId===sensorPart.id&&w.from.terminalId==='trig'||w.to.componentId===sensorPart.id&&w.to.terminalId==='trig');
  const triggerEnd=triggerWire&&(triggerWire.from.componentId===sensorPart?.id?triggerWire.to:triggerWire.from);
  const button=state.graph?.components.some(p=>p.kind==='button')??false;
  return {outputPin:driven?.op==='map'?driven.outputPin:driven&&(driven.op==='write'||driven.op==='pwm')?driven.pin:'D13',resistanceOhms:330,...(state.graph?.components.some(p=>p.kind==='pump')?{outputKind:'pump' as const}:{}),...(sensor?{sensor,inputPin:read?.op==='map'?read.inputPin:read?.op==='if'?read.condition.pin:sensor==='ultrasonic-sensor'?'D2':'A0',...(sensor==='ultrasonic-sensor'?{triggerPin:triggerEnd?.terminalId??'D3'}:{})}:button?{button,inputPin:read?.op==='if'?read.condition.pin:'D2'}:{})};
}
export function workspaceFrame(state:ResponseState,spec:ControllerSpec):ControllerFrame{
  const environment=state.graph?.environment??DEFAULT_ENVIRONMENT;
  if(spec.button)return {atMs:0,digital:{[spec.inputPin!]:state.switchClosed?0:1}};
  if(spec.sensor==='ultrasonic-sensor')return {atMs:0,sensors:{[spec.inputPin!]:{quantity:'distanceCm',value:environment.distanceCm,triggerPin:spec.triggerPin}}};
  if(spec.sensor==='soil-sensor')return {atMs:0,analog:{[spec.inputPin!]:Math.round(environment.moisturePercent/100*1023)},sensors:{[spec.inputPin!]:{quantity:'moisturePercent',value:environment.moisturePercent}}};
  if(spec.sensor)return {atMs:0,analog:{[spec.inputPin!]:spec.sensor==='temperature-sensor'?Math.round((0.5+environment.temperatureC*0.01)/5*1023):Math.round(environment.lightPercent/100*1023)},sensors:{[spec.inputPin!]:{quantity:spec.sensor==='temperature-sensor'?'temperatureC':'lightPercent',value:spec.sensor==='temperature-sensor'?environment.temperatureC:environment.lightPercent}}};
  return {atMs:0};
}
