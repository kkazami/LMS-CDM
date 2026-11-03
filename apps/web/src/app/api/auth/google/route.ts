import { NextResponse } from 'next/server';
import { clearGoogleMobile } from '@/lib/google-mobile';
import { beginGoogle } from '@/lib/google-auth';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { mutationOriginAllowed } from '@/lib/request-security';
import { persistentLimit } from '@/lib/roster/rate-limit';
import { getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    if (!mutationOriginAllowed(request)) throw new AccessError(403, 'Forbidden request origin.');
    await persistentLimit('google-start:' + getClientIp(request), 20, 15 * 60 * 1000);
    const form = await request.formData();
    const institute = form.get('instituteCode');
    if (!['ics', 'ite', 'ibe'].includes(String(institute)) || form.get('acceptedPolicies') !== 'true') throw new AccessError(400, 'Select your institute and accept the policies to continue.');
    await clearGoogleMobile();
    return NextResponse.json({ url: (await beginGoogle(institute as 'ics' | 'ite' | 'ibe')).toString() });
  } catch (error) { return accountErrorResponse(error); }
}
