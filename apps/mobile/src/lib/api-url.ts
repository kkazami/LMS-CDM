export const LIVE_API_URL = 'https://lms-cdm.vercel.app';

export function normalizeApiUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    if (!['', '/', '/api', '/api/'].includes(url.pathname)) return null;
    return url.origin;
  } catch { return null; }
}

export function getHostFromUri(uri?: string | null): string | null {
  if (!uri) return null;
  try { return new URL(uri.includes('://') ? uri : `http://${uri}`).hostname; }
  catch { return null; }
}

export function resolveApiUrl(config: {
  override?: string; development: boolean; platform: string;
  scriptUrl?: string; hostUri?: string | null; webOrigin?: string;
}): string {
  const override = config.override?.trim();
  // A fresh clone uses the hosted backend. Local discovery is an explicit choice.
  if (override !== 'auto') return override ? normalizeApiUrl(override) || LIVE_API_URL : LIVE_API_URL;
  if (!config.development) return LIVE_API_URL;
  const host = getHostFromUri(config.platform === 'web' ? config.webOrigin : config.scriptUrl) || getHostFromUri(config.hostUri);
  if (!host) return LIVE_API_URL;
  if (['localhost', '127.0.0.1', '10.0.2.2', '[::1]'].includes(host)) {
    return `http://${config.platform === 'android' ? '10.0.2.2' : host}:3000`;
  }
  // Metro tunnels expose Metro only, not the Next.js backend on port 3000.
  const octets = host.split('.').map(Number);
  const privateIp = octets.length === 4 && octets.every(n => Number.isInteger(n) && n >= 0 && n <= 255)
    && (octets[0] === 10 || octets[0] === 192 && octets[1] === 168 || octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31);
  return privateIp || host.endsWith('.local') ? `http://${host}:3000` : LIVE_API_URL;
}
