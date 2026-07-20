"use client";

import { useState, useRef, useCallback } from "react";
import type { InstituteTheme } from "@/lib/theme";
import Modal from "@/components/common/Modal";
import {
  Upload,
  Link2,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  FileArchive,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

// ─── Types ───

export interface AttachmentItem {
  id?: string;
  type: "FILE" | "LINK";
  url: string;
  fileName: string;
  fileSize?: number;
}

interface AttachmentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (attachments: AttachmentItem[]) => void;
  existingAttachments?: AttachmentItem[];
  theme: InstituteTheme;
  title?: string;
}

// ─── File-type helpers ───

const ACCEPTED_EXTENSIONS =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.txt,.csv";

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  csv: FileSpreadsheet,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  ppt: Presentation,
  pptx: Presentation,
  jpg: ImageIcon,
  jpeg: ImageIcon,
  png: ImageIcon,
  gif: ImageIcon,
  webp: ImageIcon,
  zip: FileArchive,
};

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return FILE_TYPE_ICONS[ext] ?? FileText;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── Sub-components ───

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: AttachmentItem;
  onRemove: () => void;
}) {
  const isLink = attachment.type === "LINK";
  const Icon = isLink ? Link2 : getFileIcon(attachment.fileName);

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2.5 transition-all hover:border-gray-300 hover:shadow-sm">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          isLink
            ? "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
            : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">
          {attachment.fileName || attachment.url}
        </p>
        <p className="text-xs text-gray-400">
          {isLink ? "Link" : attachment.fileSize ? formatFileSize(attachment.fileSize) : "File"}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-md p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        aria-label={`Remove ${attachment.fileName || "attachment"}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Main Component ───

export default function AttachmentModal({
  open,
  onClose,
  onSave,
  existingAttachments = [],
  theme,
  title = "Add Attachments",
}: AttachmentModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "link">("file");
  const [attachments, setAttachments] = useState<AttachmentItem[]>(existingAttachments);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkError, setLinkError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  const handleClose = () => {
    setUploadError("");
    setLinkError("");
    setLinkUrl("");
    setLinkName("");
    setIsDragging(false);
    onClose();
  };

  // ─── File upload ───

  const uploadFile = useCallback(async (file: File) => {
    setUploadError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload failed.");
        return;
      }

      const newAttachment: AttachmentItem = {
        type: "FILE",
        url: data.url,
        fileName: data.fileName,
        fileSize: data.fileSize,
      };

      setAttachments((prev) => [...prev, newAttachment]);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      uploadFile(files[0]);
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      uploadFile(files[0]);
    }
  };

  // ─── Link add ───

  const handleAddLink = () => {
    setLinkError("");
    const trimmedUrl = linkUrl.trim();

    if (!trimmedUrl) {
      setLinkError("Please enter a URL.");
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      setLinkError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    const newAttachment: AttachmentItem = {
      type: "LINK",
      url: trimmedUrl,
      fileName: linkName.trim() || trimmedUrl,
    };

    setAttachments((prev) => [...prev, newAttachment]);
    setLinkUrl("");
    setLinkName("");
  };

  // ─── Remove attachment ───

  const handleRemove = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Save all ───

  const handleSave = () => {
    onSave(attachments);
    handleClose();
  };

  const tabBaseClass =
    "flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200";

  return (
    <Modal open={open} title={title} onClose={handleClose}>
      <div className="space-y-5">
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => { setActiveTab("file"); setLinkError(""); }}
            className={`${tabBaseClass} flex items-center justify-center gap-2 ${
              activeTab === "file"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Upload className="h-4 w-4" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("link"); setUploadError(""); }}
            className={`${tabBaseClass} flex items-center justify-center gap-2 ${
              activeTab === "link"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Link2 className="h-4 w-4" />
            Add Link
          </button>
        </div>

        {/* ─── Upload File Tab ─── */}
        {activeTab === "file" && (
          <div className="space-y-3">
            {/* Drag-and-drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-all duration-200 ${
                isDragging
                  ? "border-indigo-400 bg-indigo-50"
                  : "border-gray-300 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50"
              } ${uploading ? "pointer-events-none opacity-60" : ""}`}
            >
              {uploading ? (
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-indigo-500" />
              ) : (
                <div
                  className="mb-2 flex h-12 w-12 items-center justify-center rounded-full transition-colors"
                  style={{
                    backgroundColor: `${theme.colors.primary}15`,
                    color: theme.colors.primary,
                  }}
                >
                  <Upload className="h-5 w-5" />
                </div>
              )}
              <p className="text-sm font-medium text-gray-700">
                {uploading ? "Uploading..." : "Drag & drop a file here, or click to browse"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Maximum file size: 25 MB
              </p>
            </div>

            {/* Accepted formats info */}
            <div className="rounded-lg bg-blue-50/70 border border-blue-100 px-3 py-2.5">
              <p className="text-xs font-medium text-blue-700 mb-1">Accepted file types:</p>
              <p className="text-xs text-blue-600/80 leading-relaxed">
                PDF, DOCX, PPTX, XLSX, JPG, PNG, GIF, WEBP, ZIP, TXT, CSV
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Upload error */}
            {uploadError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {uploadError}
              </div>
            )}
          </div>
        )}

        {/* ─── Add Link Tab ─── */}
        {activeTab === "link" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => { setLinkUrl(e.target.value); setLinkError(""); }}
                placeholder="https://docs.google.com/document/d/..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                style={{ borderColor: linkError ? "#ef4444" : undefined }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Display name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="e.g. Lecture Notes - Chapter 3"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-colors focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              type="button"
              onClick={handleAddLink}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: theme.colors.primary }}
            >
              Add Link
            </button>

            {linkError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {linkError}
              </div>
            )}

            {/* Link guidance */}
            <div className="rounded-lg bg-amber-50/70 border border-amber-100 px-3 py-2.5">
              <p className="text-xs font-medium text-amber-700 mb-1">Accepted link types:</p>
              <ul className="space-y-0.5 text-xs text-amber-600/80">
                <li>• Google Docs, Sheets, or Slides share link</li>
                <li>• Google Drive file link</li>
                <li>• YouTube video URL</li>
                <li>• Any website or web resource link</li>
              </ul>
            </div>
          </div>
        )}

        {/* ─── Current Attachments ─── */}
        {attachments.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">
                Attached ({attachments.length})
              </h4>
            </div>
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg">
              {attachments.map((att, idx) => (
                <AttachmentChip
                  key={`${att.type}-${att.url}-${idx}`}
                  attachment={att}
                  onRemove={() => handleRemove(idx)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─── Footer Actions ─── */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Done ({attachments.length})
          </button>
        </div>
      </div>
    </Modal>
  );
}
