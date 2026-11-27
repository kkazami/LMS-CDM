"use client";

import { useState, useEffect, useRef, type ComponentProps } from "react";
import { useParams } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2, ChevronLeft, ChevronRight, MessageSquare, ZoomIn, ZoomOut, Download, FileText, ExternalLink } from "lucide-react";
import { getFileExtension } from "@/lib/ite/media-preview";
import { materialPreviewUrl, supportsOfficePreview } from "@/lib/material-preview";
import OfficeAttachmentPreview from "./OfficeAttachmentPreview";

// Initialize pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf-runtime/${pdfjs.version}/pdf.worker.min.mjs`;

type LoadedPdf = Parameters<NonNullable<ComponentProps<typeof Document>["onLoadSuccess"]>>[0];
const PDF_PAGE_PADDING = 16;
const PDF_LOAD_ERROR = <p role="alert" className="max-w-sm p-6 text-center text-sm text-slate-600 dark:text-slate-300">The PDF preview could not load. Use Download to open the original.</p>;
const PDF_PAGE_BUTTON = "pointer-events-auto grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-40 dark:border-white/10 dark:bg-[#141721] dark:text-[#F0F2F8] dark:hover:bg-[#1E2132]";

interface Annotation {
  id: string;
  quote: string;
  noteContent: string;
  color: string;
  positionMetadata: string; // JSON
}

interface DocumentViewerProps {
  url: string;
  attachmentId: string;
  userId: string;
  type?: string;
  fileName?: string;
  materialId?: string;
}

export default function DocumentViewer({ url, attachmentId, userId, type, fileName, materialId }: DocumentViewerProps) {
  const params = useParams();
  const institute = (params?.institute as string) || "";
  const isIte = institute.toLowerCase() === "ite";

  const [pdf, setPdf] = useState<LoadedPdf | null>(null);
  const numPages = pdf?.numPages;
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [pageLayout, setPageLayout] = useState<{
    pdf: LoadedPdf;
    pageNumber: number;
    size: { width: number; height: number } | null;
  } | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [showNotes, setShowNotes] = useState(false);
  
  // States for text files
  const [textContent, setTextContent] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Active reading timer (grants EXP after 15 seconds of reading)
  useEffect(() => {
    if (!materialId) return;

    const timer = setTimeout(() => {
      fetch("/api/materials/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, durationSeconds: 15 }),
      }).catch(() => {
        // silent catch
      });
    }, 15000);

    return () => clearTimeout(timer);
  }, [materialId]);

  useEffect(() => {
    fetchAnnotations();
  }, [attachmentId]);

  const fetchAnnotations = async () => {
    try {
      const res = await fetch(`/api/materials/annotations?attachmentId=${attachmentId}`);
      if (res.ok) {
        const data = await res.json();
        setAnnotations(data);
      }
    } catch (err) {
      console.error("Failed to fetch annotations", err);
    }
  };

  const onDocumentLoadSuccess = (document: LoadedPdf) => {
    setPdf(document);
    setPageNumber(1);
  };

  const handleSelection = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
      const text = selection.toString();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();

      if (containerRect) {
        setSelectedText(text);
        setTooltipPos({
          x: rect.left - containerRect.left + (rect.width / 2),
          y: Math.max(0, rect.top - containerRect.top - 10),
        });
        setShowTooltip(true);
      }
    } else if (!isAddingNote) {
      setShowTooltip(false);
    }
  };

  const saveAnnotation = async () => {
    if (!selectedText) return;

    try {
      const res = await fetch("/api/materials/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachmentId,
          quote: selectedText,
          noteContent,
          color: selectedColor,
          positionMetadata: { page: pageNumber }, // Simplified metadata
        }),
      });

      if (res.ok) {
        const newAnn = await res.json();
        setAnnotations((prev) => [...prev, newAnn]);
        setShowTooltip(false);
        setIsAddingNote(false);
        setNoteContent("");
        window.getSelection()?.removeAllRanges();
      }
    } catch (err) {
      console.error("Failed to save annotation", err);
    }
  };

  const deleteAnnotation = async (id: string) => {
    try {
      const res = await fetch(`/api/materials/annotations?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAnnotations((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete annotation", err);
    }
  };

  // Determine file types
  const isLink = type === "LINK";
  const fileExt = getFileExtension(fileName || url);
  const isImage = !isLink && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
  const isOffice = !isLink && supportsOfficePreview(fileExt);
  const isText = !isLink && ['txt', 'csv'].includes(fileExt);
  const isPdf = !isLink && fileExt === 'pdf';
  const downloadOnly = !isLink && !isImage && !isOffice && !isText && !isPdf;

  const showPdfControls = isPdf;
  const showPdfNavigation = isPdf && (numPages ?? 0) > 1;

  useEffect(() => {
    const container = containerRef.current;
    if (!isPdf || !container) return;

    function measure() {
      if (!container) return;
      // The border box stays constant when zooming adds scrollbars.
      const { offsetWidth, offsetHeight } = container;
      setViewport({ width: offsetWidth - PDF_PAGE_PADDING * 2, height: offsetHeight - PDF_PAGE_PADDING * 2 });
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container, { box: "border-box" });
    return () => observer.disconnect();
  }, [isPdf]);

  useEffect(() => {
    if (!pdf || !isPdf) return;

    let active = true;
    pdf.getPage(pageNumber).then((page) => {
      const { width, height } = page.getViewport({ scale: 1 });
      if (active) setPageLayout({ pdf, pageNumber, size: { width, height } });
    }).catch(() => {
      if (active) setPageLayout({ pdf, pageNumber, size: null });
    });
    return () => { active = false; };
  }, [pdf, pageNumber, isPdf]);

  useEffect(() => {
    if (isPdf) containerRef.current?.scrollTo(0, 0);
  }, [isPdf, pageNumber]);

  // Keep the arrows beside the last measured page while the next one loads.
  const measuredPage = pageLayout?.pdf === pdf ? pageLayout : null;
  const currentPage = measuredPage?.pageNumber === pageNumber ? measuredPage : null;
  const measuredSize = measuredPage?.size;
  const measuredScale = measuredSize && viewport.width > 0 && viewport.height > 0
    ? Math.min(viewport.width / measuredSize.width, viewport.height / measuredSize.height) * zoom / 100
    : null;
  const pageScale = currentPage ? measuredScale : null;
  const pageWidth = measuredSize && measuredScale !== null ? measuredSize.width * measuredScale : null;
  const pdfLoading = <Loader2 aria-label="Loading PDF preview" className={`h-8 w-8 animate-spin ${isIte ? "text-blue-600" : "text-[#F97316]"}`} />;

  // Load text content if it's a text file
  useEffect(() => {
    if (isText && url) {
      // Handle relative vs absolute
      const fetchUrl = url.startsWith('/') ? url : url;
      fetch(fetchUrl)
        .then(res => res.text())
        .then(text => setTextContent(text))
        .catch(err => console.error("Failed to fetch text", err));
    }
  }, [isText, url]);

  // Parse YouTube
  let youtubeUrl = null;
  if (isLink && (url.includes('youtube.com') || url.includes('youtu.be'))) {
    const videoId = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) youtubeUrl = `https://www.youtube.com/embed/${videoId}`;
  }

  // Colors for highlights
  const colors = [
    { id: "yellow", bg: "bg-yellow-200", border: "border-yellow-400" },
    { id: "green", bg: "bg-green-200", border: "border-green-400" },
    { id: "pink", bg: "bg-pink-200", border: "border-pink-400" },
    { id: "blue", bg: "bg-blue-200", border: "border-blue-400" },
  ];

  return (
    <div className="flex h-full flex-col md:flex-row gap-6">
      {/* Main Document Viewer */}
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-100 dark:border-white/5 dark:bg-[#0B0D13]">
        {/* Toolbar - Show pagination and zoom for PDFs and converted PPTXs */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-3 py-2 sm:px-4 dark:border-white/5 dark:bg-[#141721]">
          <div className="flex items-center gap-2">
            {showPdfControls && (
              <span aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-slate-700 dark:text-[#F0F2F8]">
                Page {pageNumber} of {numPages || "--"}
              </span>
            )}
            {!showPdfControls && (
              <span className="flex min-w-0 items-center gap-2 break-all text-sm font-bold text-slate-700 dark:text-[#F0F2F8]">
                <FileText className={`h-4 w-4 ${isIte ? "text-blue-600 dark:text-blue-400" : "text-[#F97316]"}`} />
                {isLink ? "External Link Preview" : (fileName || "File Preview")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isLink ? (
              <a
                href={url}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-[#F0F2F8] cursor-pointer"
                title="Download File"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm font-semibold hidden sm:inline">Download</span>
              </a>
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-[#F0F2F8] cursor-pointer"
                title="Open Link in New Tab"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-semibold hidden sm:inline">Open</span>
              </a>
            )}
            
            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />

            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                showNotes
                  ? (isIte ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-orange-500/10 text-[#F97316]")
                  : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-[#F0F2F8]"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-semibold hidden sm:inline">Notes</span>
            </button>
            
            {showPdfControls && (
              <>
                <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1" />
                <button aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-[#F0F2F8] cursor-pointer">
                  <ZoomOut className="h-5 w-5" />
                </button>
                <button
                  aria-label={`${zoom}% zoom. Fit whole page`}
                  title="Fit whole page"
                  onClick={() => setZoom(100)}
                  className="w-12 rounded-md py-1 text-center text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-[#F0F2F8] dark:hover:bg-white/5 cursor-pointer"
                >
                  {zoom}%
                </button>
                <button aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(300, value + 10))} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-[#F0F2F8] cursor-pointer">
                  <ZoomIn className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {showPdfNavigation && (
          <div
            role="group"
            aria-label="Page navigation"
            className="pointer-events-none z-10 col-start-1 row-start-2 mx-auto flex w-full max-w-[calc(100%_-_0.5rem)] justify-between self-center"
            style={pageWidth === null ? undefined : { width: `calc(${pageWidth}px + 6.5rem)` }}
          >
            <button
              type="button"
              aria-label="Previous page"
              title="Previous page"
              onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
              disabled={pageNumber <= 1}
              className={PDF_PAGE_BUTTON}
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next page"
              title="Next page"
              onClick={() => setPageNumber((page) => Math.min(numPages ?? 1, page + 1))}
              disabled={pageNumber >= (numPages ?? 1)}
              className={PDF_PAGE_BUTTON}
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
          </div>
        )}

        {/* Dynamic Content Container */}
        <div 
          className={`relative col-start-1 row-start-2 flex min-h-0 min-w-0 overflow-auto bg-slate-100 dark:bg-[#0B0D13] ${showPdfNavigation ? "mx-12" : ""}`}
          ref={containerRef}
          onMouseUp={handleSelection}
        >
          {/* 1. Link (YouTube) */}
          {isLink && youtubeUrl && (
            <div className="w-full h-full p-4">
              <iframe
                src={youtubeUrl}
                className="w-full h-full rounded-2xl shadow-xs border border-slate-200/80 dark:border-white/5"
                allowFullScreen
              />
            </div>
          )}

          {/* 2. Link (General Website) */}
          {isLink && !youtubeUrl && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-[#0B0D13]">
              <div className="bg-white dark:bg-[#141721] p-10 rounded-3xl shadow-xs border border-slate-200/80 dark:border-white/5 max-w-md w-full transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:hover:border-white/10">
                <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full mb-6 transition-transform duration-300 hover:scale-110 ${
                  isIte
                    ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-8 ring-blue-500/10"
                    : "bg-orange-500/10 dark:bg-orange-500/20 text-[#F97316] ring-8 ring-orange-500/10"
                }`}>
                  <ExternalLink className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8] mb-3 tracking-tight">External Resource</h2>
                <p className="text-sm text-slate-500 dark:text-[#8B92A5] mb-8 leading-relaxed font-medium">
                  This learning material is hosted externally. For the best experience and security, please open it in a new tab.
                </p>
                <a 
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold text-white shadow-xs transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                    isIte ? "bg-blue-600 hover:bg-blue-700" : "bg-[#F97316] hover:bg-orange-600"
                  }`}
                >
                  <ExternalLink className="h-5 w-5" />
                  Open Link Securely
                </a>
              </div>
            </div>
          )}

          {/* 3. Text Files */}
          {isText && (
            <div className="w-full h-full p-6 bg-white dark:bg-[#141721] overflow-y-auto">
              {textContent ? (
                <pre className="text-sm text-slate-800 dark:text-[#F0F2F8] whitespace-pre-wrap font-sans max-w-4xl mx-auto leading-relaxed">
                  {textContent}
                </pre>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className={`h-8 w-8 animate-spin ${isIte ? "text-blue-600" : "text-[#F97316]"}`} />
                </div>
              )}
            </div>
          )}

          {/* 4. Images */}
          {isImage && (
            <div className="w-full h-full flex items-center justify-center p-8">
              <img 
                src={url} 
                alt={fileName || "Image"} 
                className="max-w-full max-h-full object-contain rounded-xl shadow-xs border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721]"
              />
            </div>
          )}

          {isOffice && <OfficeAttachmentPreview attachmentId={attachmentId} />}

          {downloadOnly && (
            <div className="m-auto max-w-sm p-6 text-center">
              <FileText aria-hidden="true" className="mx-auto mb-3 size-7 text-slate-500" />
              <h2 className="font-semibold">Preview unavailable</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Use Download to save the original, then open it from your Downloads folder.</p>
            </div>
          )}


          {/* 8. PDF Document */}
          {isPdf && (
            <div className="flex min-h-full w-max min-w-full shrink-0 self-start" style={{ padding: PDF_PAGE_PADDING }}>
              <Document
                file={materialPreviewUrl(attachmentId)}
                error={PDF_LOAD_ERROR}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={pdfLoading}
                className="m-auto shrink-0"
              >
                {pageScale !== null ? (
                  <Page pageNumber={pageNumber} scale={pageScale} error={PDF_LOAD_ERROR} className="bg-white shadow-md" />
                ) : currentPage && !currentPage.size ? PDF_LOAD_ERROR : pdfLoading}
              </Document>
            </div>
          )}

          {/* Selection Tooltip for Highlighting */}
          {showTooltip && (
            <div 
              className="absolute z-50 -translate-x-1/2 -translate-y-full pb-2"
              style={{ left: tooltipPos.x, top: tooltipPos.y }}
            >
              <div className="flex flex-col gap-3 rounded-xl bg-slate-900 dark:bg-[#141721] p-3 shadow-xl w-64 border border-slate-700 dark:border-white/10">
                {!isAddingNote ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsAddingNote(true)}
                      className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer ${
                        isIte ? "bg-blue-600 hover:bg-blue-700" : "bg-[#F97316] hover:bg-orange-600"
                      }`}
                    >
                      Highlight & Note
                    </button>
                  </div>
                ) : (
                  <>
                    <textarea
                      autoFocus
                      placeholder="Add a sticky note..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className={`w-full resize-none rounded-lg bg-slate-800 dark:bg-[#1E2132] p-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        isIte ? "focus:ring-blue-500" : "focus:ring-orange-500"
                      }`}
                      rows={3}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {colors.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedColor(c.id)}
                            className={`h-5 w-5 rounded-full cursor-pointer ${c.bg} ${selectedColor === c.id ? `ring-2 ring-white ring-offset-2 ring-offset-slate-900` : ''}`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setIsAddingNote(false); setShowTooltip(false); }} className="text-xs text-slate-400 hover:text-white cursor-pointer">Cancel</button>
                        <button onClick={saveAnnotation} className={`rounded-lg px-3 py-1 text-xs font-bold text-white cursor-pointer ${
                          isIte ? "bg-blue-600 hover:bg-blue-700" : "bg-[#F97316] hover:bg-orange-600"
                        }`}>Save</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="absolute left-1/2 bottom-0 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-slate-900 dark:bg-[#141721] border-r border-b border-slate-700 dark:border-white/10" />
            </div>
          )}
        </div>
      </div>

      {/* Annotations Sidebar */}
      {showNotes && (
        <div className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs animate-in slide-in-from-right-8 max-md:max-h-1/3 md:w-80 dark:border-white/5 dark:bg-[#141721]">
          <div className="bg-slate-50 dark:bg-[#181B26] border-b border-slate-200/80 dark:border-white/5 px-5 py-4">
          <h3 className="font-bold text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2">
            <MessageSquare className={`h-5 w-5 ${isIte ? "text-blue-600 dark:text-blue-400" : "text-[#F97316]"}`} />
            Notes & Highlights
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {annotations.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-slate-500 dark:text-[#8B92A5]">No notes yet. Select text in the document to add a highlight.</p>
            </div>
          ) : (
            annotations.map((ann) => (
              <div key={ann.id} className="rounded-xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#181B26] shadow-xs overflow-hidden group">
                <div className={`h-1.5 w-full bg-${ann.color}-400`} />
                <div className="p-3 text-sm">
                  <p className="italic text-slate-600 dark:text-[#8B92A5] border-l-2 border-slate-200 dark:border-white/10 pl-2 mb-2 line-clamp-3">&quot;{ann.quote}&quot;</p>
                  {ann.noteContent && (
                    <p className="text-slate-900 dark:text-[#F0F2F8] font-medium whitespace-pre-wrap">{ann.noteContent}</p>
                  )}
                  <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteAnnotation(ann.id)} className="text-xs text-rose-500 hover:text-rose-400 font-semibold cursor-pointer">Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}
    </div>
  );
}
