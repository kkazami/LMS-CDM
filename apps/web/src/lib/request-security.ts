function isDevOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2') return true;
    if (host.startsWith('192.168.') || host.startsWith('10.') || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
    if (url.protocol === 'exp:' || url.protocol === 'exps:') return true;
  } catch {
    if (origin.startsWith('exp://') || origin.startsWith('exps://')) return true;
  }
  return false;
}

/** Compare the browser's origin with the actual HTTP host, never forwarded-host. */
export function mutationOriginAllowed(request: Request): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  const url = new URL(request.url);
  const expected = `${url.protocol}//${request.headers.get('host') || url.host}`.toLowerCase();
  const noCookie = !/(?:^|;\s*)lumina_session=/.test(request.headers.get('cookie') || '');
  const bearerOnly = /^Bearer\s+\S+$/i.test(request.headers.get('authorization') || '') && noCookie;
  const configured = (process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  const clientAllowed = (bearerOnly || (noCookie && url.pathname.startsWith('/api/auth/'))) &&
    (configured.includes(origin || '') || (process.env.NODE_ENV !== 'production' && origin ? isDevOrigin(origin) : false));
  if (origin && origin.toLowerCase() !== expected && !clientAllowed) return false;
  if (site && !['same-origin', 'none'].includes(site) && !(origin && clientAllowed)) return false;
  return origin !== 'null';
}
