"use client";

import React, { useMemo, useState, useEffect } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { marked } from "marked";
import { ExternalLink, X } from "lucide-react";
import { sanitizeKxHtml } from "../utils";

interface KxLatexRendererProps {
  content: string;
  className?: string;
}

function decodeHtml(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function processMath(html: string): string {
  if (!html) return "";

  // 1. Process block math $$...$$ first
  let withMath = html.replace(/\$\$([\s\S]+?)\$\$/g, (_match, math) => {
    try {
      const decoded = decodeHtml(math.trim());
      const rendered = katex.renderToString(decoded, {
        displayMode: true,
        throwOnError: false,
      });
      return `<span class="block my-3 overflow-x-auto py-1 text-center">${rendered}</span>`;
    } catch {
      return `<span class="block my-2 font-mono text-sm text-red-500">${escapeHtml(math)}</span>`;
    }
  });

  // 2. Process inline math $...$
  withMath = withMath.replace(
    /(?:\$)(?!\s)([^\$\n<]+?)(?<!\s)(?:\$)(?!\d)/g,
    (_match, math) => {
      try {
        const decoded = decodeHtml(math.trim());
        const rendered = katex.renderToString(decoded, {
          displayMode: false,
          throwOnError: false,
        });
        return `<span class="inline-block px-0.5">${rendered}</span>`;
      } catch {
        return `<span class="font-mono text-xs text-red-500">${escapeHtml(math)}</span>`;
      }
    }
  );

  return withMath;
}

/**
 * Parses and renders rich text content with LaTeX mathematics using KaTeX.
 * Handles both already parsed HTML and raw markdown, rendering formatted HTML
 * safely with sanitizeKxHtml instead of escaping raw HTML tags.
 * Also constrains image attachments to small-medium size and provides
 * click-to-enlarge lightbox modal.
 */
export default function KxLatexRenderer({
  content,
  className = "",
}: KxLatexRendererProps) {
  const [enlargedImage, setEnlargedImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEnlargedImage(null);
      }
    };
    if (enlargedImage) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [enlargedImage]);

  const processedHtml = useMemo(() => {
    if (!content) return "";

    // Check if content already contains HTML tags (e.g. from marked.parse)
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);
    const html = hasHtmlTags
      ? content
      : (marked.parse(content, { breaks: true, gfm: true }) as string);

    // Process LaTeX expressions within the HTML
    const htmlWithMath = processMath(html);

    // Ensure final output is sanitized against XSS
    return sanitizeKxHtml(htmlWithMath);
  }, [content]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === "IMG") {
      const img = target as HTMLImageElement;
      setEnlargedImage({
        url: img.src,
        alt: img.alt || "Image preview",
      });
    }
  };

  if (!processedHtml) return null;

  return (
    <>
      <div
        onClick={handleContainerClick}
        className={`kx-latex-content [&_img]:max-h-60 [&_img]:sm:max-h-72 [&_img]:max-w-xs [&_img]:sm:max-w-sm [&_img]:w-auto [&_img]:h-auto [&_img]:rounded-xl [&_img]:border [&_img]:border-slate-200 [&_img]:dark:border-white/10 [&_img]:shadow-xs [&_img]:cursor-zoom-in [&_img]:object-contain hover:[&_img]:opacity-90 [&_img]:transition-all [&_img]:my-2.5 ${className}`}
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />

      {/* Lightbox Modal for Enlargeable Images */}
      {enlargedImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setEnlargedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-150 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center cursor-default"
          >
            {/* Top Bar: Title & Actions */}
            <div className="w-full flex items-center justify-between pb-2 text-white/80">
              <span className="text-xs font-medium truncate pr-4 text-slate-300">
                {enlargedImage.alt || "Attached image"}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={enlargedImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Open original in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setEnlargedImage(null)}
                  className="p-1.5 rounded-full hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Enlarged Image */}
            <img
              src={enlargedImage.url}
              alt={enlargedImage.alt}
              className="max-h-[80vh] max-w-full w-auto object-contain rounded-xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </>
  );
}

