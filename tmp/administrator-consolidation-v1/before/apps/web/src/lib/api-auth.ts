import { getSession } from './auth-session';

/** Valid Cookie wins; invalid Cookie permits the same bounded Bearer fallback as pages/actions. */
export async function getSessionFromRequest(request?: Request) {
  return getSession(request);
}
