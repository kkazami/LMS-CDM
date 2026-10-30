import { getSession } from '@/lib/auth-session';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { boundedUploadBody, savePrivateUpload, withUploadSlot } from '@/lib/private-upload';
import { persistentLimit } from '@/lib/roster/rate-limit';
import { AccessError } from '@/lib/super-user-v1/actor';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function POST(request: Request) {
  const denial = await denyLegacyApi(request, 'POST upload/route.ts');
  if (denial) return denial;
  try {
    const session = await getSession(request);
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    await persistentLimit(`upload:${session.user.id}`, 20, 60000);
    return await withUploadSlot(async () => {
      const data = await boundedUploadBody(request, undefined, 240000);
      const file = data.get('file');
      if (!(file instanceof File)) throw new AccessError(400, 'No file provided.');
      return Response.json(await savePrivateUpload(session.user, file), { headers: { 'Cache-Control': 'private, no-store' } });
    });
  } catch (error) {
    return Response.json({ error: error instanceof AccessError ? error.message : 'Upload failed. Try again later.' }, { status: error instanceof AccessError ? error.status : 503 });
  }
}
