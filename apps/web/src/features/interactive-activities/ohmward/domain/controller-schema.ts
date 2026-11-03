import { z } from 'zod';
import type { Instruction, ControllerProgram } from './types';
const id=z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/);
function instructionAt(depth:number):z.ZodType<Instruction>{
  const base=[z.strictObject({id,op:z.literal('mode'),pin:id,mode:z.enum(['INPUT','INPUT_PULLUP','OUTPUT'])}),z.strictObject({id,op:z.literal('write'),pin:id,value:z.number().int().min(0).max(1)}),z.strictObject({id,op:z.literal('pwm'),pin:id,value:z.number().int().min(0).max(255)}),z.strictObject({id,op:z.literal('map'),inputPin:id,outputPin:id}),z.strictObject({id,op:z.literal('wait'),ms:z.number().int().min(1).max(10000)})] as const;
  if(depth>=2)return z.discriminatedUnion('op',base);
  return z.discriminatedUnion('op',[...base,z.strictObject({id,op:z.literal('if'),condition:z.strictObject({source:z.enum(['digital','analog','lightPercent','temperatureC','distanceCm','moisturePercent']),pin:id,operator:z.enum(['lt','lte','eq','gte','gt']),threshold:z.number().finite().min(-1000).max(1000000)}),then:z.array(instructionAt(depth+1)).max(32),else:z.array(instructionAt(depth+1)).max(32)})]);
}
export const controllerSchema:z.ZodType<ControllerProgram>=z.strictObject({version:z.literal(1),instructions:z.array(instructionAt(0)).min(1).max(32),repeat:z.boolean(),horizonMs:z.number().int().min(1).max(10000)}).superRefine((program,ctx)=>{
  const pending=[...program.instructions],ids=new Set<string>();let count=0;
  while(pending.length){const instruction=pending.pop()!;count++;if(ids.has(instruction.id))ctx.addIssue({code:'custom',message:'Instruction IDs must be unique.'});ids.add(instruction.id);if(instruction.op==='if')pending.push(...instruction.then,...instruction.else);}
  if(count>32)ctx.addIssue({code:'custom',message:'At most 32 instructions across the whole program.'});
});
