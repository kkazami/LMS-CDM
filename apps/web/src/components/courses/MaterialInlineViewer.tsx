"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  ExternalLink,
  Download,
  AlertCircle,
  Loader2,
  FileText,
  Music,
  Video,
  FileQuestion,
  FileSpreadsheet,
} from "lucide-react";
import {
  classifyAttachmentMedia,
  getFriendlyAttachmentTitle,
  getSecondaryAttachmentLabel,
  type ClassifiedMedia,
} from "@/lib/ite/media-preview";

export interface MaterialInlineViewerProps {
  attachment: {
    id: string;
    type?: string;
    url: string;
    fileName?: string | null;
    fileSize?: number | null;
  };
  onClose: () => void;
  instituteCode?: string;
}

export default function MaterialInlineViewer({
  attachment,
  onClose,
  instituteCode = "ite",
}: MaterialInlineViewerProps) {
  const isIte = (instituteCode || "").toLowerCase() === "ite";
  const media: ClassifiedMedia = classifyAttachmentMedia(attachment);

  const [isLoading, setIsLoading] = useState(
    ["embed", "video", "audio", "image", "pdf"].includes(media.kind)
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard accessibility: Escape key closes viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus container on mount for keyboard accessibility
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const friendlyTitle = isIte
    ? getFriendlyAttachmentTitle(attachment)
    : (media.fileName || attachment.fileName || attachment.url);
  const secondaryLabel = isIte
    ? getSecondaryAttachmentLabel(attachment)
    : (media.provider ? media.provider.replace("-", " ") : media.kind);
  const displayName = friendlyTitle;
  const isDownloadable = Boolean(media.downloadUrl);

  const isVideoAspect = media.kind === "video" || media.provider === "youtube" || media.provider === "vimeo";
  const isDocumentHeight = media.kind === "pdf" || media.provider === "google-drive" || media.provider === "google-docs";

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="region"
      aria-label={`Preview of ${displayName}`}
      className="mt-2 w-full min-w-0 max-w-full box-border rounded-xl border border-blue-500/30 bg-slate-50 dark:bg-[#161926] p-3 sm:p-4 shadow-md transition-all outline-none overflow-hidden"
    >
      {/* Header Toolbar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10 mb-3 w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
            {media.kind === "video" || media.provider === "youtube" || media.provider === "vimeo" ? (
              <Video className="h-4 w-4 shrink-0" />
            ) : media.kind === "audio" ? (
              <Music className="h-4 w-4 shrink-0" />
            ) : media.kind === "office" ? (
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
            ) : (
              <FileText className="h-4 w-4 shrink-0" />
            )}
          </span>
          <p
            className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-[#F0F2F8] truncate min-w-0 flex-1"
            title={attachment.url}
          >
            {displayName}
          </p>
          <span className="hidden sm:inline-flex shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
            {secondaryLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Download button for files */}
          {isDownloadable && (
            <a
              href={media.downloadUrl}
              download={attachment.fileName || "download"}
              className="inline-flex items-center gap-1 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
              title="Download file"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}

          {/* Open in new tab button */}
          <a
            href={media.directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Open</span>
          </a>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#F0F2F8] hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close preview (Esc)"
            title="Close (Esc)"
          >
            <X className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full max-w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-[#0E1017]">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-slate-100/90 dark:bg-[#0E1017]/90 backdrop-blur-xs">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Loading preview...</span>
          </div>
        )}

        {/* Error Fallback */}
        {errorMessage && (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
            <AlertCircle className="h-10 w-10 text-amber-500 mb-3" />
            <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8] mb-1">Preview Unavailable</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4">{errorMessage}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a
                href={media.directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in New Tab
              </a>
              {isDownloadable && (
                <a
                  href={media.downloadUrl}
                  download={attachment.fileName || "download"}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-white/15 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download File
                </a>
              )}
            </div>
          </div>
        )}

        {/* 1. Embeds (YouTube, Vimeo, Google Drive / Docs) */}
        {!errorMessage && media.kind === "embed" && (
          <div className={isVideoAspect ? "relative aspect-video w-full max-w-full overflow-hidden" : "h-[70vh] max-h-[70vh] w-full max-w-full overflow-hidden"}>
            <iframe
              src={media.previewUrl}
              title={displayName}
              className="h-full w-full max-w-full border-0 rounded-xl"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; presentation"
              allowFullScreen
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setErrorMessage("The embedded document or video provider refused to connect.");
              }}
            />
          </div>
        )}

        {/* 2. Uploaded HTML5 Video */}
        {!errorMessage && media.kind === "video" && (
          <div className="relative aspect-video w-full max-w-full flex items-center justify-center bg-black rounded-xl overflow-hidden">
            <video
              controls
              preload="metadata"
              src={media.previewUrl}
              className="h-full w-full max-h-[70vh] max-w-full object-contain"
              onLoadedData={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setErrorMessage("Unable to play video in browser. Please download the file to view.");
              }}
            />
          </div>
        )}

        {/* 3. Uploaded Audio */}
        {!errorMessage && media.kind === "audio" && (
          <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#12151F] rounded-xl min-h-[180px] w-full max-w-full overflow-hidden">
            <Music className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-3 shrink-0" />
            <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8] mb-4 text-center truncate max-w-full" title={attachment.url}>
              {displayName}
            </p>
            <audio
              controls
              src={media.previewUrl}
              className="w-full max-w-lg"
              onCanPlay={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setErrorMessage("Audio playback format not supported by your browser.");
              }}
            />
          </div>
        )}

        {/* 4. Uploaded Images */}
        {!errorMessage && media.kind === "image" && (
          <div className="flex items-center justify-center p-4 h-[70vh] max-h-[70vh] w-full max-w-full bg-slate-900/5 dark:bg-black/20 rounded-xl overflow-hidden">
            <img
              src={media.previewUrl}
              alt={displayName}
              className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setErrorMessage("Image could not be loaded.");
              }}
            />
          </div>
        )}

        {/* 5. PDF Document */}
        {!errorMessage && media.kind === "pdf" && (
          <div className="h-[70vh] max-h-[70vh] w-full max-w-full flex flex-col overflow-hidden">
            <iframe
              src={media.previewUrl}
              title={displayName}
              className="h-full w-full max-w-full border-0 rounded-xl bg-white"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setErrorMessage("Browser does not support inline PDF rendering.");
              }}
            />
            {/* Fallback footer for PDF */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-200/60 dark:bg-white/5 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-300/50 dark:border-white/10">
              <span>PDF not displaying properly?</span>
              <div className="flex items-center gap-2">
                <a
                  href={media.directUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in Tab
                </a>
                <span>·</span>
                <a
                  href={media.downloadUrl}
                  download={attachment.fileName || "document.pdf"}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 6. Office Documents (DOCX, PPTX, XLSX) */}
        {!errorMessage && media.kind === "office" && (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[220px]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-4">
              <FileSpreadsheet className="h-7 w-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8] mb-1">
              {displayName}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6">
              Office documents cannot be previewed directly in the browser to protect document privacy. Please download the file to edit or view.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={media.downloadUrl}
                download={attachment.fileName || "document"}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-xs"
              >
                <Download className="h-4 w-4" />
                Download Document
              </a>
              <a
                href={media.directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-white/15 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open File
              </a>
            </div>
          </div>
        )}

        {/* 7. Unsupported Files */}
        {!errorMessage && media.kind === "unsupported_file" && (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
            <FileQuestion className="h-10 w-10 text-slate-400 mb-3" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] mb-1">
              {displayName}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Direct preview is not available for this file type.
            </p>
            <a
              href={media.downloadUrl}
              download={attachment.fileName || "file"}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Download File
            </a>
          </div>
        )}

        {/* 8. External Links (Not embeddable) */}
        {!errorMessage && media.kind === "external_link" && (
          <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px] w-full max-w-full overflow-hidden">
            <ExternalLink className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-3 shrink-0" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] mb-1 truncate max-w-full" title={displayName}>
              {displayName}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-full truncate" title={media.directUrl}>
              {media.directUrl}
            </p>
            <a
              href={media.directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-xs shrink-0"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              Open Resource in New Tab
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
