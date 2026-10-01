import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSecurityHeaders } from "@/lib/security-headers";
import { getCorsHeaders } from "@/lib/cors";

// Known static file extensions to safely skip page-level redirects
const STATIC_EXTENSION_REGEX = /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot|webp|json|map|txt|xml|mp4|webm|mp3|wav)$/i;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const securityHeaders = getSecurityHeaders();
  const corsHeaders = getCorsHeaders(request);

  // Exclude static assets and _next internals
  if (
    STATIC_EXTENSION_REGEX.test(pathname) ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  // Handle API routes: apply security and CORS headers, then pass to API route handlers
  if (pathname.startsWith("/api")) {
    const response = NextResponse.next();
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Session token presence check (web cookie)
  const token = request.cookies.get("lumina_session")?.value;

  // Public routes allowlist (no session needed)
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password";

  if (!isPublicRoute && !token) {
    // Extract institute slug dynamically from path (e.g., /ics/courses -> ics)
    const segments = pathname.split("/").filter(Boolean);
    const possibleInstitute = segments[0] || "ics";

    const loginUrl = new URL(`/login?institute=${encodeURIComponent(possibleInstitute)}`, request.url);
    const redirectResponse = NextResponse.redirect(loginUrl);

    for (const [key, value] of Object.entries(securityHeaders)) {
      redirectResponse.headers.set(key, value);
    }
    return redirectResponse;
  }

  // Standard response with security headers
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
