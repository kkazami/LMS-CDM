"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "@/components/common/Toast";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { SubmissionDTO } from "@/lib/practicum/dto";
import {
  MIME_BY_EXTENSION,
  UPLOAD_RULES,
  formatBytes,
  getExtension,
  parseVideoLink,
  practicumPathPrefix,
  validateUpload,
  type SubmissionType,
} from "@/lib/practicum/rules";
import { practicumFetch } from "./shared";

export type UploadTarget =
  | { kind: "new"; placementId: string; type: SubmissionType }
  | { kind: "resubmit"; submission: SubmissionDTO };

interface UploadDialogProps {
  target: UploadTarget;
  uploadsConfigured: boolean;
  onClose: () => void;
  onDone: (submission?: SubmissionDTO) => void;
}

const SINGULAR: Record<SubmissionType, string> = {
  LESSON_PLAN: "lesson plan",
  DEMO_VIDEO: "demo video",
  PORTFOLIO_EVIDENCE: "portfolio evidence",
};

const inputClass =
  "w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] placeholder:text-slate-500 dark:placeholder:text-[#94A3B8] outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

function createClientIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeUploadFileName(fileName: string): string {
  const base = (fileName.split(/[\\/]/).pop() ?? "file").replace(/[^A-Za-z0-9._-]/g, "_");
  return base || "file";
}

/**
 * New submission / resubmission dialog with client-side Vercel Blob upload and idempotency support.
 */
export default function UploadDialog({ target, uploadsConfigured, onClose, onDone }: UploadDialogProps) {
  const isResubmit = target.kind === "resubmit";
  const type: SubmissionType = isResubmit ? target.submission.type : target.type;
  const placementId = isResubmit ? target.submission.placementId : target.placementId;
  const rule = UPLOAD_RULES[type];

  const [idempotencyKey] = useState<string>(() => createClientIdempotencyKey());
  const [title, setTitle] = useState(isResubmit ? target.submission.title : "");
  const [description, setDescription] = useState(isResubmit ? target.submission.description ?? "" : "");
  const [source, setSource] = useState<"file" | "link">(
    type === "DEMO_VIDEO" && !uploadsConfigured ? "link" : "file"
  );
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [videoLink, setVideoLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const submittingRef = useRef(false);

  const requestClose = () => {
    if (!busy && !submittingRef.current) onClose();
  };
  useDialogA11y(true, requestClose, panelRef);

  const acceptAttr = rule.extensions.map((e) => `.${e}`).join(",");
  const fileUnavailable = source === "file" && !uploadsConfigured;
  const fileOptional = !isResubmit && type === "LESSON_PLAN";

  function handleSelectedFile(picked: File | null) {
    setError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    const ext = getExtension(picked.name);
    const rawMime = (picked.type || "").trim().toLowerCase();
    const effectiveMime =
      !rawMime || rawMime === "application/octet-stream" ? MIME_BY_EXTENSION[ext] ?? rawMime : rawMime;
    const check = validateUpload(type, picked.name, effectiveMime || null, picked.size);
    if (!check.ok) {
      setFile(null);
      setError(check.reason);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(picked);
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    handleSelectedFile(picked);
  }

  function onDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy || submittingRef.current) return;
    const dropped = event.dataTransfer.files?.[0] ?? null;
    handleSelectedFile(dropped);
  }

  function removeSelectedFile() {
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function cancelUpload() {
    abortRef.current?.abort();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || submittingRef.current) return;
    setError(null);

    if (!title.trim()) {
      setError("Enter a title.");
      return;
    }

    if (source === "link") {
      const parsed = parseVideoLink(videoLink);
      if (!parsed.ok) {
        setError(parsed.reason);
        return;
      }

      submittingRef.current = true;
      setBusy(true);
      try {
        const payload = {
          title: title.trim(),
          description: description.trim() || undefined,
          videoLink: parsed.url,
        };
        const res = isResubmit
          ? await practicumFetch<{ submission: SubmissionDTO }>(
              `/api/practicum/submissions/${target.submission.id}`,
              {
                method: "PATCH",
                body: JSON.stringify(payload),
              }
            )
          : await practicumFetch<{ submission: SubmissionDTO }>("/api/practicum/submissions", {
              method: "POST",
              body: JSON.stringify({ ...payload, placementId, type }),
            });
        setTitle("");
        setDescription("");
        setVideoLink("");
        toast.success(isResubmit ? "Resubmitted" : "Submitted", "Your supervisor has been notified.");
        onDone(res.submission);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      } finally {
        submittingRef.current = false;
        setBusy(false);
      }
      return;
    }

    if (file) {
      if (!uploadsConfigured) {
        setError("File uploads are not configured.");
        return;
      }
      const ext = getExtension(file.name);
      const rawMime = (file.type || "").trim().toLowerCase();
      const effectiveMime =
        !rawMime || rawMime === "application/octet-stream" ? MIME_BY_EXTENSION[ext] ?? rawMime : rawMime;
      const check = validateUpload(type, file.name, effectiveMime || null, file.size);
      if (!check.ok) {
        setError(check.reason);
        return;
      }
    } else if (!fileOptional) {
      if (!uploadsConfigured) {
        setError("File uploads are not configured.");
        return;
      }
      setError("Choose a file to upload.");
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      if (description.trim()) {
        formData.append("description", description.trim());
      }
      formData.append("placementId", placementId);
      formData.append("type", type);
      formData.append("idempotencyKey", idempotencyKey);
      if (isResubmit) {
        formData.append("submissionId", target.submission.id);
      }
      if (file) {
        const ext = getExtension(file.name);
        const rawMime = (file.type || "").trim().toLowerCase();
        const effectiveMime =
          !rawMime || rawMime === "application/octet-stream" ? MIME_BY_EXTENSION[ext] ?? rawMime : rawMime;
        const pathname = `${practicumPathPrefix(placementId)}${safeUploadFileName(file.name)}`;
        const blob = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/practicum/upload",
          clientPayload: JSON.stringify({ placementId, type }),
          multipart: type === "DEMO_VIDEO",
          contentType: effectiveMime || undefined,
          abortSignal: controller.signal,
        });
        formData.append("fileUrl", blob.url);
        formData.append("fileName", file.name);
      }

      const response = await fetch("/api/practicum/lesson-plans", {
        method: "POST",
        headers: {
          "x-idempotency-key": idempotencyKey,
        },
        body: formData,
        signal: controller.signal,
      });

      const data = (await response.json().catch(() => null)) as {
        success?: boolean;
        lessonPlan?: SubmissionDTO;
        submission?: SubmissionDTO;
        error?: string;
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          data?.error || data?.message || "Could not save the lesson plan. Please try again."
        );
      }

      const createdItem = data?.lessonPlan ?? data?.submission;
      setTitle("");
      setDescription("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success(isResubmit ? "Resubmitted" : "Submitted", "Your supervisor has been notified.");
      onDone(createdItem);
    } catch (err) {
      if (controller.signal.aborted) {
        setError("Upload cancelled. You can try again.");
      } else {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Could not save the lesson plan. Please try again."
        );
      }
    } finally {
      submittingRef.current = false;
      setBusy(false);
      abortRef.current = null;
    }
  }

  const heading = isResubmit ? `Resubmit ${SINGULAR[type]}` : `New ${SINGULAR[type]}`;
  const maxMb = Math.round((rule.maxBytes / (1024 * 1024)) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={requestClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-dialog-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#141721] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 id="upload-dialog-title" className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
            {heading}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            disabled={busy}
            aria-label="Close"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-[#94A3B8] dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label htmlFor="practicum-title" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
              Title
            </label>
            <input
              id="practicum-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={busy}
              className={inputClass}
              placeholder={`Title of your ${SINGULAR[type]}`}
              required
            />
          </div>

          <div>
            <label htmlFor="practicum-description" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
              Description <span className="font-normal text-slate-600 dark:text-[#94A3B8]">(optional)</span>
            </label>
            <textarea
              id="practicum-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
              rows={3}
              disabled={busy}
              className={inputClass}
            />
          </div>

          {type === "DEMO_VIDEO" && (
            <div role="radiogroup" aria-label="Video source" className="flex gap-2">
              {(["file", "link"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={source === option}
                  disabled={busy}
                  onClick={() => {
                    setSource(option);
                    setError(null);
                  }}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium ${
                    source === option
                      ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-[#D1D5DB] dark:hover:bg-white/5"
                  }`}
                >
                  {option === "file" ? "Upload a video" : "Paste a video link"}
                </button>
              ))}
            </div>
          )}

          {source === "link" ? (
            <div>
              <label htmlFor="practicum-link" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                Video link
              </label>
              <input
                id="practicum-link"
                type="url"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                disabled={busy}
                className={inputClass}
                placeholder="https://www.youtube.com/watch?v=…"
                inputMode="url"
              />
              <p className="mt-1 text-xs text-slate-600 dark:text-[#94A3B8]">
                Use an unlisted link your supervisor can open. It must start with https://.
              </p>
            </div>
          ) : fileUnavailable ? (
            <p
              role="status"
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
            >
              File uploads are not configured.
              {type === "DEMO_VIDEO" ? " You can still paste a video link instead." : ""}
            </p>
          ) : (
            <div>
              <label htmlFor="practicum-file" className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                File {fileOptional && <span className="font-normal text-slate-600 dark:text-[#94A3B8]">(optional)</span>}
              </label>

              {file ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 dark:border-white/15 dark:bg-[#1E2132]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <FileText className="h-5 w-5 shrink-0 text-blue-500" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-[#F0F2F8]">{file.name}</p>
                      <p className="text-xs text-slate-600 dark:text-[#94A3B8]">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    disabled={busy}
                    aria-label="Remove selected file"
                    className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-[#94A3B8] dark:hover:bg-white/10 dark:hover:text-[#F0F2F8]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="practicum-file"
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!busy) setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
                    dragging
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-300 hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5"
                  }`}
                >
                  <UploadCloud className="h-6 w-6 text-slate-500 dark:text-[#94A3B8]" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                    Choose a file or drag and drop
                  </span>
                  <span className="text-xs text-slate-600 dark:text-[#94A3B8]">
                    {rule.extensions.map((e) => e.toUpperCase()).join(", ")} · up to {maxMb} MB
                  </span>
                </label>
              )}

              <input
                ref={fileInputRef}
                id="practicum-file"
                type="file"
                accept={acceptAttr}
                onChange={onFileChange}
                disabled={busy}
                className="sr-only"
              />
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            {busy && source === "file" ? (
              <button
                type="button"
                onClick={cancelUpload}
                className="min-h-11 cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:text-[#F0F2F8] dark:hover:bg-white/5"
              >
                Cancel upload
              </button>
            ) : (
              <button
                type="button"
                onClick={requestClose}
                disabled={busy}
                className="min-h-11 cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-[#F0F2F8] dark:hover:bg-white/5"
              >
                Close
              </button>
            )}
            <button
              type="submit"
              disabled={busy || !title.trim() || (fileUnavailable && !fileOptional)}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {busy ? "Uploading…" : error ? "Retry" : isResubmit ? "Resubmit" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
