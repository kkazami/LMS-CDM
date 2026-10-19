import { requireActor, resolveInstitute, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { oversight } from '@/lib/super-user-v1/oversight';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ institute: string; courseId?: string }> }) {
  try { const actor = await requireActor(request, ['SUPER_USER']); const { institute, courseId } = await context.params;
    return Response.json(await oversight(actor, await resolveInstitute(institute), courseId), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accountErrorResponse(error); }
}