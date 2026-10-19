import { requireActor, resolveInstitute, errorResponse } from '@/lib/super-user-v1/actor';
import { detailInstituteAdmin, updateInstituteAdmin } from '@/lib/super-user-v1/institute-admin';
import { checkRateLimit, createRateLimitResponse, RATE_LIMIT_CONFIG } from '@/lib/rate-limit';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ institute: string; userId: string }> }) {
  try { const actor = await requireActor(request, ['SUPER_USER']); const { institute, userId } = await context.params;
    return Response.json(await detailInstituteAdmin(actor, await resolveInstitute(institute), userId), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ institute: string; userId: string }> }) {
  try {
    const actor = await requireActor(request, ['SUPER_USER']);
    const limit = await checkRateLimit(`super-user-admin-edit:${actor.id}`, RATE_LIMIT_CONFIG.passwordReset);
    if (!limit.allowed) return createRateLimitResponse(limit);
    const { institute, userId } = await context.params;
    return Response.json(await updateInstituteAdmin(actor, await resolveInstitute(institute), userId, await request.json()), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
