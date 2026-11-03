import type { GraphKind, Progress, ResponseState } from './types';
import { DEFAULT_ENVIRONMENT, EMPTY_STATE } from './types';
import { GATES, validateGraph } from './graph';

export const ELECTRICAL_PARTS:GraphKind[]=['battery','resistor','led','switch'];
export const LOGIC_PARTS:GraphKind[]=['input','output',...GATES];
export function emptyWorkspace():ResponseState {return {...EMPTY_STATE,answers:{},wires:[],graph:{version:1,components:[],environment:{...DEFAULT_ENVIRONMENT}}};}
export function sandboxCapabilities(passed:readonly string[]){return {parts:[...(passed.includes('CIR-03')?ELECTRICAL_PARTS:[]),...(passed.includes('CIR-08')?LOGIC_PARTS:[]),...(passed.includes('MCU-04')?['uno'] as GraphKind[]:[]),...(passed.includes('MCU-06')?['button'] as GraphKind[]:[]),...(passed.includes('MCU-07')?['light-sensor'] as GraphKind[]:[]),...(passed.includes('INT-03')?['temperature-sensor'] as GraphKind[]:[]),...(passed.includes('INT-04')?['ultrasonic-sensor'] as GraphKind[]:[]),...(passed.includes('INT-06')?['soil-sensor','pump-driver','pump'] as GraphKind[]:[])],sensors:passed.includes('SEN-04')};}
export function sandboxValidation(state:ResponseState,passed:readonly string[]):string|undefined {
  const check=validateGraph(state);if(check.error)return check.error;
  const allowed=sandboxCapabilities(passed);
  if(check.parts.some(part=>!allowed.parts.includes(part.kind)))return 'Complete the corresponding circuit or logic learning before saving these components.';
  if(state.controller&&!allowed.parts.includes('uno'))return 'Pass MCU-04 before saving controller instructions in the sandbox.';
  if(!allowed.sensors&&Object.entries(DEFAULT_ENVIRONMENT).some(([key,value])=>state.graph!.environment[key as keyof typeof DEFAULT_ENVIRONMENT]!==value))return 'Complete SEN-04 before saving environmental experiments.';
  return undefined;
}
export function progressSummary(progress:readonly Progress[]){
  const completed=progress.filter(row=>row.firstPassedAt).length;
  return {completed,completionPercent:completed/30*100,stars:progress.reduce((sum,row)=>sum+row.bestStars,0),attempts:progress.reduce((sum,row)=>sum+row.submittedCount,0),firstPassXp:completed*50,modules:['CIR','SEN','MCU','INT'].map(prefix=>({prefix,passed:progress.filter(row=>row.levelId.startsWith(prefix+'-')&&row.firstPassedAt).length,total:prefix==='INT'?6:8}))};
}
