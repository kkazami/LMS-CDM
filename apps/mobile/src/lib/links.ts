export type LinkKind = 'youtube' | 'drive' | 'docs' | 'link' | 'file';

export interface SanitizedUrlResult {
  isValid: boolean;
  url: string;
  domain: string;
  kind: LinkKind;
  reason?: string;
}

/**
 * Forbidden URL schemes that must be strictly rejected for security.
 */
const FORBIDDEN_SCHEMES = new Set([
  'javascript',
  'data',
  'file',
  'intent',
  'tel',
  'sms',
  'mailto',
  'blob',
  'about',
  'vbscript',
  'content',
  'chrome',
  'resource',
]);

/**
 * Pure URL safety helper.
 * - Trims leading/trailing whitespace and zero-width/control characters
 * - Strictly allows ONLY http: and https: protocols
 * - Rejects any scheme containing whitespace, newlines, tabs, or control characters
 * - Adds https:// to scheme-less web domains (for Attachment.url values)
 * - Rejects javascript:, data:, file:, intent:, tel:, mailto:, etc.
 */
export function sanitizeUrl(rawUrl: string | null | undefined): SanitizedUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isValid: false,
      url: '',
      domain: '',
      kind: 'link',
      reason: 'Empty or invalid URL',
    };
  }

  // Trim leading/trailing whitespace, zero-width spaces, and control characters
  const trimmed = rawUrl.replace(/^[\s\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]+|[\s\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]+$/g, '');
  if (trimmed.length === 0) {
    return {
      isValid: false,
      url: '',
      domain: '',
      kind: 'link',
      reason: 'Empty URL',
    };
  }

  let candidate = trimmed;

  // Check if this is a scheme-less domain with a port (e.g. example.com:8080/path, localhost:3000)
  const domainWithPortPattern = /^(?:localhost|([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}):\d+(\/.*)?$/i;
  if (domainWithPortPattern.test(trimmed)) {
    candidate = `https://${trimmed}`;
  } else {
    // Detect if an explicit scheme delimiter is present
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex !== -1) {
      const rawScheme = trimmed.slice(0, colonIndex);

      // Reject if scheme contains any whitespace, control characters, tabs, or newlines
      if (/[\s\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/.test(rawScheme)) {
        return {
          isValid: false,
          url: trimmed,
          domain: '',
          kind: 'link',
          reason: 'Invalid characters in URL scheme',
        };
      }

      const cleanScheme = rawScheme.toLowerCase();
      if (FORBIDDEN_SCHEMES.has(cleanScheme)) {
        return {
          isValid: false,
          url: trimmed,
          domain: '',
          kind: 'link',
          reason: 'Unsupported link scheme',
        };
      }

      // RFC 3986 scheme format: starts with letter, followed by letters, digits, +, -, .
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*$/.test(rawScheme)) {
        return {
          isValid: false,
          url: trimmed,
          domain: '',
          kind: 'link',
          reason: 'Invalid URL scheme format',
        };
      }

      if (cleanScheme !== 'http' && cleanScheme !== 'https') {
        return {
          isValid: false,
          url: trimmed,
          domain: '',
          kind: 'link',
          reason: 'Only http and https links are supported',
        };
      }
    } else {
      // Protocol-relative URL e.g. //example.com
      if (candidate.startsWith('//')) {
        candidate = `https:${candidate}`;
      } else {
        // Localhost handling
        const hostPart = candidate.split('/')[0].toLowerCase();
        if (hostPart === 'localhost') {
          candidate = `https://${candidate}`;
        } else {
          // Scheme-less domain candidate e.g. youtube.com/watch?v=1, www.example.com
          const domainPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(\/.*)?$/;
          if (domainPattern.test(candidate)) {
            candidate = `https://${candidate}`;
          } else {
            return {
              isValid: false,
              url: trimmed,
              domain: '',
              kind: 'link',
              reason: 'Invalid URL format',
            };
          }
        }
      }
    }
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        isValid: false,
        url: trimmed,
        domain: '',
        kind: 'link',
        reason: 'Only http and https links are supported',
      };
    }

    const host = parsed.hostname.toLowerCase();
    if (!host || host.length === 0) {
      return {
        isValid: false,
        url: trimmed,
        domain: '',
        kind: 'link',
        reason: 'Missing host in URL',
      };
    }

    // Reject control characters or whitespace within hostname
    if (/[\s\x00-\x1F\x7F-\x9F\u200B-\u200D\uFEFF]/.test(parsed.hostname)) {
      return {
        isValid: false,
        url: trimmed,
        domain: '',
        kind: 'link',
        reason: 'Invalid characters in host',
      };
    }

    const domain = host.replace(/^www\./, '');
    const kind = detectLinkKind(domain, parsed.pathname);

    return {
      isValid: true,
      url: parsed.toString(),
      domain,
      kind,
    };
  } catch {
    return {
      isValid: false,
      url: trimmed,
      domain: '',
      kind: 'link',
      reason: 'Invalid URL format',
    };
  }
}

/**
 * Categorizes a domain/URL into a specific link kind for icon selection.
 */
export function detectLinkKind(domain: string, pathname = ''): LinkKind {
  const d = domain.toLowerCase();
  const p = pathname.toLowerCase();

  if (d === 'youtube.com' || d.endsWith('.youtube.com') || d === 'youtu.be') {
    return 'youtube';
  }
  if (d === 'drive.google.com') {
    return 'drive';
  }
  if (d === 'docs.google.com') {
    return 'docs';
  }
  if (d === 'vimeo.com' || d.endsWith('.vimeo.com')) {
    return 'youtube';
  }
  return 'link';
}

/**
 * Returns a human-friendly primary title for a link attachment.
 * Never displays a raw long URL as the main title text.
 */
export function getFriendlyLinkTitle(
  url: string,
  explicitFileName?: string,
  kind?: LinkKind,
  domain?: string
): string {
  const trimmedName = explicitFileName?.trim();
  const isNameRawUrl =
    !trimmedName ||
    trimmedName.startsWith('http://') ||
    trimmedName.startsWith('https://') ||
    trimmedName.startsWith('www.');

  if (trimmedName && !isNameRawUrl) {
    return trimmedName;
  }

  switch (kind) {
    case 'youtube':
      return 'YouTube Video';
    case 'drive':
      return 'Google Drive File';
    case 'docs':
      return 'Google Document';
    default:
      return domain ? `${domain} Link` : 'External Link';
  }
}

export interface TextSegment {
  text: string;
  isLink: boolean;
  url?: string;
}

/**
 * Strict regex for linkifying free description text.
 * Only matches:
 * (a) explicit http:// or https:// URLs
 * (b) scheme-less URLs that start with www. or whose host is youtube.com, youtu.be, drive.google.com, docs.google.com or vimeo.com
 * Ordinary filenames/words (report.pdf, README.md, main.py, node.js, e.g., Ms.Santos, 3.5) will NOT match.
 */
export const FREE_TEXT_URL_REGEX = /(?:https?:\/\/[^\s<>"'()]+|(?:\bwww\.[a-zA-Z0-9-]+\.[^\s<>"'()]+|\b(?:(?:m\.)?youtube\.com|youtu\.be|drive\.google\.com|docs\.google\.com|(?:player\.)?vimeo\.com)(?:\/[^\s<>"'()]*)?))/gi;

/**
 * Parses plain text into text segments with extracted http/https links.
 * Strips trailing punctuation (. , ) ! ? ; :) from matched links so sentence punctuation is preserved.
 */
export function parseLinksFromText(content: string): TextSegment[] {
  if (!content) return [];

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  FREE_TEXT_URL_REGEX.lastIndex = 0;

  while ((match = FREE_TEXT_URL_REGEX.exec(content)) !== null) {
    const rawMatch = match[0];
    const matchStart = match.index;

    // Push preceding plain text
    if (matchStart > lastIndex) {
      segments.push({
        text: content.substring(lastIndex, matchStart),
        isLink: false,
      });
    }

    // Strip trailing punctuation from the matched link: . , ) ! ? ; :
    let cleanLink = rawMatch;
    let trailingPunctuation = '';
    const trailingPunctuationRegex = /[.,)!?:;]$/;
    while (cleanLink.length > 0 && trailingPunctuationRegex.test(cleanLink)) {
      trailingPunctuation = cleanLink.slice(-1) + trailingPunctuation;
      cleanLink = cleanLink.slice(0, -1);
    }

    if (cleanLink.length > 0) {
      const sanitized = sanitizeUrl(cleanLink);
      if (sanitized.isValid) {
        segments.push({
          text: cleanLink,
          isLink: true,
          url: sanitized.url,
        });
      } else {
        segments.push({
          text: cleanLink,
          isLink: false,
        });
      }
    }

    // Advance lastIndex to end of clean link so trailing punctuation is included in subsequent text
    lastIndex = matchStart + cleanLink.length;
    // Set regex lastIndex forward to matchStart + rawMatch.length to prevent infinite loop
    FREE_TEXT_URL_REGEX.lastIndex = matchStart + rawMatch.length;
  }

  // Trailing remainder of text
  if (lastIndex < content.length) {
    segments.push({
      text: content.substring(lastIndex),
      isLink: false,
    });
  }

  return segments;
}
