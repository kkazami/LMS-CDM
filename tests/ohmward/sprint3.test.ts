import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UNO_PINS, unoPin, canonicalPin } from '../../apps/web/src/features/interactive-activities/ohmward/domain/uno';
import { controllerSchema } from '../../apps/web/src/features/interactive-activities/ohmward/domain/controller-schema';
import { executeController, outputAt, mappedPwm } from '../../apps/web/src/features/interactive-activities/ohmward/domain/controller';
import { controllerWiring } from '../../apps/web/src/features/interactive-activities/ohmward/domain/controller-wiring';
import { controllerSpec, starterState } from '../../apps/web/src/features/interactive-activities/ohmward/curriculum/controller-starters';
import { getLevel, integrationReady, challengeUnlocked, LEVELS } from '../../apps/web/src/features/interactive-activities/ohmward/curriculum/catalog';
import { gradeResponse, correctFixture } from '../../apps/web/src/features/interactive-activities/ohmward/server/grading';
import { sandboxCapabilities, sandboxValidation } from '../../apps/web/src/features/interactive-activities/ohmward/domain/workspace';
import { connectionFor } from '../../apps/web/src/features/interactive-activities/ohmward/workbench/adapter';
import { checkOutputTimeline } from '../../apps/web/src/features/interactive-activities/ohmward/domain/controller-assessment';
import type { ControllerProgram, Instruction, ResponseState } from '../../apps/web/src/features/interactive-activities/ohmward/domain/types';
const program=(instructions:Instruction[],repeat=false,horizonMs=1001):ControllerProgram=>({version:1,instructions,repeat,horizonMs});
const blink:Instruction[]=[{id:'mode',op:'mode',pin:'D13',mode:'OUTPUT'},{id:'on',op:'write',pin:'D13',value:1},{id:'hold-on',op:'wait',ms:500},{id:'off',op:'write',pin:'D13',value:0},{id:'hold-off',op:'wait',ms:500}];

test('Uno R3 registry matches independent pin sets and alias facts',()=>{
  assert.deepEqual(UNO_PINS.filter(pin=>pin.pwm).map(pin=>pin.id),['D3','D5','D6','D9','D10','D11']);
  assert.deepEqual(UNO_PINS.filter(pin=>pin.analog&&!pin.alias).map(pin=>pin.id),['A0','A1','A2','A3','A4','A5']);
  assert.equal(UNO_PINS.filter(pin=>/^D\d+$/.test(pin.id)).length,14);assert.equal(unoPin('D13')!.pwm,false);assert.equal(unoPin('A0')!.digital,true);
  assert.equal(canonicalPin('SDA'),'A4');assert.equal(canonicalPin('SCL'),'A5');assert.equal(canonicalPin('GND3'),'GND');assert.equal(unoPin('5V')!.digital,false);assert.equal(unoPin('AREF')!.analog,false);
});
test('blink timing uses a virtual clock with exact boundaries and repeated cycles',()=>{
  const result=executeController(program(blink,true,2001),[{atMs:0}]);assert.equal(result.valid,true);
  for(const [time,expected] of [[0,255],[499,255],[500,0],[999,0],[1000,255],[1499,255],[1500,0],[1999,0],[2000,255]])assert.equal(outputAt(result,'D13',time),expected);
  assert.equal(result.elapsedMs,2001);assert.ok(result.steps<30);assert.ok(result.trace.every(event=>event.timeMs<=2001));
});
test('unsupported PWM and wrong output modes fail even if PWM is in an unchosen branch',()=>{
  assert.equal(executeController(program([{id:'m',op:'mode',pin:'D13',mode:'OUTPUT'},{id:'p',op:'pwm',pin:'D13',value:128}]),[{atMs:0}]).valid,false);
  assert.equal(executeController(program([{id:'m',op:'mode',pin:'D12',mode:'OUTPUT'},{id:'w',op:'write',pin:'D13',value:1}]),[{atMs:0}]).valid,false);
  const bad:Instruction={id:'if',op:'if',condition:{source:'digital',pin:'D2',operator:'eq',threshold:0},then:[{id:'p',op:'pwm',pin:'D13',value:50}],else:[]};
  assert.equal(executeController(program([bad]),[{atMs:0,digital:{D2:1}}]).valid,false);
  assert.equal(executeController(program([{id:'power-mode',op:'mode',pin:'5V',mode:'OUTPUT'}]),[{atMs:0}]).valid,false);
});
test('program limits reject zero waits, total instruction overflow, nesting, IDs and horizon overflow',()=>{
  assert.equal(controllerSchema.safeParse(program([{id:'wait',op:'wait',ms:0}])).success,false);
  assert.equal(controllerSchema.safeParse(program(Array.from({length:33},(_,i)=>({id:`w${i}`,op:'wait',ms:1})))).success,false);
  assert.equal(controllerSchema.safeParse(program([{id:'same',op:'wait',ms:1},{id:'same',op:'wait',ms:2}])).success,false);
  const nested=(id:string,then:Instruction[]):Instruction=>({id,op:'if',condition:{source:'digital',pin:'D2',operator:'eq',threshold:0},then,else:[]});
  assert.equal(controllerSchema.safeParse(program([nested('one',[nested('two',[{id:'w',op:'wait',ms:1}])])])).success,true);
  assert.equal(controllerSchema.safeParse(program([nested('one',[nested('two',[nested('three',[])])])])).success,false);
  assert.equal(controllerSchema.safeParse(program([{id:'w',op:'wait',ms:1}],false,10001)).success,false);
  const many=program([nested('outer',Array.from({length:20},(_,i)=>({id:`a${i}`,op:'wait',ms:1}))),...Array.from({length:12},(_,i)=>({id:`b${i}`,op:'wait',ms:1}))]);assert.equal(controllerSchema.safeParse(many).success,false);
});
test('a repeated zero-time program terminates at exactly the 1000-step limit',()=>{
  const result=executeController(program([{id:'m',op:'mode',pin:'D13',mode:'OUTPUT'},{id:'w',op:'write',pin:'D13',value:1}],true,10000),[{atMs:0}]);assert.equal(result.valid,false);assert.equal(result.steps,1000);assert.equal(result.elapsedMs,0);assert.equal(result.trace.length,1000);
});
test('ADC to PWM mapping matches independent integer goldens at endpoints and middle',()=>{
  const code=program([{id:'input',op:'mode',pin:'A0',mode:'INPUT'},{id:'output',op:'mode',pin:'D9',mode:'OUTPUT'},{id:'map',op:'map',inputPin:'A0',outputPin:'D9'}]);
  for(const [adc,pwm] of [[0,0],[1,0],[511,127],[512,127],[1022,254],[1023,255]]){assert.equal(mappedPwm(adc),pwm);const result=executeController(code,[{atMs:0,analog:{A0:adc}}]);assert.equal(result.valid,true);assert.equal(outputAt(result,'D9',0),pwm);}
  for(const adc of [-1,1024,NaN,1.5])assert.throws(()=>mappedPwm(adc));
});
test('pull-up decisions follow press and release in the same virtual run',()=>{
  const code=program([{id:'out',op:'mode',pin:'D13',mode:'OUTPUT'},{id:'in',op:'mode',pin:'D2',mode:'INPUT_PULLUP'},{id:'if',op:'if',condition:{source:'digital',pin:'D2',operator:'eq',threshold:0},then:[{id:'on',op:'write',pin:'D13',value:1}],else:[{id:'off',op:'write',pin:'D13',value:0}]},{id:'wait',op:'wait',ms:50}],true,301);
  const result=executeController(code,[{atMs:0,digital:{D2:1}},{atMs:113,digital:{D2:0}},{atMs:227,digital:{D2:1}}]);assert.equal(result.valid,true);assert.equal(outputAt(result,'D13',0),0);assert.equal(outputAt(result,'D13',163),255);assert.equal(outputAt(result,'D13',277),0);
});
test('source types, ADC bounds, input modes and frame ordering are independently validated',()=>{
  const code=program([{id:'mode',op:'mode',pin:'A0',mode:'INPUT'},{id:'if',op:'if',condition:{source:'temperatureC',pin:'A0',operator:'gte',threshold:30},then:[],else:[]}]);
  assert.equal(executeController(code,[{atMs:0,sensors:{A0:{quantity:'lightPercent',value:30}}}]).valid,false);
  assert.equal(executeController(code,[{atMs:1}]).valid,false);assert.equal(executeController(code,[{atMs:0},{atMs:0}]).valid,false);
  assert.equal(executeController(code,[{atMs:0,analog:{A0:1024}}]).valid,false);assert.equal(executeController(code,[{atMs:0,digital:{D2:0.5}}]).valid,false);
  const mode=code.instructions[0];if(mode.op==='mode')mode.mode='OUTPUT';assert.equal(executeController(code,[{atMs:0,sensors:{A0:{quantity:'temperatureC',value:30}}}]).valid,false);
});
test('controller hardware checks accept reordered resistance and equivalent GND headers',()=>{
  const level=getLevel('MCU-04')!,state=correctFixture('MCU-04','a');
  state.wires=[{id:'a',from:{componentId:'uno-board',terminalId:'D13'},to:{componentId:'led-output',terminalId:'anode'}},{id:'b',from:{componentId:'led-output',terminalId:'cathode'},to:{componentId:'led-limit',terminalId:'right'}},{id:'c',from:{componentId:'led-limit',terminalId:'left'},to:{componentId:'uno-board',terminalId:'GND3'}}];state.graph!.components.forEach((part,i)=>part.position={x:i*900,y:-i*500});
  assert.equal(controllerWiring(state,controllerSpec(level,'a')).valid,true);assert.equal(gradeResponse('MCU-04',1,'a',state,0).score,100);
});
test('wrong pins, reverse polarity, power bypass, unsafe resistance and crossed sensor/button signals fail grading',()=>{
  const base=correctFixture('INT-02','a');const mutations:((state:ResponseState)=>void)[]=[
    state=>{state.wires[0].from.terminalId='D8';},state=>{state.wires[1].to.terminalId='cathode';state.wires[2].from.terminalId='anode';},state=>{state.wires[0].from.terminalId='5V';},state=>{state.graph!.components.find(p=>p.kind==='resistor')!.properties.value=10;},state=>{state.wires.push({id:'crossed',from:{componentId:'input-sensor',terminalId:'signal'},to:{componentId:'led-limit',terminalId:'right'}});},state=>{state.wires.push({id:'power',from:{componentId:'input-sensor',terminalId:'vcc'},to:{componentId:'led-output',terminalId:'anode'}});},state=>{state.wires.pop();},
  ];
  for(const mutate of mutations){const state=structuredClone(base);mutate(state);assert.equal(gradeResponse('INT-02',1,'a',state,0).passed,false);}
  const button=correctFixture('MCU-06','a');button.wires.push({id:'bad',from:{componentId:'input-button',terminalId:'left'},to:{componentId:'led-limit',terminalId:'right'}});assert.equal(gradeResponse('MCU-06',1,'a',button,0).passed,false);
});
test('night-lamp and temperature-alarm equality and transitions cannot be bypassed by inverted or missing else branches',()=>{
  for(const id of ['INT-02','INT-03','MCU-06'])for(const variant of ['a','b']){
    const valid=correctFixture(id,variant);assert.equal(gradeResponse(id,1,variant,valid,0).score,100);
    const inverted=structuredClone(valid),condition=inverted.controller!.instructions.find(i=>i.op==='if')!;if(condition.op==='if')condition.condition.operator=id==='INT-03'?'lt':id==='INT-02'?'gte':'gt';assert.equal(gradeResponse(id,1,variant,inverted,0).passed,false);
    const missingElse=structuredClone(valid),branch=missingElse.controller!.instructions.find(i=>i.op==='if')!;if(branch.op==='if')branch.else=[];assert.equal(gradeResponse(id,1,variant,missingElse,0).passed,false);
  }
});
test('blink grading ignores a client-shortened trace and rejects incorrect waits and one-shot execution',()=>{
  const state=correctFixture('MCU-05','a');state.controller!.horizonMs=1;assert.equal(gradeResponse('MCU-05',1,'a',state,0).passed,true);
  state.controller!.repeat=false;assert.equal(gradeResponse('MCU-05',1,'a',state,0).passed,false);state.controller!.repeat=true;
  const wait=state.controller!.instructions.find(i=>i.op==='wait')!;if(wait.op==='wait')wait.ms=1000;assert.equal(gradeResponse('MCU-05',1,'a',state,0).passed,false);
});
test('all Integration foundations are required independently of stars and advanced levels',()=>{
  const passed=['CIR','SEN','MCU'].flatMap(prefix=>Array.from({length:6},(_,i)=>`${prefix}-${String(i+1).padStart(2,'0')}`));
  assert.equal(integrationReady(passed),true);assert.equal(challengeUnlocked('INT-01',true,passed),true);assert.equal(challengeUnlocked('INT-02',true,passed),false);assert.equal(challengeUnlocked('INT-02',true,[...passed,'INT-01']),true);
  for(const missing of passed)assert.equal(challengeUnlocked('INT-01',true,passed.filter(id=>id!==missing)),false);
  assert.equal(challengeUnlocked('INT-01',false,passed),false);assert.equal(challengeUnlocked('MCU-02',true,['MCU-01']),true);assert.equal(challengeUnlocked('MCU-02',true,['CIR-01']),false);
});
test('public controller starters are unfinished, bounded and distinct from private assessment fixtures',()=>{
  for(const level of LEVELS.filter(l=>l.kind==='controller-build'||l.kind==='instruction-order'))for(const variant of level.variants){const state=starterState(level,variant.id);assert.equal(controllerSchema.safeParse(state.controller).success,true);assert.equal(gradeResponse(level.id,1,variant.id,state,0).passed,false);}
});
test('controller sandbox parts and programs require earned capabilities',()=>{
  const state=correctFixture('MCU-04','a');assert.ok(sandboxValidation(state,['CIR-03']));assert.equal(sandboxValidation(state,['CIR-03','MCU-04']),undefined);
  assert.equal(sandboxCapabilities(['MCU-06']).parts.includes('button'),true);assert.equal(sandboxCapabilities(['MCU-07']).parts.includes('light-sensor'),true);assert.equal(sandboxCapabilities(['INT-03']).parts.includes('temperature-sensor'),true);
  const blank={answers:{},wires:[],switchClosed:true,graph:{...state.graph!,components:[]},controller:state.controller};assert.ok(sandboxValidation(blank,[]));
});
test('board terminals support explicit pin IDs and shared ground connections without string splitting',()=>{
  const state=correctFixture('MCU-06','a');state.wires=[];
  assert.deepEqual(connectionFor(state,{componentId:'uno-board',terminalId:'GND2'},{componentId:'input-button',terminalId:'right'}),{from:{componentId:'uno-board',terminalId:'GND2'},to:{componentId:'input-button',terminalId:'right'}});
  state.wires.push({id:'first',from:{componentId:'uno-board',terminalId:'GND2'},to:{componentId:'led-output',terminalId:'cathode'}});assert.notEqual(typeof connectionFor(state,{componentId:'uno-board',terminalId:'GND2'},{componentId:'input-button',terminalId:'right'}),'string');
});
test('independent calibrated-reading programs establish strict lamp and inclusive temperature equality',()=>{
  for(const [source,operator,threshold,pin,output,expected] of [['lightPercent','lt',35,'A0','D9',[255,0,0]],['temperatureC','gte',30,'A0','D8',[0,255,255]]] as const){
    const code=program([{id:'in',op:'mode',pin,mode:'INPUT'},{id:'out',op:'mode',pin:output,mode:'OUTPUT'},{id:'if',op:'if',condition:{source,pin,operator,threshold},then:[{id:'yes',op:'write',pin:output,value:1}],else:[{id:'no',op:'write',pin:output,value:0}]},{id:'wait',op:'wait',ms:50}],true,301);
    const result=executeController(code,[{atMs:0,sensors:{[pin]:{quantity:source,value:threshold-0.01}}},{atMs:113,sensors:{[pin]:{quantity:source,value:threshold}}},{atMs:227,sensors:{[pin]:{quantity:source,value:threshold+0.01}}}]);assert.equal(result.valid,true);for(const [i,time] of [0,163,277].entries())assert.equal(outputAt(result,output,time),expected[i]);
    const id=source==='lightPercent'?'INT-02':'INT-03',state=correctFixture(id,'a');state.controller=code;assert.equal(gradeResponse(id,1,'a',state,0).score,100);
  }
});
test('input aliases refer to the same ADC channel and conflicting alias frame entries fail',()=>{
  const code=program([{id:'in',op:'mode',pin:'SDA',mode:'INPUT'},{id:'out',op:'mode',pin:'D9',mode:'OUTPUT'},{id:'map',op:'map',inputPin:'A4',outputPin:'D9'}]);
  const result=executeController(code,[{atMs:0,analog:{SDA:1023}}]);assert.equal(result.valid,true);assert.equal(outputAt(result,'D9',0),255);
  assert.equal(executeController(code,[{atMs:0,analog:{SDA:1023,A4:0}}]).valid,false);
});
test('nearby but incorrect Integration thresholds fail the mandatory exact rule contract',()=>{
  for(const id of ['INT-02','INT-03'])for(const variant of ['a','b']){
    const state=correctFixture(id,variant),decision=state.controller!.instructions.find(i=>i.op==='if')!;if(decision.op==='if')decision.condition.threshold-=0.005;
    const result=gradeResponse(id,1,variant,state,0);assert.equal(result.passed,false);assert.equal(result.criteria.find(c=>c.id.endsWith('required-configuration'))!.passed,false);
  }
});
test('strobe waveforms that match former blink snapshots fail complete interval grading',()=>{
  const state=correctFixture('MCU-05','a');state.controller=program([{id:'mode',op:'mode',pin:'D13',mode:'OUTPUT'},{id:'on1',op:'write',pin:'D13',value:1},{id:'w1',op:'wait',ms:1},{id:'off1',op:'write',pin:'D13',value:0},{id:'w498',op:'wait',ms:498},{id:'on2',op:'write',pin:'D13',value:1},{id:'w2',op:'wait',ms:1},{id:'off2',op:'write',pin:'D13',value:0},{id:'w500',op:'wait',ms:500}],true,10000);
  const trace=executeController(state.controller,[{atMs:0}]);assert.equal(trace.valid,true);for(const time of [0,499,500,999,1000,1499,1500,1999])assert.equal(outputAt(trace,'D13',time),Math.floor(time/500)%2===0?255:0);
  assert.equal(outputAt(trace,'D13',250),0);assert.equal(gradeResponse('MCU-05',1,'a',state,0).passed,false);assert.equal(checkOutputTimeline(trace,'D13',10000,{kind:'blink',halfPeriodMs:500}).passed,false);
});
test('constant output interruptions and PWM glitches fail even when selected snapshots match',()=>{
  const state=correctFixture('MCU-04','a');state.controller=program([{id:'m',op:'mode',pin:'D13',mode:'OUTPUT'},{id:'on',op:'write',pin:'D13',value:1},{id:'w1',op:'wait',ms:1},{id:'off',op:'write',pin:'D13',value:0},{id:'w98',op:'wait',ms:98},{id:'restore',op:'write',pin:'D13',value:1}],false,10000);
  const trace=executeController(state.controller,[{atMs:0}]);assert.equal(outputAt(trace,'D13',0),255);assert.equal(outputAt(trace,'D13',99),255);assert.equal(gradeResponse('MCU-04',1,'a',state,0).passed,false);
  const pwm=correctFixture('MCU-07','a');pwm.controller!.instructions.push({id:'w1',op:'wait',ms:1},{id:'glitch',op:'pwm',pin:'D9',value:0},{id:'w2',op:'wait',ms:1},{id:'restore',op:'map',inputPin:'A0',outputPin:'D9'});
  const grade=gradeResponse('MCU-07',1,'a',pwm,0);assert.equal(grade.passed,false);assert.ok(grade.criteria.some(c=>c.id.includes('ADC')&&!c.passed));
});
test('a six-point ADC lookup cannot replace the required full-domain mapping instruction',()=>{
  const state=correctFixture('MCU-07','a');state.controller=program([{id:'in',op:'mode',pin:'A0',mode:'INPUT'},{id:'out',op:'mode',pin:'D9',mode:'OUTPUT'},{id:'mid',op:'if',condition:{source:'analog',pin:'A0',operator:'gte',threshold:511},then:[{id:'midwrite',op:'pwm',pin:'D9',value:127}],else:[{id:'lowwrite',op:'pwm',pin:'D9',value:0}]},{id:'near',op:'if',condition:{source:'analog',pin:'A0',operator:'gte',threshold:1022},then:[{id:'nearwrite',op:'pwm',pin:'D9',value:254}],else:[]},{id:'max',op:'if',condition:{source:'analog',pin:'A0',operator:'gte',threshold:1023},then:[{id:'maxwrite',op:'pwm',pin:'D9',value:255}],else:[]}],false,10000);
  for(const [adc,expected] of [[0,0],[1,0],[511,127],[512,127],[1022,254],[1023,255]])assert.equal(outputAt(executeController(state.controller,[{atMs:0,analog:{A0:adc}}]),'D9',0),expected);
  assert.equal(outputAt(executeController(state.controller,[{atMs:0,analog:{A0:128}}]),'D9',0),0);const grade=gradeResponse('MCU-07',1,'a',state,0);assert.equal(grade.passed,false);assert.equal(grade.criteria.find(c=>c.id.endsWith('required-configuration'))!.passed,false);
  for(let adc=0;adc<=1023;adc++)assert.equal(mappedPwm(adc),Number(BigInt(adc)*255n/1023n));
});
