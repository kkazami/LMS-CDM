import { persistentLimit } from '@/lib/roster/rate-limit';
import { AccessError } from '@/lib/super-user-v1/actor';

/** One shared bucket across execution endpoints and serverless instances. */
export async function limitCodeLabRuns(userId: string): Promise<Response | null> {
  try {
    await persistentLimit(`codelab:${userId}`, 30, 5 * 60 * 1000);
    return null;
  } catch (error) {
    if (error instanceof AccessError && error.status === 429) {
      return Response.json({ error: 'Too many server runs. Try again in five minutes.', retryAfterSeconds: 300 },
        { status: 429, headers: { 'Retry-After': '300' } });
    }
    throw error;
  }
}
