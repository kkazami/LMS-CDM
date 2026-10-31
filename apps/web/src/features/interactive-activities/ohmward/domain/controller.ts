import type { ControllerCondition, ControllerProgram, Instruction, PinMode } from './types';
import { controllerSchema } from './controller-schema';
import { canonicalPin, unoPin } from './uno';
import { INPUT_BOUNDS, calibratedQuantity, type CalibratedQuantity } from './controller-inputs';

export type ControllerFrame = { atMs:number; digital?:Record<string,number>; analog?:Record<string,number>; sensors?:Record<string,{quantity:CalibratedQuantity;value:number;triggerPin?:string}> };
export type TraceEvent = { instructionId:string; op:Instruction['op']; timeMs:number; outputs:Record<string,number>; pin?:string; value?:number };
export type ControllerResult = { valid:boolean; message:string; trace:TraceEvent[]; steps:number; elapsedMs:number };
export function compareInput(value:number,condition:ControllerCondition):boolean {
  switch(condition.operator){case 'lt':return value<condition.threshold;case 'lte':return value<=condition.threshold;case 'eq':return value===condition.threshold;case 'gte':return value>=condition.threshold;case 'gt':return value>condition.threshold;}
}
export function mappedPwm(adc:number):number {if(!Number.isInteger(adc)||adc<0||adc>1023)throw Error('ADC input must be an integer 0–1023.');return Math.floor(adc*255/1023);}
export function executeController(input:unknown,frames:readonly ControllerFrame[]):ControllerResult {
  const parsed=controllerSchema.safeParse(input),trace:TraceEvent[]=[];let time=0,steps=0;
  const fail=(message:string):ControllerResult=>({valid:false,message,trace,steps,elapsedMs:time});
  if(!parsed.success)return fail('Use 1–32 unique typed instructions, nesting at most two, positive waits and a virtual horizon of at most 10000 ms.');
  const program:ControllerProgram=parsed.data;
  if(!frames.length||frames.length>32||frames[0].atMs!==0||frames.some((frame,i)=>!Number.isInteger(frame.atMs)||frame.atMs<0||frame.atMs>10000||i>0&&frame.atMs<=frames[i-1].atMs))return fail('Input frames must start at 0 ms, be strictly ordered and fit the ten-second horizon (at most 32 frames).');
  for(const frame of frames){
    for(const values of [frame.digital,frame.analog,frame.sensors])if(values&&new Set(Object.keys(values).map(canonicalPin)).size!==Object.keys(values).length)return fail('A frame cannot assign different channels to duplicate aliases of one physical pin.');
    if(Object.keys(frame.digital??{}).length>4||Object.keys(frame.analog??{}).length>6||Object.keys(frame.sensors??{}).length>6)return fail('Too many input channels in a test frame.');
    for(const [pin,value] of Object.entries(frame.digital??{}))if(!unoPin(pin)?.digital||!Number.isInteger(value)||value<0||value>1)return fail('Digital input frame values must be 0 or 1 on supported GPIO.');
    for(const [pin,value] of Object.entries(frame.analog??{}))if(!unoPin(pin)?.analog||!Number.isInteger(value)||value<0||value>1023)return fail('Analog input frame values must be integers 0–1023 on analog-capable pins.');
    for(const [pin,reading] of Object.entries(frame.sensors??{})){if(!calibratedQuantity(reading.quantity))return fail('Unsupported calibrated quantity.');const bounds=INPUT_BOUNDS[reading.quantity];if(!(reading.quantity==='distanceCm'?unoPin(pin)?.digital:unoPin(pin)?.analog)||!Number.isFinite(reading.value)||reading.value<bounds[0]||reading.value>bounds[1]||reading.quantity==='distanceCm'&&(!reading.triggerPin||!unoPin(reading.triggerPin)?.digital||canonicalPin(reading.triggerPin)===canonicalPin(pin)))return fail('Calibrated sensor input is outside its supported pin/range or lacks distinct trigger/echo pins.');}
  }
  const pending=[...program.instructions];
  while(pending.length){const instruction=pending.pop()!;
    if(instruction.op==='if'){
      const {condition}=instruction,pin=unoPin(condition.pin),bounds=INPUT_BOUNDS[condition.source];
      if(!pin||(['digital','distanceCm'].includes(condition.source)?!pin.digital:!pin.analog)||condition.threshold<bounds[0]||condition.threshold>bounds[1])return fail('A condition uses an unsupported input pin or threshold range.');
      pending.push(...instruction.then,...instruction.else);
    }else if(instruction.op==='map'){
      if(!unoPin(instruction.inputPin)?.analog||!unoPin(instruction.outputPin)?.pwm)return fail('ADC-to-PWM mapping requires an analog-capable input and a PWM-capable output.');
    }else if(instruction.op!=='wait'){
      if(!unoPin(instruction.pin)?.digital)return fail('Only supported GPIO can use mode or output instructions.');
      if(instruction.op==='pwm'&&!unoPin(instruction.pin)?.pwm)return fail('This Uno R3 pin does not support PWM.');
    }
  }
  const modes:Record<string,PinMode>={},outputs:Record<string,number>={};
  function frame(){return [...frames].reverse().find(frame=>frame.atMs<=time)!;}
  function sample<T>(values:Record<string,T>|undefined,pin:string):T|undefined{return values?Object.entries(values).find(([key])=>canonicalPin(key)===pin)?.[1]:undefined;}
  function read(source:ControllerCondition['source'],pinId:string):number {
    const pin=canonicalPin(pinId),mode=modes[pin];
    if(source==='digital'){
      if(mode!=='INPUT'&&mode!=='INPUT_PULLUP')throw Error('Configure digital inputs before reading them.');
      const value=sample(frame().digital,pin);if(value===undefined)throw Error('No digital input is connected to the requested pin.');return value;
    }
    if(mode!=='INPUT')throw Error('Use INPUT mode for analog and calibrated sensor readings.');
    if(source==='analog'){const value=sample(frame().analog,pin);if(value===undefined)throw Error('No ADC sample is connected to the requested pin.');return value;}
    const reading=sample(frame().sensors,pin);if(!reading||reading.quantity!==source)throw Error('The requested calibrated sensor is not connected to that input.');
    if(source==='distanceCm'&&(!reading.triggerPin||modes[canonicalPin(reading.triggerPin)]!=='OUTPUT'))throw Error('Configure the ultrasonic trigger pin as OUTPUT and the echo pin as INPUT. A complete ideal trigger/echo measurement is abstracted by each read.');
    return reading.value;
  }
  function emit(instruction:Instruction,pin?:string,value?:number){trace.push({instructionId:instruction.id,op:instruction.op,timeMs:time,outputs:{...outputs},...(pin?{pin}:{}),...(value!==undefined?{value}:{})});}
  function block(instructions:Instruction[]):void {
    for(const instruction of instructions){
      if(time>=program.horizonMs)return;
      if(steps>=1000)throw Error('The program reached the 1000-step limit for this test case. Add a positive wait or simplify the loop.');
      steps++;
      if(instruction.op==='wait'){time=Math.min(program.horizonMs,time+instruction.ms);emit(instruction);continue;}
      if(instruction.op==='if'){const value=read(instruction.condition.source,instruction.condition.pin);emit(instruction,canonicalPin(instruction.condition.pin),value);block(compareInput(value,instruction.condition)?instruction.then:instruction.else);continue;}
      if(instruction.op==='mode'){const pin=canonicalPin(instruction.pin);modes[pin]=instruction.mode;if(instruction.mode!=='OUTPUT')delete outputs[pin];emit(instruction,pin);continue;}
      const pin=canonicalPin(instruction.op==='map'?instruction.outputPin:instruction.pin);
      if(modes[pin]!=='OUTPUT')throw Error('Set OUTPUT mode on the actual driven pin before writing it.');
      const value=instruction.op==='map'?mappedPwm(read('analog',instruction.inputPin)):instruction.op==='write'?instruction.value*255:instruction.value;
      outputs[pin]=value;emit(instruction,pin,value);
    }
  }
  try{do{block(program.instructions);}while(program.repeat&&time<program.horizonMs);}
  catch(error){return fail(error instanceof Error?error.message:'The bounded controller could not run.');}
  return {valid:true,message:`Completed ${steps} typed steps over ${time} ms of virtual time.`,trace,steps,elapsedMs:time};
}
export function outputAt(result:ControllerResult,pin:string,timeMs:number):number {
  const event=[...result.trace].reverse().find(event=>event.timeMs<=timeMs);return event?.outputs[canonicalPin(pin)]??0;
}
