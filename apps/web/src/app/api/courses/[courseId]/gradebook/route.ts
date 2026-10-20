import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { getSession } from '@/lib/auth-session';
import { readGradebook } from '@/lib/gradebook-data';
import { AccessError } from '@/lib/super-user-v1/actor';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ courseId: string }> }) {
  const denial = await denyLegacyApi(request, 'GET gradebook');
  if (denial) return denial;
  try {
    const session = await getSession(request);
    if (!session) throw new AccessError(401, 'Not authenticated.');
    return Response.json(await readGradebook(session.user, (await context.params).courseId, Number(new URL(request.url).searchParams.get('page') || 1)), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return Response.json({ message: error instanceof AccessError ? error.message : 'Failed to fetch gradebook.' }, { status: error instanceof AccessError ? error.status : 503 }); }
}