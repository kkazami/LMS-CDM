import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Extract institute code from URL if possible. e.g. /ics/courses -> institute = ics
  const pathname = request.nextUrl.pathname;
  
  // Exclude static files, _next, api routes
  if (
    pathname.match(/\.(.*)$/) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // The cookie is 'lumina_session'
  const sessionId = request.cookies.get("lumina_session")?.value;

  // Dashboard routes are anything besides /login, /register, or the root /
  // Let's assume all /something/something... are dashboard routes (e.g. /[institute]/...)
  // Except for specific public routes.
  const isPublicRoute = pathname === "/" || pathname === "/login" || pathname === "/register";

  if (!isPublicRoute && !sessionId) {
    // If we're on a non-public route without a session, we redirect to login
    // Try to extract the institute safely for the redirect
    const segments = pathname.split('/').filter(Boolean);
    const possibleInstitute = segments[0] || "ics"; // default to ics if none
    
    const loginUrl = new URL(`/login?institute=${possibleInstitute}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Let Next.js handle it
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
