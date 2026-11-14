/** Attach credentials only to this portal's private assets, never remote photos. */
export function courseCoverSource(value: string | null | undefined, base: string, token: string | null) {
  if (!value) return null;
  if (/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(value)) return { uri: value };
  try {
    const url = new URL(value, base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    const privateAsset = url.origin === new URL(base).origin && url.pathname.startsWith('/api/assets/');
    return { uri: url.href, ...(privateAsset && token ? { headers: { Authorization: `Bearer ${token}` } } : {}) };
  } catch { return null; }
}

/** Croppers can omit the original filename or retain a pre-conversion name. */
export function courseCoverUploadFile(photo: { uri: string; mimeType?: string | null }) {
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  const uriType = /\.(png|webp|gif|jpe?g)(?:[?#]|$)/i.exec(photo.uri)?.[1].toLowerCase();
  const mimeType = photo.mimeType?.toLowerCase() || (uriType ? `image/${uriType === 'jpg' ? 'jpeg' : uriType}` : 'image/jpeg');
  const extension = extensions[mimeType];
  if (!extension) throw new Error('Choose a JPEG, PNG, WebP, or GIF image.');
  return { fileName: `class-cover.${extension}`, mimeType };
}
