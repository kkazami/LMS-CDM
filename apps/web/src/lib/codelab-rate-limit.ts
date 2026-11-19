import { limitAuthenticatedOperation } from '@/lib/authenticated-rate-limits';
import { AccessError } from '@/lib/super-user-v1/actor';

/** One shared bucket across execution endpoints and serverless instances. */
export async function limitCodeLabRuns(userId: string): Promise<Response | null> {
  try {
    await limitAuthenticatedOperation('codeLabRun', userId);
    return null;
  } catch (error) {
    if (error instanceof AccessError && error.status === 429) {
      return Response.json({ error: 'Too many server runs. Try again in five minutes.', retryAfterSeconds: 300 },
        { status: 429, headers: { 'Retry-After': '300' } });
    }
    throw error;
  }
}
