export function resolveDesktopWebUrl(configured: string | undefined, development: boolean): string {
  const fallback = development ? 'http://localhost:3000' : 'https://lms-cdm.vercel.app';
  let url: URL;
  try { url = new URL(configured?.trim() || fallback); }
  catch { throw new Error('LMS_WEB_URL must be a valid server origin.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)
    || !(url.protocol === 'https:' || development && local && url.protocol === 'http:')) {
    throw new Error('LMS_WEB_URL must be an HTTPS server origin, or localhost HTTP during development.');
  }
  return url.origin;
}
