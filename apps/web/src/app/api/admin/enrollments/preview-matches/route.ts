import { z } from "zod";
import { previewMatches } from "@/lib/roster/imports";
import { rosterActor, rosterError, boundedJson } from "@/lib/roster/policy";
import { AccessError } from "@/lib/super-user-v1/actor";
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const actor = await rosterActor(request);
    const input = z
      .object({ termId: z.string().min(1) })
      .strict()
      .safeParse(await boundedJson(request, 8192));
    if (!input.success) throw new AccessError(400, "Choose a term.");
    return Response.json(await previewMatches(actor, input.data.termId));
  } catch (error) {
    return rosterError(error);
  }
}
