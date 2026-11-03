import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEVELS,getLevel } from '../../apps/web/src/features/interactive-activities/ohmward/curriculum/catalog';
import { correctFixture,gradeResponse } from '../../apps/web/src/features/interactive-activities/ohmward/server/grading';
import { controllerSpec,starterState } from '../../apps/web/src/features/interactive-activities/ohmward/curriculum/controller-starters';
import { executeController,outputAt } from '../../apps/web/src/features/interactive-activities/ohmward/domain/controller';
import { controllerWiring } from '../../apps/web/src/features/interactive-activities/ohmward/domain/controller-wiring';
import { inferredSpec,workspaceFrame,instructionList } from '../../apps/web/src/features/interactive-activities/ohmward/domain/controller-preview';
import { activityWindow,cohortMetrics,type LearnerMetric } from '../../apps/web/src/features/interactive-activities/ohmward/domain/analytics';
import { sandboxValidation } from '../../apps/web/src/features/interactive-activities/ohmward/domain/workspace';
import { stateSchema } from '../../apps/web/src/features/interactive-activities/ohmward/domain/schema';
import type { ControllerProgram,Instruction } from '../../apps/web/src/features/interactive-activities/ohmward/domain/types';

const grade=(id:string,variant:string,state=correctFixture(id,variant))=>gradeResponse(id,1,variant,state,0);
test('parking independent goldens include both equality boundaries and fractional neighbors',()=>{
  for(const [variant,stop,warning] of [['a',20,50],['b',25,60]] as const){
    const state=correctFixture('INT-04',variant),spec=controllerSpec(getLevel('INT-04')!,variant);
    for(const [distance,duty] of [[2,255],[stop-0.01,255],[stop,255],[stop+0.01,127],[warning-0.01,127],[warning,127],[warning+0.01,0],[400,0]]){
      const result=executeController(state.controller,[{atMs:0,sensors:{[spec.inputPin!]:{quantity:'distanceCm',value:distance,triggerPin:spec.triggerPin}}}]);
      assert.equal(result.valid,true,result.message);assert.equal(outputAt(result,spec.outputPin,0),duty);assert.equal(outputAt(result,spec.outputPin,999),duty);
    }
  }
});
test('watering is on below threshold and off at equality, above it, and fully wet',()=>{
  for(const [variant,threshold] of [['a',30],['b',40]] as const){
    const state=correctFixture('INT-06',variant),spec=controllerSpec(getLevel('INT-06')!,variant);
    for(const [moisture,duty] of [[0,255],[threshold-0.01,255],[threshold,0],[threshold+0.01,0],[100,0]]){
      const result=executeController(state.controller,[{atMs:0,sensors:{[spec.inputPin!]:{quantity:'moisturePercent',value:moisture}}}]);
      assert.equal(result.valid,true,result.message);assert.equal(outputAt(result,spec.outputPin,0),duty);
    }
  }
});
test('parking rejects incorrect boundaries, trigger direction, crossed TRIG/ECHO, wrong PWM and shortened traces',()=>{
  for(const variant of ['a','b'])for(const fault of ['equality','threshold','trigger','crossed','pwm','one-shot','slow']){
    const state=correctFixture('INT-04',variant),all=instructionList(state.controller),spec=controllerSpec(getLevel('INT-04')!,variant);
    if(fault==='equality'||fault==='threshold'){const rule=all.find(i=>i.op==='if')!;if(rule.op==='if'){if(fault==='equality')rule.condition.operator='lt';else rule.condition.threshold+=0.001;}}
    if(fault==='trigger'){const mode=all.find(i=>i.op==='mode'&&i.pin===spec.triggerPin)!;if(mode.op==='mode')mode.mode='INPUT';}
    if(fault==='crossed')for(const wire of state.wires)for(const end of [wire.from,wire.to])if(end.componentId==='input-sensor'){if(end.terminalId==='trig')end.terminalId='echo';else if(end.terminalId==='echo')end.terminalId='trig';}
    if(fault==='pwm')for(const item of all)if('pin' in item&&item.pin===spec.outputPin)item.pin='D13';
    if(fault==='one-shot')state.controller!.repeat=false;
    if(fault==='slow')for(const i of all)if(i.op==='wait')i.ms=1000;
    state.controller!.horizonMs=1;assert.equal(grade('INT-04',variant,state).passed,false,fault);
  }
});
test('pump requires driver, isolated load nets, correct input polarity and exact threshold',()=>{
  for(const variant of ['a','b'])for(const fault of ['direct','short','missing-driver','invert','equal','threshold','wrong-input','slow']){
    const state=correctFixture('INT-06',variant),spec=controllerSpec(getLevel('INT-06')!,variant);
    if(fault==='direct'||fault==='short')state.wires.push({id:'unsafe',from:{componentId:'pump-load',terminalId:'positive'},to:{componentId:'uno-board',terminalId:fault==='direct'?spec.outputPin:'5V'}});
    if(fault==='missing-driver')state.graph!.components=state.graph!.components.filter(p=>p.kind!=='pump-driver');
    const rule=instructionList(state.controller).find(i=>i.op==='if')!;
    if(rule.op==='if'){if(fault==='invert')rule.condition.operator='gte';if(fault==='equal')rule.condition.operator='lte';if(fault==='threshold')rule.condition.threshold+=0.001;if(fault==='wrong-input')rule.condition.pin='A5';}
    if(fault==='slow')for(const i of instructionList(state.controller))if(i.op==='wait')i.ms=1000;
    assert.equal(grade('INT-06',variant,state).passed,false,fault);
  }
});
test('new calibrated inputs reject impossible values and ultrasonic reads require trigger output mode',()=>{
  const state=correctFixture('INT-04','a');
  for(const distance of [0,1.99,400.01,Infinity,NaN])assert.equal(executeController(state.controller,[{atMs:0,sensors:{D2:{quantity:'distanceCm',value:distance,triggerPin:'D3'}}}]).valid,false);
  for(const triggerPin of [undefined,'D2','5V'])assert.equal(executeController(state.controller,[{atMs:0,sensors:{D2:{quantity:'distanceCm',value:20,triggerPin}}}]).valid,false);
  const soil=correctFixture('INT-06','a');for(const value of [-0.01,100.01,Infinity])assert.equal(executeController(soil.controller,[{atMs:0,sensors:{A0:{quantity:'moisturePercent',value}}}]).valid,false);
});
test('sandbox earns final hardware and preview uses the saved calibrated environment and driver spec',()=>{
  for(const id of ['INT-04','INT-06'])for(const variant of ['a','b']){
    const state=correctFixture(id,variant);state.graph!.environment.distanceCm=19;state.graph!.environment.moisturePercent=0;
    assert.equal(stateSchema.safeParse(state).success,true);
    assert.ok(sandboxValidation(state,['MCU-04','MCU-07','SEN-04']));
    assert.equal(sandboxValidation(state,['CIR-03','MCU-04','MCU-07','SEN-04','INT-04','INT-06']),undefined);
    const spec=inferredSpec(state);assert.equal(controllerWiring(state,spec).valid,true);
    assert.equal(outputAt(executeController(state.controller,[workspaceFrame(state,spec)]),spec.outputPin,0),255);
    assert.equal(grade(id,variant,starterState(getLevel(id)!,variant)).passed,false);
  }
});
test('failed-layer diagnosis has mandatory driver safety, threshold and measurement criteria',()=>{
  for(const variant of ['a','b'])for(const q of ['q4','q5','q6']){const state=correctFixture('INT-05',variant);state.answers[q]='wrong';const result=grade('INT-05',variant,state);assert.ok(result.score>=80);assert.equal(result.passed,false);}
});
test('independent unscripted watering execution follows changing moisture within 50 ms',()=>{
  const instructions:Instruction[]=[{id:'out',op:'mode',pin:'D8',mode:'OUTPUT'},{id:'in',op:'mode',pin:'A0',mode:'INPUT'},{id:'condition',op:'if',condition:{source:'moisturePercent',pin:'A0',operator:'lt',threshold:30},then:[{id:'on',op:'write',pin:'D8',value:1}],else:[{id:'off',op:'write',pin:'D8',value:0}]},{id:'sample',op:'wait',ms:50}];
  const program:ControllerProgram={version:1,instructions,repeat:true,horizonMs:501};
  const result=executeController(program,[{atMs:0,sensors:{A0:{quantity:'moisturePercent',value:29}}},{atMs:113,sensors:{A0:{quantity:'moisturePercent',value:30}}},{atMs:227,sensors:{A0:{quantity:'moisturePercent',value:0}}}]);
  for(const [time,duty] of [[0,255],[149,255],[150,0],[249,0],[250,255],[500,255]])assert.equal(outputAt(result,'D8',time),duty);
});
test('analytics includes zero-attempt roster, exact denominators, carried first passes and latest failed replay evidence',()=>{
  const window=activityWindow('2026-10-30','2026-10-31');
  const students:LearnerMetric[]=[{id:'complete',started:true,progress:LEVELS.map(l=>({levelId:l.id,firstPassedAt:new Date('2026-10-29T15:00:00Z')}))},{id:'new',started:true,progress:[{levelId:'CIR-01',firstPassedAt:new Date('2026-10-30T16:00:00Z')},{levelId:'CIR-02',firstPassedAt:null}]},{id:'zero',started:false,progress:[]}];
  const latest=[{studentId:'complete',levelId:'CIR-01',result:{criteria:[{concept:'symbols',points:0,possible:10}]}},{studentId:'new',levelId:'CIR-01',result:{criteria:[{concept:'symbols',points:10,possible:10}]}},{studentId:'outsider',levelId:'CIR-01',result:{criteria:[{concept:'symbols',points:100,possible:100}]}}];
  const result=cohortMetrics(students,latest,{attempts:4,students:2,elapsedMs:240000,recentAt:null},[{concept:'symbols',count:2}],window);
  assert.equal(result.roster,3);assert.equal(result.started,2);assert.equal(result.completed,1);assert.equal(result.passed,31);assert.equal(result.completionPercent,31/90*100);
  assert.deepEqual(result.trend,[{date:'2026-10-30',passed:30},{date:'2026-10-31',passed:31}]);
  assert.equal(result.modules[0].percent,9/24*100);assert.equal(result.modules[3].percent,6/18*100);
  assert.equal(result.concepts[0].percent,50);assert.equal(result.concepts[0].assessed,2);assert.equal(result.activity.averageElapsedMs,60000);
});
test('analytics dates use UTC+08 inclusive calendar bounds and reject rollover/reversal/oversized ranges',()=>{
  const window=activityWindow('2024-02-29','2024-02-29');assert.equal(window.start.toISOString(),'2024-02-28T16:00:00.000Z');assert.equal(window.end.toISOString(),'2024-02-29T16:00:00.000Z');
  for(const [from,to] of [['2026-02-29','2026-03-01'],['2026-10-31','2026-10-30'],['2025-01-01','2026-01-02'],['2026-1-01','2026-01-02'],['2101-01-01','2101-01-01']])assert.throws(()=>activityWindow(from,to));
  const result=cohortMetrics([],[],{attempts:0,students:0,elapsedMs:0,recentAt:null},[],window);assert.equal(result.completionPercent,0);assert.equal(result.activity.averageElapsedMs,0);assert.deepEqual(result.concepts,[]);
});
test('analytics excludes unknown levels, duplicate progress and corrupt criterion numbers',()=>{
  const result=cohortMetrics([{id:'s',started:true,progress:[{levelId:'CIR-01',firstPassedAt:new Date('2026-10-30Z')},{levelId:'CIR-01',firstPassedAt:new Date('2026-10-30Z')},{levelId:'foreign',firstPassedAt:new Date()}]}],[{studentId:'s',levelId:'CIR-01',result:{criteria:[{concept:'bad',points:Infinity,possible:1}]}}],{attempts:0,students:0,elapsedMs:0,recentAt:null},[],activityWindow('2026-10-30','2026-10-31'));
  assert.equal(result.passed,1);assert.equal(result.invalidEvidence,1);assert.deepEqual(result.concepts,[]);
});
