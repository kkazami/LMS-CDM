import type { ControllerProgram, Instruction, Level, ResponseState } from '../domain/types';
import { DEFAULT_ENVIRONMENT } from '../domain/types';
import type { ControllerSpec } from '../domain/controller-wiring';

export function controllerSpec(level:Level,variantId:string):ControllerSpec{
  const values=level.variants.find(v=>v.id===variantId)!.values;
  if(level.id==='INT-04')return {outputPin:`D${values.outputPinNumber}`,inputPin:`D${values.echoPinNumber}`,triggerPin:`D${values.triggerPinNumber}`,sensor:'ultrasonic-sensor',resistanceOhms:330};
  if(level.id==='INT-06')return {outputPin:`D${values.outputPinNumber}`,inputPin:`A${values.analogPinNumber}`,sensor:'soil-sensor',outputKind:'pump',resistanceOhms:330};
  return {outputPin:`D${values.outputPinNumber??13}`,resistanceOhms:330,...(values.buttonPinNumber!==undefined?{button:true,inputPin:`D${values.buttonPinNumber}`} : values.analogPinNumber!==undefined?{sensor:level.id==='INT-03'?'temperature-sensor' as const:'light-sensor' as const,inputPin:`A${values.analogPinNumber}`}:{})};
}
/** Public starting hardware and deliberately unfinished instructions; no grading cases or accepted program. */
export function starterState(level:Level,variantId:string):ResponseState{
  const spec=controllerSpec(level,variantId),variant=level.variants.find(v=>v.id===variantId)!;
  if(level.id==='INT-04'||level.id==='INT-06')return finalStarter(level,variantId);
  const state:ResponseState={answers:{},wires:[],switchClosed:false,graph:{version:1,environment:{...DEFAULT_ENVIRONMENT},components:[{id:'uno-board',kind:'uno',position:{x:0,y:0},properties:{}},{id:'led-limit',kind:'resistor',position:{x:620,y:20},properties:{value:330}},{id:'led-output',kind:'led',position:{x:620,y:220},properties:{value:2}}]}};
  if(spec.button)state.graph!.components.push({id:'input-button',kind:'button',position:{x:0,y:360},properties:{}});
  if(spec.sensor)state.graph!.components.push({id:'input-sensor',kind:spec.sensor,position:{x:300,y:360},properties:{}});
  const connections=[['uno-board',spec.outputPin,'led-limit','left'],['led-limit','right','led-output','anode'],['led-output','cathode','uno-board','GND1']];
  if(spec.button)connections.push(['uno-board',spec.inputPin!,'input-button','left'],['input-button','right','uno-board','GND2']);
  if(spec.sensor)connections.push(['uno-board','5V','input-sensor','vcc'],['uno-board','GND2','input-sensor','ground'],['input-sensor','signal','uno-board',spec.inputPin!]);
  if(level.id!=='MCU-04')state.wires=connections.map(([a,b,c,d],i)=>({id:`starter-wire-${i}`,from:{componentId:a,terminalId:b},to:{componentId:c,terminalId:d}}));
  const mode:Instruction={id:'configure-output',op:'mode',pin:spec.outputPin,mode:level.id==='MCU-04'?'INPUT':'OUTPUT'};
  let instructions:Instruction[]=[mode];
  if(level.id==='MCU-05')instructions=[{id:'off',op:'write',pin:spec.outputPin,value:0},{id:'wait-on',op:'wait',ms:variant.values.halfPeriodMs},{id:'on',op:'write',pin:spec.outputPin,value:1},mode,{id:'wait-off',op:'wait',ms:variant.values.halfPeriodMs}];
  else if(level.id==='MCU-07')instructions=[mode,{id:'configure-input',op:'mode',pin:spec.inputPin!,mode:'INPUT'},{id:'map-signal',op:'map',inputPin:spec.inputPin!,outputPin:'D13'}];
  else if(spec.button||spec.sensor){
    instructions=[mode,{id:'configure-input',op:'mode',pin:spec.inputPin!,mode:spec.button?'INPUT_PULLUP':'INPUT'},{id:'decide',op:'if',condition:{source:spec.button?'digital':level.id==='INT-03'?'temperatureC':'lightPercent',pin:spec.inputPin!,operator:level.id==='INT-03'?'lt':spec.button?'eq':'gte',threshold:spec.button?1:variant.values.threshold},then:[{id:'turn-on',op:'write',pin:spec.outputPin,value:1}],else:[{id:'turn-off',op:'write',pin:spec.outputPin,value:0}]},{id:'sample-wait',op:'wait',ms:50}];
  }else if(level.id==='MCU-08')instructions=[{...mode,pin:'D12'},{id:'on',op:'write',pin:spec.outputPin,value:1},{id:'wait-on',op:'wait',ms:1000},{id:'off',op:'write',pin:spec.outputPin,value:0},{id:'wait-off',op:'wait',ms:1000}];
  else instructions.push({id:'turn-on',op:'write',pin:spec.outputPin,value:0});
  state.controller={version:1,instructions,repeat:level.id!=='MCU-04'&&level.id!=='MCU-07',horizonMs:Math.min(10000,variant.values.halfPeriodMs?variant.values.halfPeriodMs*4+1:1000)} satisfies ControllerProgram;
  return state;
}
export function finalStarter(level:Level,variantId:string):ResponseState{
  const spec=controllerSpec(level,variantId),values=level.variants.find(v=>v.id===variantId)!.values,pump=spec.outputKind==='pump';
  const state:ResponseState={answers:{},wires:[],switchClosed:false,graph:{version:1,environment:{...DEFAULT_ENVIRONMENT},components:[{id:'uno-board',kind:'uno',position:{x:0,y:0},properties:{}},{id:'input-sensor',kind:spec.sensor!,position:{x:0,y:350},properties:{}},...(pump?[{id:'pump-driver',kind:'pump-driver' as const,position:{x:620,y:0},properties:{}},{id:'pump-load',kind:'pump' as const,position:{x:620,y:260},properties:{}}]:[{id:'led-limit',kind:'resistor' as const,position:{x:620,y:0},properties:{value:330}},{id:'led-output',kind:'led' as const,position:{x:620,y:220},properties:{value:2}}])]} };
  const edges=pump?[
    ['uno-board','5V','input-sensor','vcc'],['uno-board','GND1','input-sensor','ground'],['uno-board',spec.inputPin!,'input-sensor','signal'],['uno-board','5V','pump-driver','vcc'],['uno-board','GND2','pump-driver','ground'],['uno-board',spec.outputPin,'pump-driver','control'],['pump-driver','load-positive','pump-load','positive'],['pump-driver','load-negative','pump-load','negative'],
  ]:[['uno-board',spec.outputPin,'led-limit','left'],['led-limit','right','led-output','anode'],['led-output','cathode','uno-board','GND1'],['uno-board','5V','input-sensor','vcc'],['uno-board','GND2','input-sensor','ground'],['uno-board',spec.inputPin!,'input-sensor','echo'],['uno-board',spec.triggerPin!,'input-sensor','trig']];
  state.wires=edges.map(([a,b,c,d],i)=>({id:`starter-${i}`,from:{componentId:a,terminalId:b},to:{componentId:c,terminalId:d}}));
  const write=(id:string,value:number):Instruction=>pump?{id,op:'write',pin:spec.outputPin,value}:{id,op:'pwm',pin:spec.outputPin,value};
  const instructions:Instruction[]=[{id:'output',op:'mode',pin:spec.outputPin,mode:'OUTPUT'},{id:'input',op:'mode',pin:spec.inputPin!,mode:'INPUT'}];
  if(spec.triggerPin)instructions.push({id:'trigger',op:'mode',pin:spec.triggerPin,mode:'INPUT'});
  instructions.push(pump?{id:'decision',op:'if',condition:{source:'moisturePercent',pin:spec.inputPin!,operator:'gte',threshold:values.threshold},then:[write('on',1)],else:[write('off',0)]}:{id:'stop-rule',op:'if',condition:{source:'distanceCm',pin:spec.inputPin!,operator:'gt',threshold:values.stopCm},then:[write('stop',255)],else:[{id:'warning-rule',op:'if',condition:{source:'distanceCm',pin:spec.inputPin!,operator:'lte',threshold:values.warningCm},then:[write('warning',127)],else:[write('safe',0)]}]},{id:'wait',op:'wait',ms:pump?50:100});
  state.controller={version:1,instructions,repeat:true,horizonMs:1000};return state;
}
