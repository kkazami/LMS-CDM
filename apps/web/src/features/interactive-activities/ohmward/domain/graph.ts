import type { Endpoint, GraphComponent, GraphKind, ResponseState } from './types';
import { stateSchema } from './schema';
import { UNO_PINS } from './uno';

export const GATES = ['AND','OR','NOT','NAND','NOR','XOR','XNOR'] as const;
export function terminals(kind: GraphKind): string[] {
  if(kind==='uno')return UNO_PINS.map(pin=>pin.id);
  if(kind==='ultrasonic-sensor')return ['vcc','ground','trig','echo'];
  if(kind==='pump-driver')return ['vcc','ground','control','load-positive','load-negative'];
  if(kind==='pump')return ['positive','negative'];
  if(kind==='button')return ['left','right'];
  if(kind==='light-sensor'||kind==='temperature-sensor'||kind==='soil-sensor')return ['vcc','ground','signal'];
  if (kind === 'battery') return ['positive','negative'];
  if (kind === 'led') return ['anode','cathode'];
  if (kind === 'resistor' || kind === 'switch') return ['left','right'];
  if (kind === 'input') return ['out'];
  if (kind === 'output') return ['in'];
  return kind === 'NOT' ? ['a','out'] : ['a','b','out'];
}
export const endpointKey = (end: Endpoint) => JSON.stringify([end.componentId,end.terminalId]);
export function validateGraph(input: unknown): { state: ResponseState; parts: GraphComponent[]; error?: string } {
  const parsed=stateSchema.safeParse(input);
  if (!parsed.success || !parsed.data.graph) return { state: {answers:{},wires:[],switchClosed:true}, parts:[], error:'Use a bounded version 1 workbench with finite positions and valid properties.' };
  const state=parsed.data, parts=state.graph!.components, ids=new Set(parts.map(part=>part.id));
  if (ids.size!==parts.length) return {state,parts,error:'Component IDs must be unique.'};
  if (new Set(state.wires.map(wire=>wire.id)).size!==state.wires.length) return {state,parts,error:'Wire IDs must be unique.'};
  const links=new Set<string>();
  for (const wire of state.wires) {
    for(const end of [wire.from,wire.to]) { const part=parts.find(item=>item.id===end.componentId); if(!part || !terminals(part.kind).includes(end.terminalId)) return {state,parts,error:'A wire references a missing component or unsupported terminal.'}; }
    const pair=[endpointKey(wire.from),endpointKey(wire.to)].sort().join('|');
    if (links.has(pair)) return {state,parts,error:'Remove duplicate wires.'};
    if(wire.from.componentId===wire.to.componentId)return {state,parts,error:parts.find(part=>part.id===wire.from.componentId)!.kind==='battery'?'Supply short: remove the direct wire between battery terminals.':'Bypass: do not directly join a component to its own terminal.'};
    links.add(pair);
  }
  return {state,parts};
}
export type ElectricalResult = { valid: boolean; closed: boolean; currentMilliamps: number; resistanceOhms: number; message: string };
export function evaluateElectrical(input: unknown): ElectricalResult {
  const {state,parts,error}=validateGraph(input);
  const fail=(message:string):ElectricalResult=>({valid:false,closed:false,currentMilliamps:0,resistanceOhms:0,message});
  if(error) return fail(error);
  if(parts.some(part=>!['battery','resistor','led','switch'].includes(part.kind)) || parts.filter(part=>part.kind==='battery').length!==1 || parts.filter(part=>part.kind==='led').length!==1) return fail('Supported electrical model: one battery, one LED, series resistors and optional switches. Other networks are unsupported.');
  const supply=parts.find(part=>part.kind==='battery')!, led=parts.find(part=>part.kind==='led')!;
  if(!supply.properties.value || supply.properties.value>12 || !led.properties.value || led.properties.value>5) return fail('Use a supply above 0 and at most 12 V, and an LED drop above 0 and at most 5 V.');
  const adjacent=new Map<string,Endpoint[]>();
  const add=(a:Endpoint,b:Endpoint)=>adjacent.set(endpointKey(a),[...(adjacent.get(endpointKey(a))??[]),b]);
  for(const wire of state.wires){add(wire.from,wire.to);add(wire.to,wire.from);}
  // Detect an ideal wire/closed-switch supply short before rejecting branches.
  const reachable=new Set<string>(), pending:Endpoint[]=[{componentId:supply.id,terminalId:'positive'}];
  while(pending.length){const pin=pending.pop()!,key=endpointKey(pin);if(reachable.has(key))continue;reachable.add(key);pending.push(...(adjacent.get(key)??[]));const part=parts.find(item=>item.id===pin.componentId)!;if(part.kind==='switch'&&state.switchClosed)pending.push({componentId:part.id,terminalId:pin.terminalId==='left'?'right':'left'});}
  if(reachable.has(endpointKey({componentId:supply.id,terminalId:'negative'})))return fail('Supply short: an ideal wire or closed switch directly connects the battery terminals.');
  for(const part of parts) for(const pin of terminals(part.kind)) {
    const count=adjacent.get(endpointKey({componentId:part.id,terminalId:pin}))?.length??0;
    if(count===0)return fail('Open connection: every terminal in this series model needs one wire.');
    if(count>1)return fail('A branch or bypass is unsupported. Use one protected series loop; never bridge the resistor.');
  }
  let cursor:Endpoint={componentId:supply.id,terminalId:'positive'}, resistance=0, closed=true;
  const visited=new Set<string>();
  for(let step=0;step<=parts.length;step++){
    const next=adjacent.get(endpointKey(cursor))![0];
    if(next.componentId===supply.id){if(next.terminalId!=='negative'||visited.size!==parts.length-1)return fail('The path must include every component and return to battery negative.');
      if(resistance<=0)return fail('Missing protection: put a positive resistance in series with the LED.');
      const current=closed?Math.max(0,(supply.properties.value!-led.properties.value!)/resistance*1000):0;
      if(current>20)return fail('Unsafe LED current exceeds 20 mA. Increase the series resistance.');
      return {valid:true,closed,currentMilliamps:current,resistanceOhms:resistance,message:closed?`Protected loop: ${current.toFixed(2)} mA using a fixed LED drop.`:'The open switch interrupts current: 0 mA.'};}
    if(visited.has(next.componentId))return fail('A disconnected loop or cycle is unsupported.');
    visited.add(next.componentId);const part=parts.find(item=>item.id===next.componentId)!;
    if(part.kind==='led'&&next.terminalId!=='anode')return fail('Reverse LED polarity: conventional current must enter the anode.');
    if(part.kind==='resistor'){if(!part.properties.value)return fail('A protection resistor must have positive resistance.');resistance+=part.properties.value;}
    if(part.kind==='switch'&&!state.switchClosed)closed=false;
    cursor={componentId:part.id,terminalId:terminals(part.kind).find(pin=>pin!==next.terminalId)!};
  }
  return fail('The network did not form a supported series loop.');
}
export function gateValue(kind: GraphKind,a:boolean,b=false):boolean {
  switch(kind){case 'AND':return a&&b;case 'OR':return a||b;case 'NOT':return !a;case 'NAND':return !(a&&b);case 'NOR':return !(a||b);case 'XOR':return a!==b;case 'XNOR':return a===b;default:throw Error('Unsupported logic gate.');}
}
export function evaluateLogic(input:unknown):{valid:boolean;message:string;rows:{inputs:boolean[];outputs:boolean[]}[]} {
  const {state,parts,error}=validateGraph(input);const fail=(message:string)=>({valid:false,message,rows:[]});
  if(error)return fail(error);
  if(parts.some(part=>!['input','output',...GATES].includes(part.kind as 'input')))return fail('Logic circuits support Boolean inputs, gates and outputs only.');
  const inputs=parts.filter(part=>part.kind==='input').sort((a,b)=>(a.properties.channel??-1)-(b.properties.channel??-1));
  const outputs=parts.filter(part=>part.kind==='output').sort((a,b)=>(a.properties.channel??-1)-(b.properties.channel??-1));
  if(!inputs.length||inputs.length>4||!outputs.length||outputs.length>4||[inputs,outputs].some(group=>group.some((part,i)=>part.properties.channel!==i)))return fail('Use one to four inputs and outputs, with unique consecutive channels starting at 0.');
  const drivers=new Map<string,GraphComponent>();
  for(const wire of state.wires){const source=parts.find(part=>part.id===wire.from.componentId)!;const sink=parts.find(part=>part.id===wire.to.componentId)!;
    if(wire.from.terminalId!=='out'||source.kind==='output'||wire.to.terminalId==='out'||sink.kind==='input')return fail('Connect an output terminal to an input terminal.');
    const key=endpointKey(wire.to);if(drivers.has(key))return fail('Driver conflict: each input terminal accepts only one source.');drivers.set(key,source);
  }
  for(const part of parts)for(const pin of terminals(part.kind).filter(pin=>pin!=='out'))if(!drivers.has(endpointKey({componentId:part.id,terminalId:pin})))return fail('Missing input: connect every gate input and output indicator.');
  const rows:{inputs:boolean[];outputs:boolean[]}[]=[];
  for(let mask=0;mask<2**inputs.length;mask++){
    const values=inputs.map((_,i)=>Boolean(mask&(1<<(inputs.length-1-i)))), memo=new Map<string,boolean>(),active=new Set<string>();let cycle=false;
    function read(part:GraphComponent):boolean {
      if(memo.has(part.id))return memo.get(part.id)!;
      if(active.has(part.id)){cycle=true;return false;}active.add(part.id);
      const from=(pin:string)=>read(drivers.get(endpointKey({componentId:part.id,terminalId:pin}))!);
      const value=part.kind==='input'?values[part.properties.channel!]:part.kind==='output'?from('in'):gateValue(part.kind,from('a'),part.kind==='NOT'?false:from('b'));
      active.delete(part.id);memo.set(part.id,value);return value;
    }
    // Check unused gates too; a hidden cyclic subgraph must not bypass validation.
    parts.forEach(read);if(cycle)return fail('Combinational logic cannot contain a cycle.');
    rows.push({inputs:values,outputs:outputs.map(read)});
  }
  return {valid:true,message:'Every input combination evaluated deterministically.',rows};
}
