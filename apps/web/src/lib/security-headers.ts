/**
 * Centralized definition of security headers for Next.js middleware and next.config.ts
 */

export function getSecurityHeaders(): Record<string, string> {
  const isProd = process.env.NODE_ENV === 'production';

  // Content-Security-Policy accommodating Next.js App Router, Tailwind, Monaco Editor, KaTeX, and Three.js
  const cspDirectives = [
    "default-src 'self'",
    // Script sources: Next.js dev requires eval/inline; Monaco loads web workers from blob:
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
    // Style sources: Tailwind CSS and inline styles
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Image sources: data URIs for canvas/avatars, blob URIs for media
    "img-src 'self' data: blob: https:",
    // Font sources: local fonts and Google Fonts
    "font-src 'self' data: https://fonts.gstatic.com",
    // Connect sources: LMS API, OpenAI API if configured, Judge0 service
    "connect-src 'self' https: http://localhost:* ws: wss:",
    // Worker sources for Monaco Editor and PDF.js
    "worker-src 'self' blob:",
    // Prevent clickjacking: no framing allowed
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  const headers: Record<string, string> = {
    'Content-Security-Policy': cspDirectives.join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-DNS-Prefetch-Control': 'on',
  };

  if (isProd) {
    // 2 years HSTS with subdomains and preload
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  }

  return headers;
}
