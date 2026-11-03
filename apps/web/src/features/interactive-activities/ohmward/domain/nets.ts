import type { CircuitWire, Endpoint, GraphComponent } from './types';
import { endpointKey } from './graph';
import { UNO_PINS } from './uno';
/** Undirected ideal-wire nets; callers validate component/terminal bounds first. */
export function wireNets(parts:GraphComponent[],wires:CircuitWire[]){
  const parents=new Map<string,string>();
  const root=(key:string):string=>{let cursor=key;while(parents.has(cursor)&&parents.get(cursor)!==cursor)cursor=parents.get(cursor)!;return cursor;};
  const join=(a:Endpoint,b:Endpoint)=>parents.set(root(endpointKey(a)),root(endpointKey(b)));
  const end=(componentId:string,terminalId:string):Endpoint=>({componentId,terminalId});
  for(const board of parts.filter(part=>part.kind==='uno'))for(const pin of UNO_PINS)if(pin.alias)join(end(board.id,pin.id),end(board.id,pin.alias==='GND'?'GND1':pin.alias));
  for(const wire of wires)join(wire.from,wire.to);
  return {end,eq:(a:Endpoint,b:Endpoint)=>root(endpointKey(a))===root(endpointKey(b))};
}
