import { requireActor, resolveInstitute, errorResponse, AccessError } from '@/lib/super-user-v1/actor';
import { changeInstituteAdminStatus } from '@/lib/super-user-v1/institute-admin';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ institute: string; userId: string }> }) {
  try { const actor = await requireActor(request, ['SUPER_USER']); const { institute, userId } = await context.params;
    const text = await request.text(); if (text && (JSON.stringify(JSON.parse(text)) !== '{}')) throw new AccessError(400, 'No status input fields are accepted.');
    return Response.json(await changeInstituteAdminStatus(actor, await resolveInstitute(institute), userId, true), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}