/** Compare the browser's origin with the actual HTTP host, never forwarded-host. */
export function mutationOriginAllowed(request: Request): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  const url = new URL(request.url);
  const expected = `${url.protocol}//${request.headers.get('host') || url.host}`.toLowerCase();
  const bearerOnly = /^Bearer\s+\S+$/i.test(request.headers.get('authorization') || '') &&
    !/(?:^|;\s*)lumina_session=/.test(request.headers.get('cookie') || '');
  const configured = (process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (origin && origin.toLowerCase() !== expected && !(bearerOnly && configured.includes(origin))) return false;
  if (site && !['same-origin', 'none'].includes(site) && !(bearerOnly && origin && configured.includes(origin))) return false;
  return origin !== 'null';
}
