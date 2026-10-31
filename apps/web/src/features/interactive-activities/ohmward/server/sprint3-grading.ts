import type { Criterion, Instruction, Level, ResponseState } from '../domain/types';
import { executeController, type ControllerFrame } from '../domain/controller';
import { controllerWiring } from '../domain/controller-wiring';
import { controllerSpec, starterState } from '../curriculum/controller-starters';
import { checkOutputTimeline, type OutputContract } from '../domain/controller-assessment';
import { canonicalPin } from '../domain/uno';

// Server/CLI-only answer keys, accepted programs and assessment frames.
const answers:Record<string,string[]>={'MCU-01':['1','0','1','2','0','1'],'MCU-02':['1','0','2','1','1','1'],'MCU-03':['0','1','1','1','0','1'],'INT-01':['1','2','0','1','0','1']};
const explanations:Record<string,string[]>={
  'MCU-01':['ATmega328P is the programmable controller.','USB provides the computer interface and may supply power.','Reset restarts the controller.','The barrel jack is an external-supply connection.','A0–A5 are in the analog header.','ICSP is for programming/SPI, not pump power.'],
  'MCU-02':['D3 supports PWM; D13 and D2 do not.','A0 is analog-capable.','The 10-bit ADC uses 0–1023.','PWM duty uses 0–255.','PWM switches between logic states; it is not a DAC.','SDA and A4 are the same underlying signal.'],
  'MCU-03':['Use common GND as the signal reference.','Our sensor VCC uses regulated 5V.','VIN and regulated 5V have different roles.','A pump needs a suitable driver/module and power design.','Place a protective resistor in the actual LED path.','The board GND headers share one net.'],
  'INT-01':['The light module senses the environment.','The controller compares/transforms sensor information.','The protected LED is an output.','The power circuit supplies energy; sensor readings supply information.','GND provides a shared voltage reference.','Correct software cannot energize a disconnected output path.'],
};
export const SPRINT3_HINTS:Record<string,string[]>={
  'MCU-01':['Explore the labeled board regions first.','Separate controller, connectors, headers and reset.','ATmega328P controls; USB connects to a computer; reset restarts; ICSP is programming/SPI.'],
  'MCU-02':['Read the PWM and analog capability flags for the selected pin.','Only D3/5/6/9/10/11 support PWM on R3.','ADC is 0–1023, PWM 0–255; PWM is switching and SDA duplicates A4.'],
  'MCU-03':['Identify supply, reference and signal separately.','Never treat VIN, regulated 5V and GPIO as interchangeable.','Use common GND, rated sensor power, series LED resistance and a driver for a pump.'],
  'MCU-04':['Wire the specified digital output to the protected LED loop.','Mode must be OUTPUT on the actual wired pin before HIGH.','Use 330 Ω and a 2 V LED, return to GND, then mode OUTPUT followed by write 1.'],
  'MCU-05':['Start with the mode declaration.','Alternate HIGH/wait and LOW/wait; both waits use the displayed half-period.','Order: OUTPUT → HIGH → wait → LOW → wait, with Repeat enabled.'],
  'MCU-06':['INPUT_PULLUP means pressed reads 0.','Use both then and else writes so release turns the LED off.','Configure input pull-up/output, compare digital ==0, write 1 else 0, wait 50 ms and repeat.'],
  'MCU-07':['Different numeric ranges require scaling, not copying.','The output pin must support PWM.','Configure analog INPUT and PWM OUTPUT, then map floor(ADC×255/1023).'],
  'MCU-08':['Inspect the first trace error and compare pins with the task.','Variant a needs two 500 ms waits; variant b needs active-LOW logic.','Fix the actual output mode/pin before blink timing, or change the button comparison to ==0 with an else OFF.'],
  'INT-01':['Distinguish information flow from energy flow.','Sensor → controller → output needs power and a shared reference.','A sensor measures, the controller decides, the output responds; software cannot fix disconnected power.'],
  'INT-02':['Connect light VCC/GND/signal and the protected output.','The dark condition is strict: equality belongs to OFF.','Use lightPercent < displayed threshold, write 1 else 0, wait 50 ms, repeat.'],
  'INT-03':['The alarm indicator must respond to both warming and cooling.','Equality belongs to ON for this alarm.','Use temperatureC ≥ displayed threshold, write 1 else 0, wait 50 ms, repeat with correct sensor wiring.'],
};
function criterion(id:string,passed:boolean,possible:number,feedback:string,mandatory=true):Criterion{return {id,concept:id,passed,possible,points:passed?possible:0,feedback,mandatory};}
type Case={name:string;frames:ControllerFrame[];horizon:number;expected:OutputContract};
export function controllerCases(level:Level,variantId:string):Case[]{
  const spec=controllerSpec(level,variantId),values=level.variants.find(v=>v.id===variantId)!.values;
  if(level.id==='MCU-04')return [{name:'constant HIGH',frames:[{atMs:0}],horizon:10000,expected:{kind:'constant',value:255}}];
  if(values.halfPeriodMs)return [{name:'complete blink waveform',frames:[{atMs:0}],horizon:10000,expected:{kind:'blink',halfPeriodMs:values.halfPeriodMs}}];
  if(level.id==='MCU-07')return [0,1,128,511,512,1022,1023].map(adc=>({name:`ADC ${adc}`,frames:[{atMs:0,analog:{[spec.inputPin!]:adc}}],horizon:10000,expected:{kind:'constant',value:Math.floor(adc*255/1023)}}));
  const frame=(value:number,atMs=0):ControllerFrame=>spec.button?{atMs,digital:{[spec.inputPin!]:value}}:{atMs,sensors:{[spec.inputPin!]:{quantity:level.id==='INT-03'?'temperatureC':'lightPercent',value}}};
  const expected=(value:number)=>spec.button?value===0?255:0:level.id==='INT-03'?value>=values.threshold?255:0:value<values.threshold?255:0;
  const points=spec.button?[0,1]:[values.threshold-0.01,values.threshold,values.threshold+0.01,level.id==='INT-03'?-20:0,level.id==='INT-03'?80:100];
  const cases:Case[]=points.map(value=>({name:`boundary ${value}`,frames:[frame(value)],horizon:10000,expected:{kind:'constant',value:expected(value)}}));
  for(const reverse of [false,true]){const on=spec.button?0:values.threshold-1,off=spec.button?1:values.threshold+1,sequence=reverse?[off,on,off]:[on,off,on];cases.push({name:reverse?'reverse transition':'forward transition',frames:sequence.map((value,i)=>frame(value,[0,113,227][i])),horizon:10000,expected:{kind:'response',settlingMs:50,targets:sequence.map((value,i)=>({atMs:[0,113,227][i],value:expected(value)}))}});}
  return cases;
}
export function sprint3Criteria(level:Level,variantId:string,state:ResponseState):Criterion[]{
  if(level.kind==='quiz')return level.variants.find(v=>v.id===variantId)!.questions.map(question=>{const index=Number(question.id.slice(1))-1,key=answers[level.id]?.[index],passed=key!==undefined&&state.answers[question.id]===key;return criterion(`${level.id}-${question.id}`,passed,1,explanations[level.id]?.[index]??'Review the input/controller/output stage.',level.id==='MCU-03'||level.id==='MCU-02'&&['q1','q5'].includes(question.id));});
  const spec=controllerSpec(level,variantId),wiring=controllerWiring(state,spec),cases=controllerCases(level,variantId);
  const behavior=cases.map(test=>{
    const result=executeController(state.controller?{...state.controller,horizonMs:test.horizon}:undefined,test.frames);
    const proof=checkOutputTimeline(result,spec.outputPin,test.horizon,test.expected);
    return {...criterion(`${level.id}-${test.name}`,proof.passed,80/cases.length,`${test.name}: ${proof.feedback}`),concept:`${level.id}-behavior`};
  });
  const all:Instruction[]=[...(state.controller?.instructions??[])];for(let i=0;i<all.length;i++){const item=all[i];if(item.op==='if')all.push(...item.then,...item.else);}
  const needsRepeat=level.id!=='MCU-04'&&level.id!=='MCU-07';
  const modeOk=!spec.inputPin||all.some(instruction=>instruction.op==='mode'&&canonicalPin(instruction.pin)===canonicalPin(spec.inputPin!)&&instruction.mode===(spec.button?'INPUT_PULLUP':'INPUT'));
  const waitsOk=!needsRepeat||state.controller?.repeat===true&&all.some(instruction=>instruction.op==='wait'&&instruction.ms===(level.variants.find(v=>v.id===variantId)!.values.halfPeriodMs??50));
  const rules=all.filter((instruction):instruction is Extract<Instruction,{op:'if'}>=>instruction.op==='if');
  const rule=rules[0]?.condition,values=level.variants.find(v=>v.id===variantId)!.values;
  const needsRule=Boolean(spec.inputPin)&&level.id!=='MCU-07';
  const ruleOk=!needsRule||rules.length===1&&rule!==undefined&&rule.source===(spec.button?'digital':level.id==='INT-03'?'temperatureC':'lightPercent')&&canonicalPin(rule.pin)===canonicalPin(spec.inputPin!)&&rule.operator===(spec.button?'eq':level.id==='INT-03'?'gte':'lt')&&rule.threshold===(spec.button?0:values.threshold);
  const maps=all.filter(instruction=>instruction.op==='map');
  const mapOk=level.id!=='MCU-07'||maps.length===1&&maps[0].op==='map'&&canonicalPin(maps[0].inputPin)===canonicalPin(spec.inputPin!)&&canonicalPin(maps[0].outputPin)===canonicalPin(spec.outputPin)&&all.every(instruction=>['mode','map','wait'].includes(instruction.op));
  return [...behavior,criterion(`${level.id}-required-configuration`,wiring.valid&&modeOk&&waitsOk&&ruleOk&&mapOk,20,wiring.message+' Use the specified modes/timing. Rule tasks require one direct comparison with the exact stated source, pin, operator and threshold; mapping requires one correct map plus modes/optional waits, without a manual lookup.')];
}
export function sprint3Fixture(level:Level,variantId:string):ResponseState{
  if(level.kind==='quiz')return {answers:Object.fromEntries((answers[level.id]??[]).map((answer,i)=>[`q${i+1}`,answer])),wires:[],switchClosed:true};
  const state=starterState(level,variantId),spec=controllerSpec(level,variantId),values=level.variants.find(v=>v.id===variantId)!.values;
  if(level.id==='MCU-04')state.wires=[{id:'w1',from:{componentId:'uno-board',terminalId:spec.outputPin},to:{componentId:'led-limit',terminalId:'left'}},{id:'w2',from:{componentId:'led-limit',terminalId:'right'},to:{componentId:'led-output',terminalId:'anode'}},{id:'w3',from:{componentId:'led-output',terminalId:'cathode'},to:{componentId:'uno-board',terminalId:'GND1'}}];
  const instructions:Instruction[]=[{id:'output-mode',op:'mode',pin:spec.outputPin,mode:'OUTPUT'}];
  if(spec.inputPin)instructions.push({id:'input-mode',op:'mode',pin:spec.inputPin,mode:spec.button?'INPUT_PULLUP':'INPUT'});
  if(values.halfPeriodMs)instructions.push({id:'on',op:'write',pin:spec.outputPin,value:1},{id:'wait-on',op:'wait',ms:values.halfPeriodMs},{id:'off',op:'write',pin:spec.outputPin,value:0},{id:'wait-off',op:'wait',ms:values.halfPeriodMs});
  else if(level.id==='MCU-07')instructions.push({id:'map',op:'map',inputPin:spec.inputPin!,outputPin:spec.outputPin});
  else if(spec.inputPin)instructions.push({id:'decision',op:'if',condition:{source:spec.button?'digital':level.id==='INT-03'?'temperatureC':'lightPercent',pin:spec.inputPin,operator:spec.button?'eq':level.id==='INT-03'?'gte':'lt',threshold:spec.button?0:values.threshold},then:[{id:'on',op:'write',pin:spec.outputPin,value:1}],else:[{id:'off',op:'write',pin:spec.outputPin,value:0}]},{id:'wait',op:'wait',ms:50});
  else instructions.push({id:'on',op:'write',pin:spec.outputPin,value:1});
  state.controller={version:1,instructions,repeat:level.id!=='MCU-04'&&level.id!=='MCU-07',horizonMs:Math.min(10000,values.halfPeriodMs?values.halfPeriodMs*4+1:1000)};
  return state;
}
