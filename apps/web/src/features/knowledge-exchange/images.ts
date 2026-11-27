import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const PRIVATE_IMAGE_URL = /^(\/api\/assets\/[a-zA-Z0-9-]{1,100})(?:\?inline=(?:1|true))?$/;

export function inlineKnowledgeImage(url: string): string {
  const match = PRIVATE_IMAGE_URL.exec(url);
  return match ? `${match[1]}?inline=1` : url;
}

export function inlineKnowledgeImages(html: string): string {
  return html.replace(/(<img\b[^>]*?\s+src\s*=\s*)(["'])(\/api\/assets\/[a-zA-Z0-9-]{1,100})\2/gi,
    (_match, attribute, quote, url) => `${attribute}${quote}${inlineKnowledgeImage(url)}${quote}`);
}

/** Read actual image elements, excluding plain links and fenced Markdown examples. */
export function knowledgeImages(body: string): { url: string; alt: string }[] {
  if (!body.includes('![') && !/<img\b/i.test(body)) return [];
  const images: { url: string; alt: string }[] = [];
  sanitizeHtml(marked.parse(body, { async: false }), {
    allowedTags: ['img'],
    allowedAttributes: { img: ['src', 'alt'] },
    allowedSchemes: ['https', 'http', 'data'],
    allowProtocolRelative: false,
    nonTextTags: ['script', 'style', 'textarea', 'option', 'template'],
    exclusiveFilter({ tag, attribs }) {
      if (tag === 'img' && attribs.src && (!attribs.src.toLowerCase().startsWith('data:') || /^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(attribs.src))) {
        images.push({ url: inlineKnowledgeImage(attribs.src), alt: attribs.alt || 'Attached image' });
      }
      return false;
    },
  });
  return images;
}
