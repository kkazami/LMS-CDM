/**
 * Media Embed and Attachment Preview utilities for ITE portal.
 * Enforces strict security allowlists, URL scheme validation, and transforms
 * approved media links into privacy-friendly embed URLs.
 */

export const ALLOWED_EMBED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
  'drive.google.com',
  'docs.google.com',
]);

const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID_REGEX = /^[0-9]{3,15}$/;

export type EmbedProvider = 'youtube' | 'vimeo' | 'google-drive' | 'google-docs';

export interface MediaEmbedResult {
  ok: true;
  provider: EmbedProvider;
  embedUrl: string;
  originalUrl: string;
  title?: string;
}

export interface MediaEmbedFailure {
  ok: false;
  reason: string;
}

export type ParseEmbedResult = MediaEmbedResult | MediaEmbedFailure;

/**
 * Validates that a string is a safe HTTPS URL and matches our exact host allowlist.
 * Rejects javascript:, data:, file:, http:, credentials, and lookalike domains.
 */
export function validateMediaUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; reason: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { ok: false, reason: 'Empty or invalid URL input.' };
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'Invalid URL format.' };
  }

  // Mandatory HTTPS protocol
  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only secure https:// URLs are allowed for inline embeds.' };
  }

  // Reject embedded credentials (e.g. https://user:pass@example.com)
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'URLs with credentials are prohibited.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Strict allowlist matching (no prefix or suffix wildcards that allow lookalikes)
  if (!ALLOWED_EMBED_HOSTS.has(hostname)) {
    return { ok: false, reason: `Host ${hostname} is not in the allowed embed list.` };
  }

  return { ok: true, url: parsed };
}

/**
 * Parses and converts an allowed external video / doc link into a safe, official embed URL.
 */
export function parseMediaEmbed(rawUrl: string): ParseEmbedResult {
  const validation = validateMediaUrl(rawUrl);
  if (!validation.ok) {
    return validation;
  }

  const { url } = validation;
  const host = url.hostname.toLowerCase();

  // 1. YouTube
  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1]?.split('?')[0] || '';
    if (YOUTUBE_ID_REGEX.test(id)) {
      return {
        ok: true,
        provider: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
        originalUrl: rawUrl,
      };
    }
    return { ok: false, reason: 'Invalid YouTube short video ID.' };
  }

  if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
    const parts = url.pathname.split('/').filter(Boolean);
    let id: string | null = null;

    if (parts[0] === 'watch') {
      id = url.searchParams.get('v');
    } else if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') {
      id = parts[1] ?? null;
    }

    if (id && YOUTUBE_ID_REGEX.test(id)) {
      return {
        ok: true,
        provider: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
        originalUrl: rawUrl,
      };
    }
    return { ok: false, reason: 'Could not extract valid YouTube video ID.' };
  }

  // 2. Vimeo
  if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
    if (host === 'player.vimeo.com') {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'video' && parts[1] && VIMEO_ID_REGEX.test(parts[1])) {
        return {
          ok: true,
          provider: 'vimeo',
          embedUrl: url.toString(),
          originalUrl: rawUrl,
        };
      }
    }

    const segments = url.pathname.split('/').filter(Boolean);
    // Handles formats like /123456789 or /channels/staffpicks/123456789 or /123456789/hash
    let videoId: string | null = null;
    let unlistedHash: string | null = url.searchParams.get('h');

    for (let i = 0; i < segments.length; i++) {
      if (VIMEO_ID_REGEX.test(segments[i])) {
        videoId = segments[i];
        if (!unlistedHash && segments[i + 1] && /^[a-zA-Z0-9]+$/.test(segments[i + 1])) {
          unlistedHash = segments[i + 1];
        }
        break;
      }
    }

    if (videoId) {
      const query = unlistedHash ? `?h=${unlistedHash}` : '';
      return {
        ok: true,
        provider: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${videoId}${query}`,
        originalUrl: rawUrl,
      };
    }

    return { ok: false, reason: 'Could not extract valid Vimeo video ID.' };
  }

  // 3. Google Drive / Docs / Slides / Sheets
  if (host === 'drive.google.com') {
    // Format: /file/d/{id}/view -> /file/d/{id}/preview
    // Or /open?id={id} -> /file/d/{id}/preview
    const openId = url.searchParams.get('id');
    if (openId && /^[A-Za-z0-9_-]{10,}$/.test(openId)) {
      return {
        ok: true,
        provider: 'google-drive',
        embedUrl: `https://drive.google.com/file/d/${openId}/preview`,
        originalUrl: rawUrl,
      };
    }

    const match = url.pathname.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
    if (match && match[1]) {
      return {
        ok: true,
        provider: 'google-drive',
        embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
        originalUrl: rawUrl,
      };
    }

    if (url.pathname.endsWith('/preview')) {
      return {
        ok: true,
        provider: 'google-drive',
        embedUrl: url.toString(),
        originalUrl: rawUrl,
      };
    }

    return { ok: false, reason: 'Unsupported Google Drive URL format for inline preview.' };
  }

  if (host === 'docs.google.com') {
    // Formats:
    // /document/d/{id}/edit -> /document/d/{id}/preview
    // /presentation/d/{id}/edit -> /presentation/d/{id}/preview
    // /spreadsheets/d/{id}/edit -> /spreadsheets/d/{id}/preview
    const docMatch = url.pathname.match(/\/(document|presentation|spreadsheets)\/d\/([A-Za-z0-9_-]+)/);
    if (docMatch && docMatch[1] && docMatch[2]) {
      const docType = docMatch[1];
      const docId = docMatch[2];
      return {
        ok: true,
        provider: 'google-docs',
        embedUrl: `https://docs.google.com/${docType}/d/${docId}/preview`,
        originalUrl: rawUrl,
      };
    }

    if (url.pathname.endsWith('/preview')) {
      return {
        ok: true,
        provider: 'google-docs',
        embedUrl: url.toString(),
        originalUrl: rawUrl,
      };
    }

    return { ok: false, reason: 'Unsupported Google Docs URL format for inline preview.' };
  }

  return { ok: false, reason: 'Unrecognized embed service.' };
}

// Media type categorizations
export type PreviewKind =
  | 'embed'
  | 'video'
  | 'audio'
  | 'image'
  | 'pdf'
  | 'office'
  | 'unsupported_file'
  | 'external_link';

export interface ClassifiedMedia {
  kind: PreviewKind;
  previewUrl: string;
  directUrl: string;
  downloadUrl?: string;
  fileName?: string;
  provider?: EmbedProvider;
  isExternalLink: boolean;
}

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif']);
const OFFICE_EXTENSIONS = new Set(['docx', 'pptx', 'xlsx', 'doc', 'ppt', 'xls']);

export function getFileExtension(filenameOrUrl: string): string {
  try {
    const clean = filenameOrUrl.split('?')[0].split('#')[0];
    const lastDot = clean.lastIndexOf('.');
    if (lastDot === -1) return '';
    return clean.slice(lastDot + 1).toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Inspects an attachment item to determine its media preview classification.
 */
export function classifyAttachmentMedia(attachment: {
  type?: string;
  url: string;
  fileName?: string | null;
}): ClassifiedMedia {
  const url = (attachment.url || '').trim();
  const fileName = (attachment.fileName || '').trim() || undefined;
  const isDeclaredLink = attachment.type === 'LINK';

  // 1. Check if it's an external link
  if (isDeclaredLink || url.startsWith('http://') || url.startsWith('https://')) {
    const embedResult = parseMediaEmbed(url);
    if (embedResult.ok) {
      return {
        kind: 'embed',
        previewUrl: embedResult.embedUrl,
        directUrl: url,
        provider: embedResult.provider,
        fileName: fileName || embedResult.provider.replace('-', ' ').toUpperCase(),
        isExternalLink: false,
      };
    }

    // Non-whitelisted or un-embeddable link -> stays standard external link
    return {
      kind: 'external_link',
      previewUrl: url,
      directUrl: url,
      fileName,
      isExternalLink: true,
    };
  }

  // 2. Uploaded / Local / Data asset
  const ext = getFileExtension(fileName || url);

  // For /api/assets/ URLs, construct the inline preview URL with ?inline=1
  const isApiAsset = url.startsWith('/api/assets/');
  const inlineUrl = isApiAsset
    ? `${url}${url.includes('?') ? '&' : '?'}inline=1`
    : url;

  if (VIDEO_EXTENSIONS.has(ext)) {
    return {
      kind: 'video',
      previewUrl: inlineUrl,
      directUrl: inlineUrl,
      downloadUrl: url,
      fileName,
      isExternalLink: false,
    };
  }

  if (AUDIO_EXTENSIONS.has(ext)) {
    return {
      kind: 'audio',
      previewUrl: inlineUrl,
      directUrl: inlineUrl,
      downloadUrl: url,
      fileName,
      isExternalLink: false,
    };
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    return {
      kind: 'image',
      previewUrl: inlineUrl,
      directUrl: inlineUrl,
      downloadUrl: url,
      fileName,
      isExternalLink: false,
    };
  }

  if (ext === 'pdf') {
    return {
      kind: 'pdf',
      previewUrl: inlineUrl,
      directUrl: inlineUrl,
      downloadUrl: url,
      fileName,
      isExternalLink: false,
    };
  }

  if (OFFICE_EXTENSIONS.has(ext)) {
    return {
      kind: 'office',
      previewUrl: url,
      directUrl: url,
      downloadUrl: url,
      fileName,
      isExternalLink: false,
    };
  }

  return {
    kind: 'unsupported_file',
    previewUrl: url,
    directUrl: url,
    downloadUrl: url,
    fileName,
    isExternalLink: false,
  };
}

/**
 * Strict server-side allowlist of MIME types eligible for Content-Disposition: inline.
 * Script-capable and executable types (e.g. svg, html, xhtml, xml, js) are strictly prohibited.
 */
export const SAFE_INLINE_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/mp4',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
] as const;

const SAFE_INLINE_SET = new Set<string>(SAFE_INLINE_MIME_TYPES);

export function isSafeInlineMime(mime: string | null | undefined): boolean {
  if (!mime || typeof mime !== 'string') return false;
  const normalized = mime.trim().toLowerCase().split(';')[0];
  return SAFE_INLINE_SET.has(normalized);
}

export function buildFileHeaders(
  file: { mime: string; name: string; length?: number },
  inline = false
): Record<string, string> {
  const isSafeInline = inline && isSafeInlineMime(file.mime);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'attachment';

  const headers: Record<string, string> = {
    'Content-Type': file.mime,
    'Content-Disposition': `${isSafeInline ? 'inline' : 'attachment'}; filename="${safeName}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "default-src 'none'; sandbox; frame-ancestors 'self'",
  };

  if (file.length !== undefined) {
    headers['Content-Length'] = String(file.length);
  }

  return headers;
}

/**
 * Returns a human-friendly title for attachments.
 * If fileName exists and differs from url, returns fileName as is.
 * If fileName is empty or identical to the raw URL, extracts a friendly label
 * from the URL (e.g. "Google Drive file", "Google Docs document", "YouTube video", "Vimeo video", or host name).
 */
export function getFriendlyAttachmentTitle(attachment: {
  url: string;
  fileName?: string | null;
}): string {
  const url = (attachment.url || '').trim();
  const rawFileName = (attachment.fileName || '').trim();

  // If a meaningful title is provided that isn't just the raw URL, show it as is
  if (rawFileName && rawFileName !== url) {
    return rawFileName;
  }

  if (!url) {
    return 'Attached file';
  }

  // Handle local / API assets
  if (url.startsWith('/api/assets/') || url.startsWith('/uploads/')) {
    const ext = getFileExtension(rawFileName || url);
    if (ext) return `${ext.toUpperCase()} file`;
    return 'Attached file';
  }

  try {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      parsed = new URL(`https://${url}`);
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.toLowerCase();

    if (!host || (!host.includes('.') && host !== 'localhost')) {
      return 'Attached link';
    }

    if (host === 'drive.google.com') {
      if (pathname.includes('/folders/')) return 'Google Drive folder';
      return 'Google Drive file';
    }

    if (host === 'docs.google.com') {
      if (pathname.includes('/presentation/')) return 'Google Slides presentation';
      if (pathname.includes('/spreadsheets/')) return 'Google Sheets spreadsheet';
      if (pathname.includes('/document/')) return 'Google Docs document';
      if (pathname.includes('/forms/')) return 'Google Forms';
      return 'Google Docs document';
    }

    if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
      return 'YouTube video';
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      return 'Vimeo video';
    }

    // Return the clean hostname (e.g. "example.com", "github.com")
    return host || 'External link';
  } catch {
    // Malformed URL fallback
    return 'Attached link';
  }
}

/**
 * Returns a clean, consistently cased secondary label for attachments
 * ("Google Drive", "YouTube", "Vimeo", "Link", "PDF", "Video", "Audio", "Image", "File").
 */
export function getSecondaryAttachmentLabel(attachment: {
  type?: string;
  url: string;
  fileName?: string | null;
}): string {
  const media = classifyAttachmentMedia(attachment);

  if (media.kind === 'embed') {
    if (media.provider === 'google-drive') return 'Google Drive';
    if (media.provider === 'google-docs') {
      const url = attachment.url.toLowerCase();
      if (url.includes('/presentation/')) return 'Google Slides';
      if (url.includes('/spreadsheets/')) return 'Google Sheets';
      return 'Google Docs';
    }
    if (media.provider === 'youtube') return 'YouTube';
    if (media.provider === 'vimeo') return 'Vimeo';
    return 'Link';
  }

  if (media.kind === 'pdf') return 'PDF';
  if (media.kind === 'video') return 'Video';
  if (media.kind === 'audio') return 'Audio';
  if (media.kind === 'image') return 'Image';
  if (media.kind === 'office') return 'File';
  if (media.kind === 'external_link') return 'Link';

  return 'File';
}


