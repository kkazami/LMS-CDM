import { correctPendingEmail } from "@/lib/roster/activation";
import { rosterActor, rosterError, boundedJson } from "@/lib/roster/policy";
export const dynamic = 'force-dynamic';
export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const actor = await rosterActor(request, { requireStudentIds: false }),
      { userId } = await context.params;
    return Response.json(
      await correctPendingEmail(
        actor,
        userId,
        await boundedJson(request, 8192),
      ),
    );
  } catch (error) {
    return rosterError(error);
  }
}
