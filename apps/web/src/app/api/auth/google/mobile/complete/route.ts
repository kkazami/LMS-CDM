import { getSession } from '@/lib/auth-session';
import { readGoogleMobileFlow, readGoogleMobileReady, clearGoogleMobile, sealGoogleMobile, googleMobileReturn, googleMobileHeaders } from '@/lib/google-mobile';

export async function GET(request: Request) {
  const flow = await readGoogleMobileFlow();
  if (!flow) return Response.json({ message: 'Google sign-in expired. Return to the app and try again.' }, { status: 400, headers: googleMobileHeaders });
  try {
    const session = await getSession(request, { allowUnenrolled: true });
    const ready = await readGoogleMobileReady();
    if (!session || !ready || ready.sessionId !== session.id || ready.state !== flow.state || !session.user.googleSubject || ready.sub !== session.user.googleSubject || session.user.role !== 'STUDENT' || session.user.institute.code !== flow.instituteCode) throw new Error('Invalid mobile sign-in.');
    const ticket = await sealGoogleMobile({ sessionId: session.id, tokenHash: session.tokenHash, sub: ready.sub, challenge: flow.challenge, instituteCode: flow.instituteCode }, 'mobile-exchange');
    await clearGoogleMobile();
    return googleMobileReturn(flow, { ticket });
  } catch {
    await clearGoogleMobile();
    return googleMobileReturn(flow, { error: 'Google sign-in could not be completed. Please try again.' });
  }
}
