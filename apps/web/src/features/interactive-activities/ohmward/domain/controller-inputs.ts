import type { ControllerSource } from './types';
export type CalibratedQuantity=Exclude<ControllerSource,'digital'|'analog'>;
export const INPUT_BOUNDS:Record<ControllerSource,readonly [number,number]>={digital:[0,1],analog:[0,1023],lightPercent:[0,100],temperatureC:[-20,80],distanceCm:[2,400],moisturePercent:[0,100]};
export function calibratedQuantity(value:string):value is CalibratedQuantity{return ['lightPercent','temperatureC','distanceCm','moisturePercent'].includes(value);}
