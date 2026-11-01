const assetPattern = /^\/api\/assets\/([a-zA-Z0-9-]{1,100})$/;
export function profilePreferences(value: string): Record<string, unknown> {
  try { const data = JSON.parse(value); return data && typeof data === 'object' && !Array.isArray(data) ? data : {}; } catch { return {}; }
}
export function profileBanner(value: string): string {
  const url = profilePreferences(value).bannerImageUrl;
  return typeof url === 'string' && assetPattern.test(url) ? url : '';
}
export function bannerAssetId(value: unknown): string | null {
  return typeof value === 'string' ? assetPattern.exec(value)?.[1] ?? null : null;
}
