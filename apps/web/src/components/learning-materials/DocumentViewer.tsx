"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2, ChevronLeft, ChevronRight, MessageSquare, ZoomIn, ZoomOut, Download, FileText } from "lucide-react";

// Initialize pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
}

export default function DocumentViewer({ url, attachmentId, userId, type, fileName }: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
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
  const fileExt = (fileName || url).split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '');
  const isOffice = ['pptx', 'docx', 'xlsx', 'ppt', 'doc', 'xls'].includes(fileExt || '');
  const isText = ['txt', 'csv'].includes(fileExt || '');
  
  // If it's a link, we assume it's NOT a PDF. If it's a file, default to PDF if not something else.
  const isPdf = !isLink && !isImage && !isOffice && !isText;

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

  // Is local relative url?
  const isLocalUrl = url.startsWith('/');
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  const requiresPublicUrlForOffice = isOffice && (isLocalUrl || isLocalhost);

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
      <div className="flex-1 flex flex-col rounded-3xl bg-gray-50 border border-gray-200 overflow-hidden shadow-inner">
        {/* Toolbar - Only show pagination and zoom for PDFs */}
        <div className="flex items-center justify-between bg-white px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {isPdf && (
              <>
                <button
                  onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                  disabled={pageNumber <= 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-gray-700"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm font-semibold text-gray-700">
                  Page {pageNumber} of {numPages || "--"}
                </span>
                <button
                  onClick={() => setPageNumber(Math.min(numPages || 1, pageNumber + 1))}
                  disabled={pageNumber >= (numPages || 1)}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-gray-700"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            {!isPdf && (
              <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100 text-gray-700"
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100 text-gray-700"
                title="Open Link in New Tab"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-semibold hidden sm:inline">Open</span>
              </a>
            )}
            
            <div className="w-px h-6 bg-gray-200 mx-1" />

            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                showNotes ? "bg-indigo-100 text-indigo-700" : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-semibold hidden sm:inline">Notes</span>
            </button>
            
            {isPdf && (
              <>
                <div className="w-px h-6 bg-gray-200 mx-1" />
                <button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-700">
                  <ZoomOut className="h-5 w-5" />
                </button>
                <span className="text-sm font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale((s) => Math.min(3, s + 0.1))} className="p-2 rounded-lg hover:bg-gray-100 text-gray-700">
                  <ZoomIn className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Content Container */}
        <div 
          className="flex-1 overflow-auto flex relative bg-gray-100"
          ref={containerRef}
          onMouseUp={handleSelection}
        >
          {/* 1. Link (YouTube) */}
          {isLink && youtubeUrl && (
            <div className="w-full h-full p-4">
              <iframe
                src={youtubeUrl}
                className="w-full h-full rounded-2xl shadow-sm border border-gray-200"
                allowFullScreen
              />
            </div>
          )}

          {/* 2. Link (General Website) */}
          {isLink && !youtubeUrl && (
            <div className="w-full h-full p-4">
              <iframe
                src={url}
                className="w-full h-full rounded-2xl shadow-sm border border-gray-200 bg-white"
              />
            </div>
          )}

          {/* 3. Text Files */}
          {isText && (
            <div className="w-full h-full p-6 bg-white overflow-y-auto">
              {textContent ? (
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans max-w-4xl mx-auto leading-relaxed">
                  {textContent}
                </pre>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
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
                className="max-w-full max-h-full object-contain rounded-xl shadow-sm border border-gray-200 bg-white"
              />
            </div>
          )}

          {/* 5. Office Files (Localhost fallback) */}
          {isOffice && requiresPublicUrlForOffice && (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 max-w-md">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Download to View</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Microsoft Office Viewer requires a public URL to render PowerPoints and Word documents. Since you are running locally, please download the file to view it.
                </p>
                <a 
                  href={url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition-colors shadow-md"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </a>
              </div>
            </div>
          )}

          {/* 6. Office Files (Production Public URL) */}
          {isOffice && !requiresPublicUrlForOffice && (
            <div className="w-full h-full">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
                className="w-full h-full border-0 bg-white"
                title={fileName}
              />
            </div>
          )}

          {/* 7. PDF Document */}
          {isPdf && (
            <div className="w-full flex justify-center p-4">
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                  </div>
                }
                className="shadow-md"
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="bg-white"
                />
              </Document>
            </div>
          )}

          {/* Selection Tooltip for Highlighting */}
          {showTooltip && (
            <div 
              className="absolute z-50 -translate-x-1/2 -translate-y-full pb-2"
              style={{ left: tooltipPos.x, top: tooltipPos.y }}
            >
              <div className="flex flex-col gap-3 rounded-xl bg-gray-900 p-3 shadow-xl w-64 border border-gray-700">
                {!isAddingNote ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsAddingNote(true)}
                      className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
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
                      className="w-full resize-none rounded-lg bg-gray-800 p-2 text-xs text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {colors.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedColor(c.id)}
                            className={`h-5 w-5 rounded-full ${c.bg} ${selectedColor === c.id ? `ring-2 ring-white ring-offset-2 ring-offset-gray-900` : ''}`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setIsAddingNote(false); setShowTooltip(false); }} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                        <button onClick={saveAnnotation} className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500">Save</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="absolute left-1/2 bottom-0 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-gray-900 border-r border-b border-gray-700" />
            </div>
          )}
        </div>
      </div>

      {/* Annotations Sidebar */}
      {showNotes && (
        <div className="w-full md:w-80 shrink-0 flex flex-col h-150 md:h-auto rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden animate-in slide-in-from-right-8">
          <div className="bg-gray-50 border-b border-gray-200 px-5 py-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-500" />
            Notes & Highlights
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {annotations.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-500">No notes yet. Select text in the document to add a highlight.</p>
            </div>
          ) : (
            annotations.map((ann) => (
              <div key={ann.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden group">
                <div className={`h-1.5 w-full bg-${ann.color}-400`} />
                <div className="p-3 text-sm">
                  <p className="italic text-gray-600 border-l-2 border-gray-200 pl-2 mb-2 line-clamp-3">"{ann.quote}"</p>
                  {ann.noteContent && (
                    <p className="text-gray-900 font-medium whitespace-pre-wrap">{ann.noteContent}</p>
                  )}
                  <div className="mt-3 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteAnnotation(ann.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold">Delete</button>
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
