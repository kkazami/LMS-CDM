import type { Environment, SensorKind } from './types';
import { environmentSchema } from './schema';
export const SENSOR_MODULES:{id:SensorKind;name:string;quantity:string;format:string;model:string}[]=[
  {id:'light',name:'Light module',quantity:'Light level',format:'Analog voltage sampled by an ADC',model:'Normalized 0–100% brightness maps to 0–5 V and 0–1023 ADC counts; not an LDR resistance curve.'},
  {id:'temperature',name:'TMP36 temperature sensor',quantity:'Temperature',format:'Analog voltage',model:'Ideal V = 0.5 + 0.01 × temperature in °C. Ignores tolerance and ADC quantization.'},
  {id:'ultrasonic',name:'Ultrasonic module',quantity:'Distance',format:'Digital pulse duration',model:'Echo = 2 × distance / 0.0343 cm/µs; sound speed fixed at 343 m/s. Distance is continuous although the interface is a timed digital pulse.'},
  {id:'pir',name:'PIR module',quantity:'Changes in infrared radiation associated with motion',format:'Digital HIGH/LOW',model:'Immediate motion flag, without physical warm-up, hold time or field-of-view effects. Does not measure distance.'},
  {id:'ir',name:'IR reflectance module',quantity:'Reflected infrared light',format:'Digital comparator HIGH/LOW',model:'Educational active-HIGH comparator: HIGH at reflectance ≥50%. Real module polarity/thresholds vary; surface and geometry affect reflection.'},
  {id:'soil',name:'Soil-moisture module',quantity:'Relative soil moisture',format:'Normalized analog reading',model:'Calibrated educational 0–100% moisture maps to 0–1023 counts; raw probes may have the opposite polarity and need calibration.'},
];
export function ultrasonicDistance(echoMicroseconds:number):number {
  if(!Number.isFinite(echoMicroseconds)||echoMicroseconds<=0||echoMicroseconds>25000)throw Error('A missing/zero echo is invalid data. Valid duration is above 0 and at most 25000 µs.');
  return echoMicroseconds*0.0343/2;
}
export function changeEnvironment(current:Environment,key:keyof Environment,value:number):{environment:Environment;error?:string} {
  const parsed=environmentSchema.safeParse({...current,[key]:value});
  if(!parsed.success)return {environment:current,error:key==='motion'?'Motion must be exactly 0 (absent) or 1 (detected).':'Enter a finite value within the displayed environmental range.'};
  return {environment:parsed.data};
}
export function sensorReadings(input:Environment){
  const e=environmentSchema.parse(input);
  return {light:{value:Math.round(e.lightPercent/100*1023),unit:'ADC counts',volts:e.lightPercent/20},temperature:{value:0.5+e.temperatureC*0.01,unit:'V'},ultrasonic:{value:2*e.distanceCm/0.0343,unit:'µs echo'},pir:{value:e.motion,unit:'logic (0/1)'},ir:{value:e.reflectancePercent>=50?1:0,unit:'logic (0/1)'},soil:{value:Math.round(e.moisturePercent/100*1023),unit:'ADC counts'}};
}
