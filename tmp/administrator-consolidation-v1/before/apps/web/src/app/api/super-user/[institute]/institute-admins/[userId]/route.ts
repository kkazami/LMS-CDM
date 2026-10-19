import { requireActor, resolveInstitute, errorResponse } from '@/lib/super-user-v1/actor';
import { detailInstituteAdmin } from '@/lib/super-user-v1/institute-admin';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ institute: string; userId: string }> }) {
  try { const actor = await requireActor(request, ['SUPER_USER']); const { institute, userId } = await context.params;
    return Response.json(await detailInstituteAdmin(actor, await resolveInstitute(institute), userId), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}