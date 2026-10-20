import { previewImport } from '@/lib/roster/imports';
import { rosterActor, rosterError, boundedJson } from '@/lib/roster/policy';
import { z } from 'zod';
import { AccessError } from '@/lib/super-user-v1/actor';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const actor = await rosterActor(request);
    const body = z.object({ csv: z.string() }).strict().safeParse(await boundedJson(request));
    if (!body.success) throw new AccessError(400, 'Use the six-column student CSV preview flow.');
    return Response.json(await previewImport(actor, { type: 'STUDENTS', csv: body.data.csv }));
  } catch (error) { return rosterError(error); }
}
