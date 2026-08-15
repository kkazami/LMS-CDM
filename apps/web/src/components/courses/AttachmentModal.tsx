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
    <div className="group flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1E2132] px-3 py-2.5 transition-all hover:border-orange-500/30 hover:shadow-xs">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
          isLink
            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20"
            : "bg-orange-500/10 text-[#F97316] group-hover:bg-orange-500/20"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
          {attachment.fileName || attachment.url}
        </p>
        <p className="text-xs text-slate-400 dark:text-[#8B92A5]">
          {isLink ? "Link" : attachment.fileSize ? formatFileSize(attachment.fileSize) : "File"}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-all cursor-pointer"
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

    if (!linkUrl.trim()) {
      setLinkError("Please enter a URL.");
      return;
    }

    if (!isValidUrl(linkUrl.trim())) {
      setLinkError("Please enter a valid URL (starting with http:// or https://).");
      return;
    }

    const newAttachment: AttachmentItem = {
      type: "LINK",
      url: linkUrl.trim(),
      fileName: linkName.trim() || linkUrl.trim(),
    };

    setAttachments((prev) => [...prev, newAttachment]);
    setLinkUrl("");
    setLinkName("");
  };

  const handleRemove = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Save all ───

  const handleSave = () => {
    onSave(attachments);
    handleClose();
  };

  const tabBaseClass =
    "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer";

  return (
    <Modal open={open} title={title} onClose={handleClose}>
      <div className="space-y-5">
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-[#1E2132] p-1 border border-slate-200/80 dark:border-white/5">
          <button
            type="button"
            onClick={() => { setActiveTab("file"); setLinkError(""); }}
            className={`${tabBaseClass} flex items-center justify-center gap-2 ${
              activeTab === "file"
                ? "bg-white dark:bg-[#2A2F45] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("link"); setUploadError(""); }}
            className={`${tabBaseClass} flex items-center justify-center gap-2 ${
              activeTab === "link"
                ? "bg-white dark:bg-[#2A2F45] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
            }`}
          >
            <Link2 className="h-3.5 w-3.5" />
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
              className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 transition-all duration-200 ${
                isDragging
                  ? "border-orange-400 bg-orange-500/10"
                  : "border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] hover:border-orange-500/50 hover:bg-orange-500/5"
              } ${uploading ? "pointer-events-none opacity-60" : ""}`}
            >
              {uploading ? (
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#F97316]" />
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
              <p className="text-sm font-semibold text-slate-700 dark:text-[#F0F2F8]">
                {uploading ? "Uploading..." : "Drag & drop a file here, or click to browse"}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-[#8B92A5]">
                Maximum file size: 25 MB
              </p>
            </div>

            {/* Accepted formats info */}
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-3 py-2.5">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-0.5">Accepted file types:</p>
              <p className="text-[11px] text-blue-600/90 dark:text-blue-300/80 leading-relaxed">
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
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
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
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
                URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => { setLinkUrl(e.target.value); setLinkError(""); }}
                placeholder="https://docs.google.com/document/d/..."
                className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2.5 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400 transition-colors focus:border-orange-500"
                style={{ borderColor: linkError ? "#ef4444" : undefined }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">
                Display name <span className="text-slate-400 dark:text-[#8B92A5] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="e.g. Lecture Notes - Chapter 3"
                className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2.5 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400 transition-colors focus:border-orange-500"
              />
            </div>

            <button
              type="button"
              onClick={handleAddLink}
              className="w-full rounded-xl py-2.5 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
              style={{ backgroundColor: theme.colors.primary }}
            >
              Add Link
            </button>

            {linkError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {linkError}
              </div>
            )}

            {/* Link guidance */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Accepted link types:</p>
              <ul className="space-y-0.5 text-[11px] text-amber-600/90 dark:text-amber-300/80">
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
                Attached ({attachments.length})
              </h4>
            </div>
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl">
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
        <div className="flex gap-2 pt-3 border-t border-slate-200/80 dark:border-white/10">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-xl border border-slate-200 dark:border-white/10 py-2.5 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] transition-colors hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-xs"
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
