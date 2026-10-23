import { NextResponse } from 'next/server';

/**
 * Resolves the configured list of allowed origins.
 * Wildcard '*' is strictly forbidden when credentials are enabled.
 */
export function getAllowedOrigins(): string[] {
  const configured = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (process.env.NEXT_PUBLIC_APP_URL) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL.trim();
    if (!configured.includes(appUrl)) {
      configured.push(appUrl);
    }
  }

  return configured;
}

/**
 * Checks whether an origin is a local dev, Metro/Expo, or private LAN origin.
 * Strictly disabled in production.
 */
export function isDevOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  try {
    const url = new URL(origin);
    const host = url.hostname;
    // Allow localhost and loopback on any port (Metro 8081, dev servers, etc.)
    if (host === 'localhost' || host === '127.0.0.1') {
      return true;
    }
    // Android emulator loopback alias
    if (host === '10.0.2.2') {
      return true;
    }
    // Standard RFC 1918 private LAN ranges
    if (
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return true;
    }
    // Expo Go custom schemes
    if (url.protocol === 'exp:' || url.protocol === 'exps:') {
      return true;
    }
  } catch {
    if (origin.startsWith('exp://') || origin.startsWith('exps://')) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether an origin is allowed for CORS.
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  if (process.env.NODE_ENV !== 'production' && isDevOrigin(origin)) {
    return true;
  }
  return false;
}

/**
 * Returns appropriate CORS headers for a given request.
 * If origin is in the allowlist, reflects that specific origin with credentials allowed.
 * If origin is not in allowlist or missing, returns safe default headers without credentials.
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();

  const isAllowed = isOriginAllowed(origin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Client-Type, X-CSRF-Token, X-Requested-With, Accept',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };

  if (isAllowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else if (!origin && allowedOrigins.length > 0) {
    // Non-browser / same-origin request without Origin header
    headers['Access-Control-Allow-Origin'] = allowedOrigins[0];
  }

  return headers;
}

/**
 * Handles CORS preflight OPTIONS requests.
 * Returns a 204 No Content response with headers if method is OPTIONS, otherwise null.
 */
export function handleCorsPreflight(request: Request): NextResponse | null {
  if (request.method.toUpperCase() === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }
  return null;
}
