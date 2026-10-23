import { getSession } from '@/lib/auth-session';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { readPrivateUpload } from '@/lib/private-upload';
import { fileResponse } from '@/lib/academic-structure/assets';
import { AccessError } from '@/lib/super-user-v1/actor';

export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ assetId: string }> }) {
  const denial = await denyLegacyApi(request, 'GET assets/route.ts');
  if (denial) return denial;
  try {
    const session = await getSession(request);
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { assetId } = await context.params;
    const { searchParams } = new URL(request.url);
    const inline = searchParams.get('inline') === '1' || searchParams.get('inline') === 'true';
    return fileResponse(await readPrivateUpload(session.user, assetId), inline);
  } catch (error) {
    return Response.json({ error: error instanceof AccessError ? error.message : 'File unavailable.' }, { status: error instanceof AccessError ? error.status : 503 });
  }
}
