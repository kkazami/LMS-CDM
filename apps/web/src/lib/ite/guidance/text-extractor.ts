/**
 * apps/web/src/lib/ite/guidance/text-extractor.ts
 *
 * Pure text extraction and sanitization for learning materials.
 * Strips HTML, normalizes markdown, trims to safe bounds, and never leaks personal data.
 */

export interface MaterialRawInput {
  title?: string | null;
  description?: string | null;
  attachments?: Array<{
    fileName?: string | null;
    type?: string | null;
    url?: string | null;
  }> | null;
}

export interface ExtractedMaterialText {
  available: boolean;
  cleanText: string;
  charCount: number;
  reason?: string;
}

export const MAX_MATERIAL_TEXT_LENGTH = 6000;
export const MIN_MATERIAL_TEXT_LENGTH = 40;

const UNSUPPORTED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg",
  ".mp4", ".webm", ".mov", ".avi", ".mkv",
  ".mp3", ".wav", ".ogg", ".aac",
  ".zip", ".tar", ".gz", ".rar", ".7z",
]);

/**
 * Strips HTML tags, entity references, markdown links/images, and redundant whitespace.
 */
export function sanitizeText(raw: string): string {
  if (!raw) return "";

  return raw
    // Remove script / style tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    // Remove all HTML tags
    .replace(/<[^>]+>/g, " ")
    // Convert markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove markdown image syntax ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, " ")
    // Remove code block backticks
    .replace(/```[a-z]*\n?/gi, " ")
    .replace(/```/g, " ")
    .replace(/`/g, "")
    // Normalize html entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    // Collapse excess whitespace
    .replace(/[\r\n]+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Extracts and checks if the material has readable instructional text.
 */
export function extractMaterialText(input: MaterialRawInput): ExtractedMaterialText {
  const parts: string[] = [];

  const cleanTitle = sanitizeText(input.title || "");
  if (cleanTitle) {
    parts.push(`Lesson Topic: ${cleanTitle}`);
  }

  const cleanDesc = sanitizeText(input.description || "");
  if (cleanDesc) {
    parts.push(cleanDesc);
  }

  // Check attachments
  const attachments = input.attachments || [];
  const hasOnlyMedia = attachments.length > 0 && attachments.every((att) => {
    const name = (att.fileName || att.url || "").toLowerCase();
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
    return UNSUPPORTED_EXTENSIONS.has(ext);
  });

  const combined = parts.join("\n\n").trim();

  // If description was empty and the attachment is purely an image/video/binary
  if (cleanDesc.length < MIN_MATERIAL_TEXT_LENGTH && hasOnlyMedia) {
    return {
      available: false,
      cleanText: "",
      charCount: 0,
      reason: "Study help isn't available for this material (media files such as images, audio, or video cannot be summarized).",
    };
  }

  if (combined.length < MIN_MATERIAL_TEXT_LENGTH) {
    return {
      available: false,
      cleanText: "",
      charCount: combined.length,
      reason: "Study help isn't available for this material (lesson has insufficient readable text).",
    };
  }

  // Truncate cleanly up to MAX_MATERIAL_TEXT_LENGTH
  let trimmed = combined;
  if (trimmed.length > MAX_MATERIAL_TEXT_LENGTH) {
    // Find last space before max limit
    const cutoff = trimmed.lastIndexOf(" ", MAX_MATERIAL_TEXT_LENGTH);
    trimmed = (cutoff > MAX_MATERIAL_TEXT_LENGTH * 0.8 ? trimmed.slice(0, cutoff) : trimmed.slice(0, MAX_MATERIAL_TEXT_LENGTH)) + "...";
  }

  return {
    available: true,
    cleanText: trimmed,
    charCount: trimmed.length,
  };
}
