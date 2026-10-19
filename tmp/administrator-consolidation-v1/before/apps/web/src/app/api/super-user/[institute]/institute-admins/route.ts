import { requireActor, resolveInstitute, errorResponse } from '@/lib/super-user-v1/actor';
import { listInstituteAdmins, createInstituteAdmin } from '@/lib/super-user-v1/institute-admin';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ institute: string }> };
export async function GET(request: Request, context: Context) {
  try { const actor = await requireActor(request, ['SUPER_USER']); const { institute } = await context.params;
    return Response.json(await listInstituteAdmins(actor, await resolveInstitute(institute)), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  try { const actor = await requireActor(request, ['SUPER_USER']); const { institute } = await context.params;
    return Response.json(await createInstituteAdmin(actor, await resolveInstitute(institute), await request.json()), { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}