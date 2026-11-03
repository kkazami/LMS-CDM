import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateElectrical, evaluateLogic, gateValue } from '../../apps/web/src/features/interactive-activities/ohmward/domain/graph';
import { sensorReadings, ultrasonicDistance, changeEnvironment } from '../../apps/web/src/features/interactive-activities/ohmward/domain/sensors';
import { DEFAULT_ENVIRONMENT, type ResponseState, type GraphComponent } from '../../apps/web/src/features/interactive-activities/ohmward/domain/types';
import { stateSchema } from '../../apps/web/src/features/interactive-activities/ohmward/domain/schema';
import { gradeResponse, correctFixture } from '../../apps/web/src/features/interactive-activities/ohmward/server/grading';
import { emptyWorkspace, sandboxValidation, sandboxCapabilities, progressSummary } from '../../apps/web/src/features/interactive-activities/ohmward/domain/workspace';
import { graphToFlow, connectionFor } from '../../apps/web/src/features/interactive-activities/ohmward/workbench/adapter';

test('independent resistor-only goldens verify series/parallel units in both variants',()=>{
  for(const [variant,answers] of [['a',{q1:'300',q2:'66.6667',q3:'20',q4:'90'}],['b',{q1:'440',q2:'110',q3:'13.6364',q4:'54.5455'}]] as const){assert.equal(gradeResponse('CIR-05',1,variant,{answers,wires:[],switchClosed:true},0).score,100);}
});
test('LED resistance subtracts forward drop, accepts only a permitted standard and target current',()=>{
  for(const [variant,answers] of [['a',{q1:'300',q2:'1',q3:'9.0909'}],['b',{q1:'700',q2:'1',q3:'9.3333'}]] as const){const state={answers:{...answers},wires:[],switchClosed:true};assert.equal(gradeResponse('CIR-07',1,variant,state,0).score,100);state.answers.q2='0';assert.equal(gradeResponse('CIR-07',1,variant,state,0).passed,false);}
  const state=correctFixture('CIR-07','a');state.answers.q1='500';assert.equal(gradeResponse('CIR-07',1,'a',state,0).passed,false);
  for(const value of ['',' ','Infinity','NaN','300ohms','0x12c']){state.answers.q1=value;assert.equal(gradeResponse('CIR-07',1,'a',state,0).passed,false);}
});
test('electrical graph handles hyphenated IDs, reversed wires and positions independently',()=>{
  const state=correctFixture('CIR-04','a');state.graph!.components.forEach((part,i)=>part.position={x:i*300,y:-i*30});state.wires.forEach(wire=>[wire.from,wire.to]=[wire.to,wire.from]);
  const result=evaluateElectrical(state);assert.equal(result.valid,true);assert.ok(Math.abs(result.currentMilliamps-9.090909)<0.00001);assert.equal(gradeResponse('CIR-04',1,'a',state,0).score,100);
  state.switchClosed=false;assert.equal(evaluateElectrical(state).currentMilliamps,0);
});
test('safety rejects supply shorts, bypass, missing resistance, opens, polarity and unsupported branches',()=>{
  const base=correctFixture('CIR-04','a');const mutations:((s:ResponseState)=>void)[]=[
    s=>s.wires.push({id:'short',from:{componentId:'battery-main',terminalId:'positive'},to:{componentId:'battery-main',terminalId:'negative'}}),
    s=>s.wires.push({id:'bypass',from:{componentId:'resistor-main',terminalId:'left'},to:{componentId:'resistor-main',terminalId:'right'}}),
    s=>{s.graph!.components.find(p=>p.kind==='resistor')!.properties.value=0;},
    s=>{s.wires.pop();},
    s=>{s.wires[1].to.terminalId='cathode';s.wires[2].from.terminalId='anode';},
    s=>{s.graph!.components.find(p=>p.kind==='resistor')!.properties.value=10;},
    s=>{s.wires[0].to.terminalId='unknown';},
  ];
  for(const mutate of mutations){const state=structuredClone(base);mutate(state);assert.equal(evaluateElectrical(state).valid,false);assert.equal(gradeResponse('CIR-04',1,'a',state,0).passed,false);}
  const short=structuredClone(base);mutations[0](short);assert.match(evaluateElectrical(short).message,/supply short/i);
  const spoof=structuredClone(base);spoof.graph!.components.find(p=>p.kind==='battery')!.properties.value=4;assert.equal(gradeResponse('CIR-04',1,'a',spoof,0).passed,false);
});
const truth:Record<string,boolean[]>={AND:[false,false,false,true],OR:[false,true,true,true],NOT:[true,true,false,false],NAND:[true,true,true,false],NOR:[true,false,false,false],XOR:[false,true,true,false],XNOR:[true,false,false,true]};
for(const [gate,expected] of Object.entries(truth))test(`${gate} gate matches independent four-row truth table`,()=>{
  for(let mask=0;mask<4;mask++)assert.equal(gateValue(gate as GraphComponent['kind'],Boolean(mask&2),Boolean(mask&1)),expected[mask]);
  const state=correctFixture('CIR-08','a');state.graph!.components.find(p=>p.id==='gate-main')!.kind=gate as GraphComponent['kind'];if(gate==='NOT')state.wires.splice(1,1);
  const result=evaluateLogic(state);assert.equal(result.valid,true);assert.deepEqual(result.rows.map(row=>row.outputs[0]),expected);
});
test('an equivalent four-NAND XOR implementation passes every grading case',()=>{
  const state=correctFixture('CIR-08','a');state.graph!.components=state.graph!.components.filter(p=>p.id!=='gate-main');for(const id of ['n1','n2','n3','n4'])state.graph!.components.push({id,kind:'NAND',position:{x:200,y:200},properties:{}});
  const edges=[['in-a','n1','a'],['in-b','n1','b'],['in-a','n2','a'],['n1','n2','b'],['in-b','n3','a'],['n1','n3','b'],['n2','n4','a'],['n3','n4','b'],['n4','out-main','in']];
  state.wires=edges.map(([a,b,pin],i)=>({id:`w${i}`,from:{componentId:a,terminalId:'out'},to:{componentId:b,terminalId:pin}}));assert.equal(gradeResponse('CIR-08',1,'a',state,0).score,100);
});
test('logic rejects missing inputs, stale endpoints, duplicate drivers, extra inputs and hidden cycles',()=>{
  const mutations:((s:ResponseState)=>void)[]=[s=>{s.wires.pop();},s=>{s.wires[0].from.componentId='deleted';},s=>{s.wires.push({id:'conflict',from:{componentId:'in-b',terminalId:'out'},to:{componentId:'gate-main',terminalId:'a'}});},s=>{s.graph!.components.push({id:'extra',kind:'input',position:{x:0,y:0},properties:{channel:2}});},s=>{s.graph!.components.push({id:'cycle1',kind:'NOT',position:{x:0,y:0},properties:{}},{id:'cycle2',kind:'NOT',position:{x:0,y:0},properties:{}});s.wires.push({id:'c1',from:{componentId:'cycle1',terminalId:'out'},to:{componentId:'cycle2',terminalId:'a'}},{id:'c2',from:{componentId:'cycle2',terminalId:'out'},to:{componentId:'cycle1',terminalId:'a'}});}];
  for(const mutate of mutations){const state=correctFixture('CIR-08','a');mutate(state);assert.equal(gradeResponse('CIR-08',1,'a',state,0).passed,false);}
});
test('graph and payload validation enforce finite positions, IDs and 32/64 bounds',()=>{
  const state=correctFixture('CIR-08','a');state.graph!.components[0].position.x=Infinity;assert.equal(stateSchema.safeParse(state).success,false);
  state.graph!.components[0].position.x=0;state.graph!.components.push({...state.graph!.components[0]});assert.equal(evaluateLogic(state).valid,false);
  state.graph!.components=Array.from({length:33},(_,i)=>({id:`c${i}`,kind:'NOT',position:{x:0,y:0},properties:{}}));assert.equal(stateSchema.safeParse(state).success,false);
  const manyWires=correctFixture('CIR-08','a');manyWires.wires=Array.from({length:65},(_,i)=>({...manyWires.wires[0],id:`w${i}`}));assert.equal(stateSchema.safeParse(manyWires).success,false);
});
test('four Boolean inputs and four outputs enumerate exactly sixteen combinations',()=>{
  const state=emptyWorkspace();for(let i=0;i<4;i++){state.graph!.components.push({id:`i${i}`,kind:'input',position:{x:0,y:0},properties:{channel:i}},{id:`o${i}`,kind:'output',position:{x:200,y:0},properties:{channel:i}});state.wires.push({id:`w${i}`,from:{componentId:`i${i}`,terminalId:'out'},to:{componentId:`o${i}`,terminalId:'in'}});}
  const result=evaluateLogic(state);assert.equal(result.valid,true);assert.equal(result.rows.length,16);for(const row of result.rows)assert.deepEqual(row.inputs,row.outputs);
});
test('sensor numerical goldens verify units, quantization and exact comparator boundaries',()=>{
  const result=sensorReadings({...DEFAULT_ENVIRONMENT,lightPercent:20,temperatureC:30,distanceCm:100,motion:1,reflectancePercent:50,moisturePercent:60});
  assert.equal(result.light.value,205);assert.equal(result.soil.value,614);assert.equal(result.temperature.value,0.8);assert.ok(Math.abs(result.ultrasonic.value-5830.903790)<0.00001);assert.equal(result.pir.value,1);assert.equal(result.ir.value,1);
  assert.equal(sensorReadings({...DEFAULT_ENVIRONMENT,reflectancePercent:49}).ir.value,0);assert.equal(ultrasonicDistance(1000),17.15);assert.equal(ultrasonicDistance(2000),34.3);assert.throws(()=>ultrasonicDistance(NaN));assert.throws(()=>sensorReadings({...DEFAULT_ENVIRONMENT,lightPercent:101}));
});
test('sensor calculations pass independent goldens and require equality semantics and controlled setup',()=>{
  const observation=emptyWorkspace();observation.graph!.environment={lightPercent:20,temperatureC:30,distanceCm:100,motion:1,reflectancePercent:50,moisturePercent:60};observation.answers={q1:'205',q2:'0.8',q3:'5830.9',q4:'1',q5:'1',q6:'614'};assert.equal(gradeResponse('SEN-04',1,'a',observation,0).score,100);observation.graph!.environment.reflectancePercent=49;assert.equal(gradeResponse('SEN-04',1,'a',observation,0).passed,false);
  for(const [variant,answers] of [['a',{q1:'767',q2:'0.9',q3:'11661.8076',q4:'256'}],['b',{q1:'256',q2:'0.7',q3:'2915.4519',q4:'767'}]] as const)assert.equal(gradeResponse('SEN-06',1,variant,{answers,wires:[],switchClosed:true},0).score,100);
  const thresholds={answers:{q1:'17.15',q2:'1',q3:'1',q4:'1'},wires:[],switchClosed:true};assert.equal(gradeResponse('SEN-07',1,'a',thresholds,0).score,100);thresholds.answers.q2='0';assert.equal(gradeResponse('SEN-07',1,'a',thresholds,0).passed,false);
});
test('sandbox capabilities derive from passes and create no assessment result',()=>{
  const state=correctFixture('CIR-04','a');assert.ok(sandboxValidation(state,[]));assert.equal(sandboxValidation(state,['CIR-03']),undefined);assert.deepEqual(sandboxCapabilities([]),{parts:[],sensors:false});
  const logic=correctFixture('CIR-08','a');assert.ok(sandboxValidation(logic,['CIR-03']));assert.equal(sandboxValidation(logic,['CIR-08']),undefined);
  const sensor=emptyWorkspace();sensor.graph!.environment.moisturePercent=2;assert.ok(sandboxValidation(sensor,['CIR-03']));assert.equal(sandboxValidation(sensor,['SEN-04']),undefined);assert.equal('score' in sensor,false);
  const summary=progressSummary([{levelId:'CIR-01',bestScore:100,bestStars:3,firstPassedAt:'2026-10-31',submittedCount:5}]);assert.equal(summary.completed,1);assert.equal(summary.firstPassXp,50);assert.equal(summary.completionPercent,100/30);assert.equal(summary.modules[1].passed,0);
});
test('editor adapter keeps explicit endpoints and normalizes target-first logic connections',()=>{
  const state=correctFixture('CIR-08','a'),view=graphToFlow(state);
  assert.equal(view.nodes[0].id,'in-a');assert.equal(view.edges[0].source,'in-a');assert.equal(view.edges[0].targetHandle,'a');
  state.wires=[];
  assert.deepEqual(connectionFor(state,{componentId:'gate-main',terminalId:'a'},{componentId:'in-a',terminalId:'out'}),{from:{componentId:'in-a',terminalId:'out'},to:{componentId:'gate-main',terminalId:'a'}});
  assert.equal(typeof connectionFor(state,{componentId:'in-a',terminalId:'out'},{componentId:'in-b',terminalId:'out'}),'string');
  const circuit=correctFixture('CIR-04','a');assert.equal(typeof connectionFor(circuit,circuit.wires[0].from,circuit.wires[0].to),'string');
});
test('mandatory safety/threshold criteria reject otherwise passing knowledge scores',()=>{
  for(const [id,question] of [['CIR-06','q3'],['CIR-06','q4'],['SEN-08','q1'],['SEN-08','q6'],['SEN-07','q3']]){
    const state=correctFixture(id,'a');state.answers[question]=state.answers[question]==='0'?'1':'0';const result=gradeResponse(id,1,'a',state,0);assert.equal(result.passed,false);assert.ok(result.criteria.some(c=>c.mandatory&&!c.passed));
  }
});
test('environment editing rejects fractional motion before rendering and preserves the valid draft',()=>{
  for(const invalid of [0.5,NaN,Infinity,-1,2]){const result=changeEnvironment(DEFAULT_ENVIRONMENT,'motion',invalid);assert.ok(result.error);assert.equal(result.environment,DEFAULT_ENVIRONMENT);assert.doesNotThrow(()=>sensorReadings(result.environment));}
  const motion=changeEnvironment(DEFAULT_ENVIRONMENT,'motion',1);assert.equal(motion.error,undefined);assert.equal(sensorReadings(motion.environment).pir.value,1);
  const tooBright=changeEnvironment(DEFAULT_ENVIRONMENT,'lightPercent',101);assert.ok(tooBright.error);assert.equal(tooBright.environment.lightPercent,50);
});
test('zero or missing ultrasonic echo is invalid instead of a zero-distance measurement',()=>{
  for(const duration of [0,-1,NaN,Infinity,25001])assert.throws(()=>ultrasonicDistance(duration));
  assert.equal(ultrasonicDistance(1000),17.15);assert.ok(Math.abs(ultrasonicDistance(25000)-428.75)<1e-9);
});
