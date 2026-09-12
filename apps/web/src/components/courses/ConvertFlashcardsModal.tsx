"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  X,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  Save,
  AlertCircle,
  FileText,
  Layers,
  Pencil,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  FileSliders,
  Check,
} from "lucide-react";
import { getInstituteTheme } from "@/lib/get-institute-theme";

// Initialize pdfjs worker (same as DocumentViewer)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface RawCard {
  front: string;
  back: string;
  hint?: string;
}

interface FileInfo {
  fileType: "pdf" | "pptx" | "unsupported";
  totalSlides: number | null;
  totalPages: number | null;
  slideTitles: string[] | null;
}

interface ConvertFlashcardsModalProps {
  attachmentId: string;
  attachmentName: string;
  attachmentUrl?: string; // Direct URL to the PDF for thumbnail rendering
  courseId: string;
  instituteCode: string;
  onClose: () => void;
}

type ModalStep =
  | "idle"
  | "inspecting"    // fetching file-info
  | "page-select"   // Vaia-style page/slide picker
  | "loading"
  | "preview"
  | "saving"
  | "done"
  | "error";

// ── Lazy Page Thumbnail Component ──────────────────────────────────────────
// Uses IntersectionObserver to only render the react-pdf <Page> when visible

interface PageThumbnailProps {
  pageNumber: number;
  isSelected: boolean;
  onToggle: (pageNum: number) => void;
}

function PageThumbnail({ pageNumber, isSelected, onToggle }: PageThumbnailProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // Start rendering 200px before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onToggle(pageNumber)}
      className={`group relative flex flex-col items-center rounded-2xl border-2 transition-all duration-200 cursor-pointer overflow-hidden ${
        isSelected
          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-[0_0_16px_-4px_rgba(16,185,129,0.25)] scale-[1.02]"
          : "border-slate-200/80 dark:border-white/8 bg-white dark:bg-[#1A1D27] hover:border-slate-300 dark:hover:border-white/15 hover:shadow-md hover:scale-[1.01]"
      }`}
    >
      {/* Thumbnail Container */}
      <div className="relative w-full aspect-3/4 overflow-hidden rounded-t-xl bg-slate-100 dark:bg-[#0E1018]">
        {isVisible ? (
          <>
            <div className={`w-full h-full flex items-center justify-center [&_.react-pdf__Page]:bg-transparent! [&_canvas]:max-w-full [&_canvas]:max-h-full [&_canvas]:w-auto! [&_canvas]:h-auto! [&_canvas]:object-contain ${!isLoaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}>
              <Page
                pageNumber={pageNumber}
                width={160}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onRenderSuccess={() => setIsLoaded(true)}
                loading={null}
              />
            </div>
            {/* Loading skeleton */}
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-white/10 border-t-emerald-500 animate-spin" />
              </div>
            )}
          </>
        ) : (
          /* Placeholder before IntersectionObserver fires */
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="h-8 w-8 text-slate-200 dark:text-white/10" />
          </div>
        )}

        {/* Selection Overlay */}
        <div className={`absolute inset-0 transition-all duration-200 ${
          isSelected
            ? "bg-emerald-500/8"
            : "bg-transparent group-hover:bg-black/3 dark:group-hover:bg-white/3"
        }`} />

        {/* Checkbox Badge (top-right corner) */}
        <div className={`absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all duration-200 ${
          isSelected
            ? "bg-emerald-500 border-emerald-500 shadow-sm"
            : "bg-white/80 dark:bg-[#1A1D27]/80 border-slate-300 dark:border-white/20 backdrop-blur-sm group-hover:border-slate-400 dark:group-hover:border-white/30"
        }`}>
          {isSelected && (
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          )}
        </div>
      </div>

      {/* Page Number Label */}
      <div className={`w-full py-2 px-3 text-center border-t transition-colors ${
        isSelected
          ? "border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/30"
          : "border-slate-100 dark:border-white/5"
      }`}>
        <span className={`text-xs font-bold tracking-wide ${
          isSelected
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-slate-400 dark:text-[#8B92A5] group-hover:text-slate-600 dark:group-hover:text-[#F0F2F8]"
        }`}>
          Page {pageNumber}
        </span>
      </div>
    </button>
  );
}

// ── Main Modal Component ───────────────────────────────────────────────────

export default function ConvertFlashcardsModal({
  attachmentId,
  attachmentName,
  attachmentUrl,
  courseId,
  instituteCode,
  onClose,
}: ConvertFlashcardsModalProps) {
  const [step, setStep] = useState<ModalStep>("idle");
  const [cards, setCards] = useState<RawCard[]>([]);
  const [deckTitle, setDeckTitle] = useState(
    `${attachmentName.replace(/\.[^.]+$/, "")} Flashcards`
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const theme = getInstituteTheme(instituteCode);

  // ── Page/slide selection state ──
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [selectedSlides, setSelectedSlides] = useState<Set<number>>(new Set());
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // ── Step 1: Inspect the file (get page/slide count) ──
  async function handleStartGenerate() {
    setStep("inspecting");
    setErrorMessage("");

    try {
      const res = await fetch(
        `/api/flashcards/file-info?attachmentId=${attachmentId}`
      );
      const info: FileInfo = await res.json();
      setFileInfo(info);

      if (info.fileType === "unsupported" || (!info.totalPages && !info.totalSlides)) {
        // TXT/DOCX — skip the picker and go straight to generation
        await runGenerate(null);
        return;
      }

      // PDF — default = all pages selected, resolve the PDF URL for thumbnails
      if (info.fileType === "pdf" && info.totalPages) {
        setSelectedPages(
          new Set(Array.from({ length: info.totalPages }, (_, i) => i + 1))
        );
        // Resolve PDF URL for thumbnail rendering
        if (attachmentUrl) {
          setPdfUrl(attachmentUrl);
        } else {
          // Fetch the attachment URL from the API
          const attachRes = await fetch(`/api/materials/attachment-url?id=${attachmentId}`);
          if (attachRes.ok) {
            const attachData = await attachRes.json();
            setPdfUrl(attachData.url);
          }
        }
      }

      // PPTX — default = all slides selected
      if (info.fileType === "pptx" && info.totalSlides) {
        setSelectedSlides(
          new Set(Array.from({ length: info.totalSlides }, (_, i) => i + 1))
        );
      }

      setStep("page-select");
    } catch {
      setErrorMessage("Could not read file metadata. Try generating anyway.");
      await runGenerate(null);
    }
  }

  // ── Step 2: Actually call auto-generate with optional filters ──
  async function runGenerate(
    filters: { selectedPages?: number[]; selectedSlides?: number[] } | null
  ) {
    setStep("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/flashcards/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachmentId,
          courseId,
          ...(filters ?? {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Failed to generate flashcards.");
        setStep("error");
        return;
      }

      setCards(data.cards);
      setStep("preview");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStep("error");
    }
  }

  // Called when user confirms their page/slide selection
  async function handleConfirmSelection() {
    if (!fileInfo) return;

    if (fileInfo.fileType === "pdf") {
      await runGenerate({ selectedPages: Array.from(selectedPages) });
    } else if (fileInfo.fileType === "pptx") {
      await runGenerate({ selectedSlides: Array.from(selectedSlides) });
    } else {
      await runGenerate(null);
    }
  }

  // ── Save: send finalized cards to the API ──
  async function handleSave() {
    if (cards.length === 0) return;
    setStep("saving");

    try {
      const res = await fetch("/api/flashcards/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachmentId,
          courseId,
          save: true,
          deckTitle,
          deckColor: theme.colors.primary,
          cards,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Failed to save flashcard deck.");
        setStep("preview");
        return;
      }

      setStep("done");
    } catch {
      setErrorMessage("Network error while saving. Please try again.");
      setStep("preview");
    }
  }

  // ── Card editing helpers ──
  function updateCard(
    index: number,
    field: "front" | "back" | "hint",
    value: string
  ) {
    setCards((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function deleteCard(index: number) {
    setCards((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function addCard() {
    setCards((prev) => {
      // Use prev.length (not the stale outer `cards.length`) so the
      // editing index always points at the newly appended card.
      setEditingIndex(prev.length);
      return [...prev, { front: "", back: "" }];
    });
  }

  // ── PDF page toggle helpers ──
  const togglePage = useCallback((n: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  function selectAllPages() {
    if (!fileInfo?.totalPages) return;
    setSelectedPages(
      new Set(Array.from({ length: fileInfo.totalPages }, (_, i) => i + 1))
    );
  }

  function deselectAllPages() {
    setSelectedPages(new Set());
  }

  // ── PPTX slide toggle helpers ──
  const toggleSlide = useCallback((n: number) => {
    setSelectedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }, []);

  function selectAllSlides() {
    if (!fileInfo?.totalSlides) return;
    setSelectedSlides(
      new Set(Array.from({ length: fileInfo.totalSlides }, (_, i) => i + 1))
    );
  }

  function deselectAllSlides() {
    setSelectedSlides(new Set());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal — wider for the page grid */}
      <div className={`relative z-10 w-full mx-4 bg-white dark:bg-[#141721] rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
        step === "page-select" ? "max-w-5xl" : "max-w-3xl"
      } transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#181B26] shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 shrink-0">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">
                Convert to Flashcards
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5 truncate max-w-75">
                {attachmentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-[#F0F2F8] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── Idle State ── */}
          {step === "idle" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mb-5">
                <FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8] mb-2">
                Ready to Generate
              </h3>
              <p className="text-sm text-slate-500 dark:text-[#8B92A5] max-w-sm mb-6">
                We'll automatically scan <strong>{attachmentName}</strong> to extract key terms, definitions, and important concepts into study flashcards.
              </p>
              <button
                onClick={handleStartGenerate}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-all shadow-sm cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                Generate Flashcards
              </button>
            </div>
          )}

          {/* ── Inspecting State ── */}
          {step === "inspecting" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-700 dark:text-[#F0F2F8]">
                Reading file structure...
              </p>
              <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-1">
                Counting pages / slides
              </p>
            </div>
          )}

          {/* ── Page / Slide Selector ── */}
          {step === "page-select" && fileInfo && (
            <div>
              {/* ── PDF: Visual Page Thumbnail Grid ── */}
              {fileInfo.fileType === "pdf" && fileInfo.totalPages && (
                <div>
                  {/* Section header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 shrink-0">
                        <FileSliders className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
                          Select Pages
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
                          Click pages to select which ones to convert ({fileInfo.totalPages} pages total)
                        </p>
                      </div>
                    </div>
                    {/* Select / Deselect controls */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 dark:text-[#8B92A5] tabular-nums">
                        {selectedPages.size} of {fileInfo.totalPages}
                      </span>
                      <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-[#1E2132] p-1">
                        <button
                          onClick={selectAllPages}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            selectedPages.size === fileInfo.totalPages
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-700 dark:hover:text-white"
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={deselectAllPages}
                          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                            selectedPages.size === 0
                              ? "bg-slate-500 text-white shadow-sm"
                              : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-700 dark:hover:text-white"
                          }`}
                        >
                          None
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Page Thumbnail Grid */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#1A1D27] p-4">
                    {pdfUrl ? (
                      <Document
                        file={pdfUrl}
                        loading={
                          <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                          </div>
                        }
                        error={
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                            <p className="text-sm text-slate-500 dark:text-[#8B92A5]">
                              Could not load page previews. You can still generate flashcards from all pages.
                            </p>
                          </div>
                        }
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin">
                          {Array.from({ length: fileInfo.totalPages! }, (_, i) => (
                            <PageThumbnail
                              key={i + 1}
                              pageNumber={i + 1}
                              isSelected={selectedPages.has(i + 1)}
                              onToggle={togglePage}
                            />
                          ))}
                        </div>
                      </Document>
                    ) : (
                      /* Fallback: show grid without thumbnails if URL isn't available */
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[55vh] overflow-y-auto pr-1">
                        {Array.from({ length: fileInfo.totalPages! }, (_, i) => {
                          const pageNum = i + 1;
                          const isSelected = selectedPages.has(pageNum);
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => togglePage(pageNum)}
                              className={`relative flex flex-col items-center justify-center rounded-xl border-2 aspect-3/4 transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm"
                                  : "border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1E2132] hover:border-slate-300 dark:hover:border-white/10"
                              }`}
                            >
                              <FileText className={`h-6 w-6 mb-1 transition-colors ${
                                isSelected ? "text-emerald-500" : "text-slate-300 dark:text-white/15"
                              }`} />
                              <span className={`text-xs font-bold ${
                                isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400 dark:text-[#8B92A5]"
                              }`}>
                                {pageNum}
                              </span>
                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500">
                                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selection summary */}
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-slate-400 dark:text-[#8B92A5]">
                      Generating from{" "}
                      <span className="font-bold text-slate-600 dark:text-[#F0F2F8]">
                        {selectedPages.size} page{selectedPages.size !== 1 ? "s" : ""}
                      </span>{" "}
                      of {fileInfo.totalPages}.
                    </p>
                    {/* Skip link */}
                    <button
                      onClick={() => runGenerate(null)}
                      className="text-xs text-slate-400 dark:text-[#8B92A5] hover:text-slate-600 dark:hover:text-[#F0F2F8] underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      Use all pages instead
                    </button>
                  </div>
                </div>
              )}

              {/* ── PPTX: slide checkbox grid (unchanged) ── */}
              {fileInfo.fileType === "pptx" && fileInfo.totalSlides && (
                <div>
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 shrink-0">
                      <FileSliders className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
                        Select Slides
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
                        Choose which slides to extract flashcards from ({fileInfo.totalSlides} slides total)
                      </p>
                    </div>
                  </div>

                  {/* Select All / Deselect All */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider">
                      {selectedSlides.size} of {fileInfo.totalSlides} selected
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllSlides}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300 dark:text-white/20">|</span>
                      <button
                        onClick={deselectAllSlides}
                        className="text-xs font-bold text-slate-400 dark:text-[#8B92A5] hover:underline cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Slide grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {Array.from({ length: fileInfo.totalSlides }, (_, i) => {
                      const slideNum = i + 1;
                      const isSelected = selectedSlides.has(slideNum);
                      const title = fileInfo.slideTitles?.[i];
                      return (
                        <button
                          key={slideNum}
                          onClick={() => toggleSlide(slideNum)}
                          className={`flex items-center gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-emerald-500/70 bg-emerald-50 dark:bg-emerald-950/30"
                              : "border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1A1D27] hover:border-slate-300 dark:hover:border-white/10"
                          }`}
                        >
                          {/* Checkbox */}
                          <div
                            className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border-2 transition-colors ${
                              isSelected
                                ? "bg-emerald-500 border-emerald-500"
                                : "border-slate-300 dark:border-white/20"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="h-2.5 w-2.5 text-white"
                                fill="none"
                                viewBox="0 0 12 12"
                              >
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span
                              className={`text-xs font-bold uppercase tracking-wider ${
                                isSelected
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-slate-400 dark:text-[#8B92A5]"
                              }`}
                            >
                              Slide {slideNum}
                            </span>
                            {title && (
                              <p
                                className={`text-xs truncate mt-0.5 font-medium ${
                                  isSelected
                                    ? "text-emerald-900 dark:text-emerald-200"
                                    : "text-slate-600 dark:text-[#F0F2F8]"
                                }`}
                              >
                                {title}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Skip link */}
                  <div className="mt-5 text-center">
                    <button
                      onClick={() => runGenerate(null)}
                      className="text-xs text-slate-400 dark:text-[#8B92A5] hover:text-slate-600 dark:hover:text-[#F0F2F8] underline underline-offset-2 cursor-pointer transition-colors"
                    >
                      Use all slides instead
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Loading State ── */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-700 dark:text-[#F0F2F8]">
                Scanning document...
              </p>
              <p className="text-xs text-slate-400 dark:text-[#8B92A5] mt-1">
                Extracting terms, definitions, and slide content
              </p>
            </div>
          )}

          {/* ── Error State ── */}
          {step === "error" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 mb-4">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8] mb-1">
                Could Not Generate
              </h3>
              <p className="text-sm text-slate-500 dark:text-[#8B92A5] max-w-sm mb-5">
                {errorMessage}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleStartGenerate}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-all cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 dark:border-white/10 px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-[#8B92A5] hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ── Preview State (Editable Cards) ── */}
          {(step === "preview" || step === "saving") && (
            <div>
              {/* Deck Title Input */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-500 dark:text-[#8B92A5] uppercase tracking-wider mb-1.5">
                  Flashcard Title
                </label>
                <input
                  type="text"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-4 py-2.5 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none focus:border-emerald-500 transition-colors"
                  placeholder="Enter flashcard title..."
                />
              </div>

              {/* Stats bar */}
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-[#8B92A5]">
                  <Layers className="h-3.5 w-3.5" />
                  {cards.length} card{cards.length !== 1 ? "s" : ""} generated
                </span>
                {errorMessage && (
                  <span className="text-xs text-red-500">{errorMessage}</span>
                )}
              </div>

              {/* Card List */}
              <div className="space-y-3 mb-4">
                {cards.map((card, index) => (
                  <div
                    key={index}
                    className={`rounded-xl border transition-all ${
                      editingIndex === index
                        ? "border-emerald-500/50 bg-emerald-500/3 dark:bg-emerald-500/5 shadow-sm"
                        : "border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1A1D27]"
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-[#8B92A5] uppercase tracking-wider shrink-0">
                          Card {index + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setEditingIndex(
                                editingIndex === index ? null : index
                              )
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-[#F0F2F8] transition cursor-pointer"
                            title="Edit card"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteCard(index)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition cursor-pointer"
                            title="Remove card"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {editingIndex === index ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                              Front (Question / Term)
                            </label>
                            <textarea
                              value={card.front}
                              onChange={(e) =>
                                updateCard(index, "front", e.target.value)
                              }
                              rows={2}
                              className="w-full rounded-lg border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none focus:border-emerald-500 resize-none transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                              Back (Answer / Definition)
                            </label>
                            <textarea
                              value={card.back}
                              onChange={(e) =>
                                updateCard(index, "back", e.target.value)
                              }
                              rows={3}
                              className="w-full rounded-lg border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none focus:border-emerald-500 resize-none transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                              Hint (Optional)
                            </label>
                            <textarea
                              value={card.hint || ""}
                              onChange={(e) =>
                                updateCard(index, "hint", e.target.value)
                              }
                              rows={1}
                              className="w-full rounded-lg border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none focus:border-emerald-500 resize-none transition-colors"
                              placeholder="Add a helpful hint..."
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/60 uppercase tracking-wider">
                              Front
                            </span>
                            <p className="text-sm text-slate-800 dark:text-[#F0F2F8] mt-0.5 line-clamp-2">
                              {card.front || (
                                <span className="italic text-slate-400">
                                  Empty
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/60 uppercase tracking-wider">
                              Back
                            </span>
                            <p className="text-sm text-slate-600 dark:text-[#8B92A5] mt-0.5 line-clamp-3">
                              {card.back || (
                                <span className="italic text-slate-400">
                                  Empty
                                </span>
                              )}
                            </p>
                          </div>
                          {card.hint && (
                            <div>
                              <span className="text-[10px] font-bold text-amber-600/70 dark:text-amber-400/60 uppercase tracking-wider">
                                Hint
                              </span>
                              <p className="text-sm text-amber-700/80 dark:text-amber-300/80 mt-0.5 italic">
                                {card.hint}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Card button */}
              <button
                onClick={addCard}
                className="flex items-center gap-2 w-full justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 py-3 text-sm font-medium text-slate-400 dark:text-[#8B92A5] hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/2 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Card Manually
              </button>
            </div>
          )}

          {/* ── Done State ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 mb-5">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8] mb-2">
                Deck Saved!
              </h3>
              <p className="text-sm text-slate-500 dark:text-[#8B92A5] max-w-sm mb-6">
                Your flashcard deck &ldquo;<strong>{deckTitle}</strong>&rdquo;
                with {cards.length} cards has been saved to your library.
              </p>
              <div className="flex gap-3">
                <a
                  href={`/${instituteCode}/flashcards`}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-all cursor-pointer"
                >
                  <Layers className="h-4 w-4" />
                  Go to Flashcards
                </a>
                <button
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 dark:border-white/10 px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-[#8B92A5] hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {/* Page-select step footer */}
        {step === "page-select" && fileInfo && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#181B26] shrink-0">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-slate-600 dark:text-[#8B92A5] hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSelection}
              disabled={
                (fileInfo.fileType === "pdf" && selectedPages.size === 0) ||
                (fileInfo.fileType === "pptx" && selectedSlides.size === 0)
              }
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-5 py-2 text-sm font-semibold text-white transition-all shadow-sm cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
              Generate from Selection
              {fileInfo.fileType === "pdf" && selectedPages.size > 0 && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                  {selectedPages.size}
                </span>
              )}
              {fileInfo.fileType === "pptx" && selectedSlides.size > 0 && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                  {selectedSlides.size}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Preview / saving footer */}
        {(step === "preview" || step === "saving") && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#181B26] shrink-0">
            <p className="text-xs text-slate-400 dark:text-[#8B92A5]">
              Review and edit your cards before saving
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-slate-600 dark:text-[#8B92A5] hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  step === "saving" ||
                  cards.length === 0 ||
                  !deckTitle.trim()
                }
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all shadow-sm cursor-pointer"
              >
                {step === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Deck ({cards.length})
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
