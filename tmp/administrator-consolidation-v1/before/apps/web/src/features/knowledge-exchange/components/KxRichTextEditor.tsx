"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  Bold,
  Italic,
  Code,
  List,
  Quote,
  Link as LinkIcon,
  Eye,
  Edit3,
  Sigma,
  FileCode,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  UploadCloud,
} from "lucide-react";
import { marked } from "marked";
import KxCodeBlock from "./KxCodeBlock";
import KxLatexRenderer from "./KxLatexRenderer";

interface KxRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
}

export default function KxRichTextEditor({
  value,
  onChange,
  placeholder = "Describe your question or discussion in detail (supports Markdown, code blocks, images, and LaTeX math $...$)...",
  minHeight = "min-h-[220px]",
  disabled = false,
}: KxRichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertSnippet = (prefix: string, suffix = "", defaultText = "") => {
    if (disabled) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = value.substring(start, end) || defaultText;
    const replacement = `${prefix}${selection}${suffix}`;
    const newValue =
      value.substring(0, start) + replacement + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selection.length
      );
    }, 0);
  };

  const insertImageMarkdown = (fileName: string, url: string) => {
    const textarea = textareaRef.current;
    const safeAlt = fileName.replace(/[\[\]]/g, "").trim() || "image";
    const imageTag = `\n![${safeAlt}](${url})\n`;

    if (!textarea) {
      onChange(value ? `${value.trimEnd()}\n${imageTag}` : imageTag.trim());
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const newValue = value.substring(0, start) + imageTag + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursor = start + imageTag.length;
      textarea.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const uploadImageFile = async (file: File) => {
    if (disabled || isUploading) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Only image files (PNG, JPG, GIF, WEBP) are supported.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("Image must be smaller than 25 MB.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to upload image.");
      }

      if (data?.url) {
        insertImageMarkdown(file.name, data.url);
      } else {
        throw new Error("Invalid response from upload server.");
      }
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          uploadImageFile(file);
          return;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (disabled || isUploading) return;
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled || isUploading) return;
    e.preventDefault();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        uploadImageFile(file);
      }
    }
  };

  // Pre-process markdown and extract code blocks so they can be rendered with KxCodeBlock
  const previewContent = useMemo(() => {
    if (!value.trim()) {
      return (
        <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500 italic">
          Nothing to preview yet. Start typing in the Write tab!
        </div>
      );
    }

    // Split value into code blocks vs markdown sections
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    let partIdx = 0;
    while ((match = codeBlockRegex.exec(value)) !== null) {
      if (match.index > lastIndex) {
        const textChunk = value.substring(lastIndex, match.index);
        const parsedHtml = marked.parse(textChunk, { breaks: true, gfm: true }) as string;
        parts.push(
          <div
            key={`md-${partIdx++}`}
            className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 prose-img:rounded-xl prose-img:border prose-img:border-slate-200 dark:prose-img:border-white/10 prose-img:max-h-60 sm:prose-img:max-h-72 prose-img:max-w-xs sm:prose-img:max-w-sm prose-img:w-auto prose-img:h-auto prose-img:object-contain prose-img:shadow-xs prose-img:my-2.5 prose-img:cursor-zoom-in"
          >
            <KxLatexRenderer content={parsedHtml} />
          </div>
        );
      }

      const lang = match[1] || "code";
      const code = match[2];
      parts.push(
        <KxCodeBlock key={`code-${partIdx++}`} language={lang} code={code} />
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < value.length) {
      const textChunk = value.substring(lastIndex);
      const parsedHtml = marked.parse(textChunk, { breaks: true, gfm: true }) as string;
      parts.push(
        <div
          key={`md-${partIdx++}`}
          className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 prose-img:rounded-xl prose-img:border prose-img:border-slate-200 dark:prose-img:border-white/10 prose-img:max-h-[450px] prose-img:object-contain prose-img:shadow-xs"
        >
          <KxLatexRenderer content={parsedHtml} />
        </div>
      );
    }

    return <div className="space-y-3">{parts}</div>;
  }, [value]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151924] shadow-xs overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/30 transition-all">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            uploadImageFile(file);
          }
          e.target.value = "";
        }}
      />

      {/* Tab bar & Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] px-3 py-2 gap-2">
        {/* Write / Preview Tab Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-200/60 dark:bg-white/5 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "write"
                ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeTab === "preview"
                ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview</span>
          </button>
        </div>

        {/* Formatting Actions */}
        {activeTab === "write" && (
          <div className="flex items-center flex-wrap gap-0.5 text-slate-600 dark:text-slate-400">
            <button
              type="button"
              disabled={disabled}
              onClick={() => insertSnippet("**", "**", "bold text")}
              title="Bold (**text**)"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => insertSnippet("*", "*", "italic text")}
              title="Italic (*text*)"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <Italic className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-1" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => insertSnippet("`", "`", "code")}
              title="Inline Code (`code`)"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <Code className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                insertSnippet("```python\n", "\n```", "# code here")
              }
              title="Code Block (```python...```)"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <FileCode className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => insertSnippet("$", "$", "E = mc^2")}
              title="Inline LaTeX Math ($formula$)"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors font-mono font-bold text-xs"
            >
              <Sigma className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-1" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => insertSnippet("- ", "", "List item")}
              title="Bulleted List (- item)"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => insertSnippet("> ", "", "Quote text")}
              title="Quote (> quote)"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <Quote className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                insertSnippet("[", "](https://example.com)", "link title")
              }
              title="Hyperlink ([text](url))"
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-1" />
            {/* Image Upload Button */}
            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              title="Upload & attach image (or paste / drag & drop)"
              className={`p-1.5 rounded transition-colors ${
                isUploading
                  ? "bg-orange-500/10 text-orange-500"
                  : "hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 border-b border-red-500/20 text-red-600 dark:text-red-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-red-500 hover:text-red-700 font-bold ml-2 text-sm leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Editor Content */}
      {activeTab === "write" ? (
        <div
          className="relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full bg-transparent px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono resize-y outline-none ${minHeight} leading-relaxed`}
          />

          {/* Drag and drop overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-orange-500/10 dark:bg-orange-500/20 backdrop-blur-xs border-2 border-dashed border-orange-500 rounded-lg flex flex-col items-center justify-center pointer-events-none z-10 text-orange-600 dark:text-orange-400 font-medium text-sm gap-1.5">
              <UploadCloud className="h-8 w-8 animate-bounce" />
              <span>Drop image here to upload and attach</span>
            </div>
          )}

          {/* Uploading indicator */}
          {isUploading && (
            <div className="absolute top-2 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-semibold shadow-md pointer-events-none z-10 animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Uploading image...</span>
            </div>
          )}
        </div>
      ) : (
        <div className={`p-4 overflow-y-auto ${minHeight} bg-slate-50/30 dark:bg-black/20`}>
          {previewContent}
        </div>
      )}

      {/* Footer info */}
      <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-white/5 bg-slate-50/40 dark:bg-white/[0.01] px-4 py-2 text-[11px] text-slate-400 dark:text-slate-500">
        <span>Markdown, LaTeX ($...$), Code blocks, and Image attachments supported</span>
        <span>{value.length} characters</span>
      </div>
    </div>
  );
}
