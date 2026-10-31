import type { Criterion, Level, ResponseState } from '../domain/types';
import { DEFAULT_ENVIRONMENT } from '../domain/types';
import { evaluateElectrical, evaluateLogic } from '../domain/graph';

// Private assessment definitions: never import this module from a client component.
const keys:Record<string,string[]>={
  'CIR-06':['0','1','2','0','1','0'],
  'SEN-01':['2','3','5','0','1','4'],
  'SEN-02':['0','1','2','3','4','5'],
  'SEN-03':['0','1','1','2','0','1'],
  'SEN-05':['2','0','3','5','1','4'],
  'SEN-08':['1','0','1','2','2','1'],
};
const explanations:Record<string,string[]>={
  'CIR-06':['A missing return opens the only current path.','Connect anode toward positive, cathode toward negative.','A wire across the resistor removes its current limiting.','A supply short must be removed before applying power.','Screen position does not change the connected terminals.','Protection resistance belongs in the LED current path.'],
  'SEN-01':['Ultrasonic modules time acoustic echoes.','A PIR dome collects changing infrared patterns.','A soil probe needs soil-specific calibration.','The light module responds to brightness.','The TMP36 output depends on temperature.','An IR reflectance module detects reflected infrared light.'],
  'SEN-02':['Light level is normalized here.','TMP36 measures temperature via voltage.','Echo timing estimates distance.','PIR detects changing infrared patterns associated with motion.','The IR module responds to reflection.','The soil probe estimates relative moisture after calibration.'],
  'SEN-03':['TMP36 provides analog voltage.','The duration of the echo encodes distance.','Continuous distance can be communicated by a digital pulse.','A 10-bit unsigned ADC has 1024 codes: 0 through 1023.','The selected PIR module reports motion with HIGH/LOW.','The selected IR comparator reports HIGH/LOW.'],
  'SEN-05':['Use timed ultrasonic echoes for this distance task.','Use the light module for brightness.','Use PIR for motion, with its occupancy limitations.','Use calibrated soil moisture, with a separate pump driver later.','Use TMP36 for this temperature task.','Use IR reflectance for contrasting surfaces.'],
  'SEN-08':['An unpowered sensor cannot supply a trustworthy measurement.','A shared signal reference is required.','Sample the pin actually connected to the signal.','Calibrate the probe at known wet/dry endpoints.','Averaging may reduce random noise but not repair wiring.','An echo timeout is missing data, not a zero-distance measurement.'],
};
export const SPRINT2_HINTS:Record<string,string[]>={
  'CIR-04':['Use the same current path through the resistor and LED.','Subtract the 2 V LED drop before dividing by resistance.','Try 330 Ω at 5 V or 390 Ω at 6 V, then verify 8–12 mA and an open switch.'],
  'CIR-05':['Series adds resistance; parallel provides more paths.','For two parallel resistors use R1×R2/(R1+R2).','Use I(mA)=1000×V/Req. No LED drop applies to these resistor-only predictions.'],
  'CIR-06':['Follow the path from positive back to negative.','A missing path, reverse LED and resistor bypass are different faults.','Remove a supply short and restore series protection before power; moving icons does not change connectivity.'],
  'CIR-07':['Convert milliamps to amperes before calculating resistance.','Use (Vs−Vf)/Itarget, then recalculate with a listed standard value.','At 5 V choose 330 Ω; at 9 V choose 750 Ω. Confirm 8–10 mA.'],
  'CIR-08':['Write all four A/B input combinations first.','Differing inputs describe XOR; agreeing inputs describe XNOR.','Use one XOR gate for variant a or one XNOR for variant b; equivalent acyclic gate networks also work.'],
  'SEN-01':['Look for the module’s sensing mechanism.','Sound gives echo timing; a PIR dome detects infrared changes.','Match ultrasonic, PIR, soil, light, TMP36 and IR reflectance to their six clues.'],
  'SEN-02':['Separate physical quantity from signal voltage or digital format.','PIR is motion-related; ultrasonic estimates distance.','Use the six quantity labels in the explorer; moisture is relative and calibrated.'],
  'SEN-03':['Continuous quantities can use digital communication.','A 10-bit ADC has 1024 integer codes.','TMP36 is analog voltage; ultrasonic uses pulse duration; selected PIR and IR modules output flags.'],
  'SEN-04':['Set every control to the displayed target before recording readings.','Counts round percent×1023/100; TMP36 is 0.5+0.01×°C.','Echo is 2×cm/0.0343 µs; PIR follows motion, IR goes HIGH at reflectance ≥50%.'],
  'SEN-05':['Begin with the quantity your scenario needs.','Do not use a PIR as a centimeter rangefinder.','Choose ultrasonic for distance, light for brightness, PIR for motion, soil for moisture, TMP36 for temperature, IR for line contrast.'],
  'SEN-06':['Predict using the stated normalized transfer models.','Round only the final ADC count.','Light/moisture use percent×1023/100, temperature uses 0.5+0.01×°C, and echo is 2×cm/0.0343.'],
  'SEN-07':['Echo time measures a round trip.','Divide by two and keep microseconds paired with cm/µs.','Distance is echo×0.0343/2 cm. Equality is false for <35, true for ≤20 and ≥50.'],
  'SEN-08':['Check power, reference and signal path before thresholds.','Averaging cannot fix a disconnected supply or a wrong pin.','Calibrate moisture direction; treat a timed-out ultrasonic echo as invalid data.'],
};
function criterion(id:string,passed:boolean,feedback:string,possible=1,mandatory=false):Criterion{return {id,concept:id,passed,feedback,possible,points:passed?possible:0,mandatory};}
export function sprint2Answers(level:Level,variantId:string):Record<string,string>{
  const v=level.variants.find(variant=>variant.id===variantId)!;const n=v.values;
  if(keys[level.id])return Object.fromEntries(keys[level.id].map((key,i)=>[`q${i+1}`,key]));
  if(level.id==='CIR-05'){const series=n.r1Ohms+n.r2Ohms,parallel=n.r1Ohms*n.r2Ohms/series;return {q1:String(series),q2:String(parallel),q3:String(1000*n.supplyVolts/series),q4:String(1000*n.supplyVolts/parallel)};}
  if(level.id==='CIR-07'){const resistance=variantId==='a'?330:750;return {q1:String((n.supplyVolts-n.ledForwardVolts)/(n.targetMilliamps/1000)),q2:'1',q3:String((n.supplyVolts-n.ledForwardVolts)/resistance*1000)};}
  if(level.id==='SEN-04')return {q1:String(Math.round(n.lightPercent*1023/100)),q2:String(0.5+n.temperatureC*0.01),q3:String(n.distanceCm*2/0.0343),q4:String(n.motion),q5:String(n.reflectancePercent>=50?1:0),q6:String(Math.round(n.moisturePercent*1023/100))};
  if(level.id==='SEN-06')return {q1:String(Math.round(n.lightPercent*1023/100)),q2:String(0.5+n.temperatureC*0.01),q3:String(n.distanceCm*2/0.0343),q4:String(Math.round(n.moisturePercent*1023/100))};
  if(level.id==='SEN-07')return {q1:String(n.echoMicroseconds*0.0343/2),q2:'1',q3:'1',q4:'1'};
  return {};
}
function numericAnswer(value:string|undefined):number|undefined {if(value===undefined||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?$/i.test(value.trim()))return undefined;const number=Number(value);return Number.isFinite(number)?number:undefined;}
export function sprint2Criteria(level:Level,variantId:string,state:ResponseState):Criterion[]{
  const variant=level.variants.find(v=>v.id===variantId)!;
  if(level.kind==='circuit-build'){
    const on=evaluateElectrical({...state,switchClosed:true}),off=evaluateElectrical({...state,switchClosed:false});
    const target=on.valid&&on.closed&&on.currentMilliamps>=variant.values.minCurrentMilliamps-1e-9&&on.currentMilliamps<=variant.values.maxCurrentMilliamps+1e-9;
    const configuration=Boolean(state.graph&&state.graph.components.find(p=>p.kind==='battery')?.properties.value===variant.values.supplyVolts&&state.graph.components.find(p=>p.kind==='led')?.properties.value===variant.values.ledForwardVolts&&state.graph.components.filter(p=>p.kind==='switch').length===1);
    return [criterion('led-current',target,on.message+' Required closed current: 8–12 mA.',60,true),criterion('open-switch',off.valid&&!off.closed&&off.currentMilliamps===0,off.message,20,true),criterion('specified-parts',configuration,'Use the specified supply, a 2 V LED and exactly one switch. Protection and topology are checked independently.',20,true)];
  }
  if(level.kind==='logic-build'){
    const result=evaluateLogic(state),components=state.graph?.components??[];
    const criteria=[0,1,2,3].map(i=>criterion(`truth-row-${i}`,result.valid&&result.rows.length===4&&result.rows[i].outputs.length===1&&result.rows[i].outputs[0]===(variantId==='a'?[false,true,true,false]:[true,false,false,true])[i],result.valid?`Input ${Math.floor(i/2)}${i%2}: compare the required table with your output.`:result.message,20,true));
    criteria.push(criterion('logic-configuration',components.filter(c=>c.kind==='input').length===2&&components.filter(c=>c.kind==='output').length===1&&components.some(c=>!['input','output'].includes(c.kind)),'Use input channels 0/1, output channel 0 and at least one supported gate.',20,true));return criteria;
  }
  const answers=sprint2Answers(level,variantId);
  const criteria=variant.questions.map(question=>{
    const answer=state.answers[question.id], expected=answers[question.id],number=numericAnswer(answer);
    const passed=question.numeric?number!==undefined&&number>=question.numeric.minimum&&number<=question.numeric.maximum&&Math.abs(number-Number(expected))<=question.numeric.tolerance+1e-9:answer===expected;
    const feedback=question.numeric?`Use ${question.numeric.unit}. Expected ${Number(expected).toFixed(question.numeric.tolerance===0?0:3)} within ±${question.numeric.tolerance}.`:(explanations[level.id]?.[Number(question.id.slice(1))-1]??'Apply the specified comparison operator: equality is excluded by <, included by ≤ and ≥.');
    const mandatory=level.id==='CIR-07'||level.id==='CIR-06'&&['q3','q4','q6'].includes(question.id)||level.id==='SEN-08'&&['q1','q2','q3','q6'].includes(question.id)||level.id==='SEN-07'&&question.id!=='q1';
    return criterion(`${level.id}-${question.id}`,passed,feedback,1,mandatory);
  });
  if(level.id==='SEN-04')criteria.push(criterion('controlled-environment',Boolean(state.graph&&Object.entries(variant.values).every(([key,value])=>state.graph!.environment[key as keyof typeof state.graph.environment]===value)),'Set all six environment controls to the prescribed target values, then record the readings.',1,true));
  return criteria;
}
export function sprint2Fixture(level:Level,variantId:string):ResponseState {
  const state:ResponseState={answers:sprint2Answers(level,variantId),wires:[],switchClosed:true};const variant=level.variants.find(v=>v.id===variantId)!;
  if(level.id==='SEN-04')state.graph={version:1,components:[],environment:{...DEFAULT_ENVIRONMENT,...variant.values}};
  if(level.kind==='circuit-build'){
    state.graph={version:1,environment:{...DEFAULT_ENVIRONMENT},components:[{id:'battery-main',kind:'battery',position:{x:0,y:0},properties:{value:variant.values.supplyVolts}},{id:'resistor-main',kind:'resistor',position:{x:250,y:0},properties:{value:variantId==='a'?330:390}},{id:'led-main',kind:'led',position:{x:250,y:180},properties:{value:2}},{id:'switch-main',kind:'switch',position:{x:0,y:180},properties:{}}]};
    const pins=[['battery-main','positive','resistor-main','left'],['resistor-main','right','led-main','anode'],['led-main','cathode','switch-main','left'],['switch-main','right','battery-main','negative']];state.wires=pins.map(([a,b,c,d],i)=>({id:`w${i}`,from:{componentId:a,terminalId:b},to:{componentId:c,terminalId:d}}));
  }
  if(level.kind==='logic-build'){
    state.graph={version:1,environment:{...DEFAULT_ENVIRONMENT},components:[{id:'in-a',kind:'input',position:{x:0,y:0},properties:{channel:0}},{id:'in-b',kind:'input',position:{x:0,y:120},properties:{channel:1}},{id:'gate-main',kind:variantId==='a'?'XOR':'XNOR',position:{x:240,y:40},properties:{}},{id:'out-main',kind:'output',position:{x:480,y:40},properties:{channel:0}}]};
    state.wires=[{id:'wa',from:{componentId:'in-a',terminalId:'out'},to:{componentId:'gate-main',terminalId:'a'}},{id:'wb',from:{componentId:'in-b',terminalId:'out'},to:{componentId:'gate-main',terminalId:'b'}},{id:'wc',from:{componentId:'gate-main',terminalId:'out'},to:{componentId:'out-main',terminalId:'in'}}];
  }
  return state;
}
