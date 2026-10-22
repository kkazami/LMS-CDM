import { NextResponse, type NextRequest } from 'next/server';
import { getSecurityHeaders } from '@/lib/security-headers';
import { getCorsHeaders } from '@/lib/cors';
import { mutationOriginAllowed } from '@/lib/request-security';
import { sessionActivity } from '@/lib/session-policy';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const api = pathname.startsWith('/api/');
  if (!api && (pathname.startsWith('/_next') || /\.(ico|png|jpg|jpeg|svg|css|js|woff2?|ttf|eot|webp|json|map|txt|xml)$/i.test(pathname))) return NextResponse.next();
  const nonce = btoa(crypto.randomUUID());
  const security = getSecurityHeaders(nonce);
  const incoming = new Headers(request.headers);
  incoming.set('x-nonce', nonce);
  incoming.set('Content-Security-Policy', security['Content-Security-Policy']);
  incoming.set('x-lms-session-touch', sessionActivity(pathname, request.method, request.headers.get('x-lms-user-active') === '1') ? '1' : '0');
  let response: NextResponse;
  if (!mutationOriginAllowed(request)) {
    response = NextResponse.json({ error: 'Forbidden request origin.' }, { status: 403 });
  } else {
    const publicPage = ['/', '/login', '/register', '/activate', '/forgot-password', '/reset-password', '/terms', '/privacy', '/support'].includes(pathname);
    response = !api && !publicPage && !request.cookies.get('lumina_session')?.value
      ? NextResponse.redirect(new URL(`/login?institute=${encodeURIComponent(pathname.split('/').filter(Boolean)[0] || 'ics')}`, request.url))
      : NextResponse.next({ request: { headers: incoming } });
  }
  for (const [key, value] of Object.entries({ ...security, ...getCorsHeaders(request) })) response.headers.set(key, value);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'] };
