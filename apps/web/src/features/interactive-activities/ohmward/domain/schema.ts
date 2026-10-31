import { z } from 'zod';
import { controllerSchema } from './controller-schema';

const identifier = z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/);
const endpoint = z.strictObject({ componentId: identifier, terminalId: identifier });
export const environmentSchema = z.strictObject({ lightPercent: z.number().finite().min(0).max(100), temperatureC: z.number().finite().min(-20).max(80), distanceCm: z.number().finite().min(2).max(400), motion: z.union([z.literal(0),z.literal(1)]), reflectancePercent: z.number().finite().min(0).max(100), moisturePercent: z.number().finite().min(0).max(100) });
export const graphSchema = z.strictObject({ version: z.literal(1), components: z.array(z.strictObject({ id: identifier, kind: z.enum(['battery','resistor','led','switch','input','output','uno','button','light-sensor','temperature-sensor','ultrasonic-sensor','soil-sensor','pump-driver','pump','AND','OR','NOT','NAND','NOR','XOR','XNOR']), position: z.strictObject({ x: z.number().finite().min(-10000).max(10000), y: z.number().finite().min(-10000).max(10000) }), properties: z.strictObject({ value: z.number().finite().min(0).max(1000000).optional(), channel: z.number().int().min(0).max(3).optional() }) })).max(32), environment: environmentSchema });
export const stateSchema = z.strictObject({
  answers: z.record(identifier, z.string().max(100)).refine(value => Object.keys(value).length <= 32, 'Too many answers.'),
  wires: z.array(z.strictObject({ id: identifier, from: endpoint, to: endpoint })).max(64),
  switchClosed: z.boolean(),
  graph: graphSchema.optional(),
  controller: controllerSchema.optional(),
});
export const saveSchema = z.strictObject({ revision: z.number().int().min(0).max(2147483646), state: stateSchema });
export const hintSchema = z.strictObject({ index: z.number().int().min(0).max(2) });

export const MAX_BODY_BYTES = 128 * 1024;

export class OhmwardError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Bound streamed bytes too; Content-Length is not a trustworthy size limit. */
export async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new OhmwardError(400, 'A JSON body is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new OhmwardError(413, 'Workspace exceeds 128 KiB.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new OhmwardError(400, 'Send valid UTF-8 JSON.'); }
}
