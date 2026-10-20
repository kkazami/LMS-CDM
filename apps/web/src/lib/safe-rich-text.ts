import sanitizeHtml from 'sanitize-html';

/** Server-only boundary for both new notes and pre-existing stored HTML. */
export function safeRichText(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: ['p', 'div', 'br', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'h2', 'h3', 'a'],
    allowedAttributes: { a: ['href', 'title', 'rel'], '*': ['style'] },
    allowedStyles: { '*': { color: [/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i], 'background-color': [/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i], 'text-align': [/^(left|right|center|justify)$/], 'font-weight': [/^(bold|normal|[1-9]00)$/], 'font-style': [/^(normal|italic)$/] } },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
  });
}
