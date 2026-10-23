"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Loader2, UploadCloud, X } from "lucide-react";
import { toast } from "@/components/common/Toast";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { SubmissionDTO } from "@/lib/practicum/dto";
import {
  UPLOAD_RULES,
  formatBytes,
  isValidUploadPathname,
  parseVideoLink,
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
  onDone: () => void;
}

const SINGULAR: Record<SubmissionType, string> = {
  LESSON_PLAN: "lesson plan",
  DEMO_VIDEO: "demo video",
  PORTFOLIO_EVIDENCE: "portfolio evidence",
};

function safeFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "file";
}

const inputClass =
  "w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] placeholder:text-slate-500 dark:placeholder:text-[#94A3B8] outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

/**
 * New submission / resubmission dialog. Files go straight from the browser to Vercel Blob
 * (never through our API routes); only the resulting URL is sent to the submissions API.
 */
export default function UploadDialog({ target, uploadsConfigured, onClose, onDone }: UploadDialogProps) {
  const isResubmit = target.kind === "resubmit";
  const type: SubmissionType = isResubmit ? target.submission.type : target.type;
  const placementId = isResubmit ? target.submission.placementId : target.placementId;
  const rule = UPLOAD_RULES[type];

  const [title, setTitle] = useState(isResubmit ? target.submission.title : "");
  const [description, setDescription] = useState(isResubmit ? target.submission.description ?? "" : "");
  const [source, setSource] = useState<"file" | "link">(
    type === "DEMO_VIDEO" && !uploadsConfigured ? "link" : "file"
  );
  const [file, setFile] = useState<File | null>(null);
  const [videoLink, setVideoLink] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const requestClose = () => {
    if (!busy) onClose();
  };
  useDialogA11y(true, requestClose, panelRef);

  const acceptAttr = rule.extensions.map((e) => `.${e}`).join(",");
  const fileUnavailable = source === "file" && !uploadsConfigured;

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0] ?? null;
    setError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    const check = validateUpload(type, picked.name, picked.type || null, picked.size);
    if (!check.ok) {
      setFile(null);
      setError(check.reason);
      event.target.value = "";
      return;
    }
    setFile(picked);
  }

  function cancelUpload() {
    abortRef.current?.abort();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    if (!title.trim()) {
      setError("Enter a title.");
      return;
    }

    let payload: Record<string, string | undefined> = {
      title: title.trim(),
      description: description.trim() || undefined,
    };

    if (source === "link") {
      const parsed = parseVideoLink(videoLink);
      if (!parsed.ok) {
        setError(parsed.reason);
        return;
      }
      payload = { ...payload, videoLink: parsed.url };
    } else {
      if (!uploadsConfigured) {
        setError("File uploads are not configured.");
        return;
      }
      if (!file) {
        setError("Choose a file to upload.");
        return;
      }
      const check = validateUpload(type, file.name, file.type || null, file.size);
      if (!check.ok) {
        setError(check.reason);
        return;
      }
    }

    setBusy(true);
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (source === "file" && file) {
        const pathname = `practicum/${placementId}/${safeFileName(file.name)}`;
        if (!isValidUploadPathname(pathname, placementId)) {
          throw new Error("Invalid file name.");
        }
        const blob = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/practicum/upload",
          clientPayload: JSON.stringify({ placementId, type }),
          // Multipart for videos: parallel parts with automatic retries on unstable connections.
          multipart: type === "DEMO_VIDEO",
          contentType: file.type || undefined,
          abortSignal: controller.signal,
          onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
        });
        payload = { ...payload, fileUrl: blob.url, fileName: file.name };
      }

      if (isResubmit) {
        await practicumFetch(`/api/practicum/submissions/${target.submission.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await practicumFetch("/api/practicum/submissions", {
          method: "POST",
          body: JSON.stringify({ ...payload, placementId, type }),
        });
      }

      toast.success(isResubmit ? "Resubmitted" : "Submitted", "Your supervisor has been notified.");
      onDone();
    } catch (err) {
      if (controller.signal.aborted) {
        setError("Upload cancelled. You can try again.");
      } else {
        const message = err instanceof Error ? err.message : "";
        setError(
          message
            ? `${message} Use Retry to try again.`
            : "The upload failed. Check your connection and use Retry to try again."
        );
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  const heading = isResubmit ? `Resubmit ${SINGULAR[type]}` : `New ${SINGULAR[type]}`;

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
                File
              </label>
              <label
                htmlFor="practicum-file"
                className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 dark:border-white/15 dark:hover:bg-white/5"
              >
                <UploadCloud className="h-6 w-6 text-slate-500 dark:text-[#94A3B8]" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
                  {file ? file.name : "Choose a file"}
                </span>
                <span className="text-xs text-slate-600 dark:text-[#94A3B8]">
                  {file
                    ? formatBytes(file.size)
                    : `${rule.extensions.map((e) => e.toUpperCase()).join(", ")} · up to ${formatBytes(rule.maxBytes)}`}
                </span>
              </label>
              <input
                id="practicum-file"
                type="file"
                accept={acceptAttr}
                onChange={onFileChange}
                disabled={busy}
                className="sr-only"
              />
            </div>
          )}

          {busy && source === "file" && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-700 dark:text-[#D1D5DB]">
                <span>Uploading…</span>
                <span className="font-mono tabular-nums">{progress}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
              >
                <div className="h-full rounded-full bg-blue-500 transition-[width]" style={{ width: `${progress}%` }} />
              </div>
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
              disabled={busy || fileUnavailable}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {busy ? "Submitting…" : error ? "Retry" : isResubmit ? "Resubmit" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
