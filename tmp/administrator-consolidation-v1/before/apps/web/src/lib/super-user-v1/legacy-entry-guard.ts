import { getSession } from '@/lib/auth-session';
import { getSessionFromRequest } from '@/lib/api-auth';
import { canonicalRole } from './capabilities';
import { AccessError } from './actor';
const legacy = (role: unknown) => ['ADMIN','INSTRUCTOR','STUDENT'].includes(canonicalRole(role));
/** Dedicated roles never inherit legacy authority through permission strings. */
export async function denyLegacyApi(request: Request, _operation: string): Promise<Response | null> {
  const session = await getSessionFromRequest(request);
  if (!session || legacy(session.user.role)) return null;
  return Response.json({error:{code:'FORBIDDEN',message:'Forbidden.'}},{status:403});
}
export async function requireLegacyActor(_operation: string) {
  const session=await getSession();
  if(!session) throw new AccessError(401,'Authentication required.');
  if(!legacy(session.user.role)) throw new AccessError(403,'Forbidden.');
  return session.user;
}
