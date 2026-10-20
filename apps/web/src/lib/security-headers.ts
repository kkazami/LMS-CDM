/**
 * Centralized definition of security headers for Next.js middleware and next.config.ts
 */

export function getSecurityHeaders(): Record<string, string> {
  const isProd = process.env.NODE_ENV === 'production';

  // Content-Security-Policy accommodating Next.js App Router, Tailwind, Monaco Editor, KaTeX, and Three.js
  const cspDirectives = [
    "default-src 'self'",
    // Script sources: Next.js dev requires eval/inline; Monaco loads web workers from blob: and CDN
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net https://unpkg.com",
    // Style sources: Tailwind CSS, inline styles, Google Fonts, and Monaco Editor CSS
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    // Image sources: data URIs for canvas/avatars, blob URIs for media
    "img-src 'self' data: blob: https:",
    // Font sources: local fonts, Google Fonts, and Monaco Editor codicons
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
    // Connect sources: LMS API, OpenAI API if configured, Judge0 service
    "connect-src 'self' https: http://localhost:* ws: wss:",
    // Practicum: uploaded demo videos (Vercel Blob)
    "media-src 'self' blob: https:",
    // Worker sources for Monaco Editor and PDF.js
    "worker-src 'self' blob: https://cdn.jsdelivr.net https://unpkg.com",
    // Frame sources: document viewer (YouTube, Office Online embeds) and Practicum's
    // privacy-friendly YouTube embeds. A CSP directive may appear only once (browsers ignore repeats).
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://view.officeapps.live.com blob:",
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
