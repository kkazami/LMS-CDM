import { getSessionFromRequest } from '@/lib/api-auth';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { AccessError, assertMutationOrigin, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { moderateCodeLab } from '@/lib/codelab-moderation';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const denial = await denyLegacyApi(request, 'POST codelab/instructor/reject/route.ts');
    if (denial) return denial;
    const session = await getSessionFromRequest(request);
    if (!session) throw new AccessError(401, 'Not authenticated.');
    assertMutationOrigin(request);
    const result = await moderateCodeLab(session.user, await request.json());
    revalidatePath('/ics/activities/codelab/instructor');
    return Response.json(result);
  } catch (error) { return accountErrorResponse(error); }
}
