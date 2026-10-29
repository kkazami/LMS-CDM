export const LAB_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const LAB_BUILTIN_IMAGES = ['/images/labs/rj45-t568b.svg', '/images/labs/isolated-lab-network.svg'] as const;
export const labAssetId = (url: string) => /^\/api\/assets\/([a-zA-Z0-9-]{1,100})$/.exec(url)?.[1];

export function youtubeLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === 'youtu.be') id = /^\/([\w-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(?:shorts|embed|live)\/([\w-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
    }
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    const result = new URL('https://www.youtube.com/watch'); result.searchParams.set('v', id);
    const start = url.searchParams.get('t') ?? url.searchParams.get('start');
    if (start) {
      const units = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(start);
      const seconds = /^\d+$/.test(start) ? Number(start) : units && units.slice(1).some(Boolean) ? Number(units[1] || 0) * 3600 + Number(units[2] || 0) * 60 + Number(units[3] || 0) : 0;
      if (seconds > 0 && seconds <= 86400) result.searchParams.set('t', String(seconds));
    }
    return result.toString();
  } catch { return null; }
}

export function publicReferenceLink(value: string): boolean {
  try {
    const url = new URL(value), host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && host.includes('.') &&
      !/^[\d.]+$/.test(host) && !host.includes(':') && !/(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host);
  } catch { return false; }
}

export type LabResource = { type: 'YOUTUBE' | 'IMAGE' | 'LINK'; title: string; url: string; caption?: string };
