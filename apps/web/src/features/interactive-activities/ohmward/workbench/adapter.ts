import type { Edge, Node } from '@xyflow/react';
import type { Endpoint, GraphComponent, ResponseState } from '../domain/types';
import { endpointKey, terminals } from '../domain/graph';
export function graphToFlow(state:ResponseState):{nodes:Node<{part:GraphComponent}>[];edges:Edge[]} {
  return {nodes:(state.graph?.components??[]).map(part=>({id:part.id,type:'component',position:part.position,data:{part}})),edges:state.wires.map(wire=>({id:wire.id,source:wire.from.componentId,sourceHandle:wire.from.terminalId,target:wire.to.componentId,targetHandle:wire.to.terminalId}))};
}
export function connectionFor(state:ResponseState,first:Endpoint,second:Endpoint):{from:Endpoint;to:Endpoint}|string {
  const parts=state.graph?.components??[];
  const a=parts.find(part=>part.id===first.componentId),b=parts.find(part=>part.id===second.componentId);
  if(!a||!b||a.id===b.id||!terminals(a.kind).includes(first.terminalId)||!terminals(b.kind).includes(second.terminalId))return 'Choose existing terminals on two different components.';
  const electrical=(part:GraphComponent)=>['battery','resistor','led','switch','uno','button','light-sensor','temperature-sensor','ultrasonic-sensor','soil-sensor','pump-driver','pump'].includes(part.kind);
  const controllerNetwork=parts.some(part=>part.kind==='uno');
  if(electrical(a)!==electrical(b))return 'Electrical terminals and abstract Boolean signals use separate models.';
  let from=first,to=second;
  if(!electrical(a)){
    if(from.terminalId!=='out'&&to.terminalId==='out')[from,to]=[to,from];
    if(from.terminalId!=='out'||to.terminalId==='out')return 'Choose an output terminal and an input terminal.';
    if(state.wires.some(wire=>endpointKey(wire.to)===endpointKey(to)))return 'This input already has a driver. Remove its wire before reconnecting.';
  }else if(!controllerNetwork&&state.wires.some(wire=>[wire.from,wire.to].some(end=>endpointKey(end)===endpointKey(from)||endpointKey(end)===endpointKey(to))))return 'This series terminal is already connected. Remove its wire before reconnecting.';
  if(state.wires.some(wire=>endpointKey(wire.from)===endpointKey(from)&&endpointKey(wire.to)===endpointKey(to)||endpointKey(wire.from)===endpointKey(to)&&endpointKey(wire.to)===endpointKey(from)))return 'That connection already exists.';
  return {from,to};
}
