import { getSessionFromRequest } from '@/lib/api-auth';
import { mutationOriginAllowed } from '@/lib/request-security';
import { AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';

export async function requireSupportTicketUser(request: Request) {
  if (!mutationOriginAllowed(request)) throw new AccessError(403, 'This request is not allowed.');
  const session = await getSessionFromRequest(request);
  if (!session) throw new AccessError(401, 'Sign in to continue.');
  const role = canonicalRole(session.user.role);
  const { id, instituteId } = session.user;
  if (!instituteId || !['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(role)) {
    throw new AccessError(403, 'Support tickets are unavailable for this account.');
  }
  return { id, instituteId, isAdmin: role === 'ADMIN' };
}

export function supportTicketError(error: unknown, message: string) {
  if (error instanceof AccessError) return Response.json({ message: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return Response.json({ message: 'Check the form and try again.' }, { status: 400 });
  console.error('Support ticket request failed:', error instanceof Error ? error.name : 'Unknown error');
  return Response.json({ message }, { status: 500 });
}
