import { getSessionFromRequest } from '@/lib/api-auth';
import { enrollWithClassCode } from '@/lib/student-enrollment';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { mutationOriginAllowed } from '@/lib/request-security';
import { persistentLimit } from '@/lib/roster/rate-limit';
import { boundedJson } from '@/lib/roster/policy';

export async function POST(request: Request) {
  try {
    if (!mutationOriginAllowed(request)) throw new AccessError(403, 'Forbidden request origin.');
    const session = await getSessionFromRequest(request, { allowUnenrolled: true });
    if (!session) throw new AccessError(401, 'Sign in to join a class.');
    await persistentLimit('join-class:' + session.userId, 10, 15 * 60 * 1000);
    const body = await boundedJson(request, 2048) as { code?: unknown };
    if (typeof body?.code !== 'string') throw new AccessError(400, 'Enter your class code.');
    return Response.json({ ...await enrollWithClassCode(session, body.code), message: 'Class joined.' });
  } catch (error) { return accountErrorResponse(error); }
}
