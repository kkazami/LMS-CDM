import { beginGoogle, googleEnabled } from '@/lib/google-auth';
import { mobileGoogleFlowSchema, saveGoogleMobileFlow, googleMobileHeaders } from '@/lib/google-mobile';
import { persistentLimit } from '@/lib/roster/rate-limit';
import { getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    if (new URL(request.url).searchParams.get('status') === '1') return Response.json({ available: googleEnabled() }, { headers: googleMobileHeaders });
    await persistentLimit('google-mobile-start:' + getClientIp(request), 20, 15 * 60000);
    const params = new URL(request.url).searchParams;
    const flow = mobileGoogleFlowSchema.safeParse(Object.fromEntries(params));
    if (!flow.success || params.get('acceptedPolicies') !== 'true') return Response.json({ message: 'Select an institute and accept the policies before continuing with Google.' }, { status: 400, headers: googleMobileHeaders });
    const target = await beginGoogle(flow.data.instituteCode);
    await saveGoogleMobileFlow(flow.data);
    return new Response(null, { status: 303, headers: { ...googleMobileHeaders, Location: target.toString() } });
  } catch { return Response.json({ message: 'Google sign-in is temporarily unavailable.' }, { status: 503, headers: googleMobileHeaders }); }
}
