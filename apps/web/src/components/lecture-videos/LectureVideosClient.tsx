"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Edit2,
  FileVideo,
  Film,
  HardDrive,
  Info,
  Link2,
  Loader2,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  Video,
  X,
  Youtube,
} from "lucide-react";
import { ITE_STUDENT_PROGRAM_CODES } from "@/lib/ite-programs/features";
import {
  DRIVE_NOT_TRACKED_NOTE,
  DRIVE_SHARING_NOTE,
  LECTURE_ACCEPT_ATTRIBUTE,
  LECTURE_HINT_TEXT,
  LECTURE_MAX_DESCRIPTION_LENGTH,
  LECTURE_MAX_TITLE_LENGTH,
  LECTURE_MIME_BY_EXTENSION,
  LECTURE_SAVE_INTERVAL_MS,
  LECTURE_SOURCE_LABELS,
  LECTURE_UPLOADS_UNAVAILABLE_MESSAGE,
  accumulateWatchedStep,
  buildLectureBlobPathname,
  filterAndSortFacultyProgressRows,
  formatDurationTimestamp,
  getLectureFileExtension,
  parseExternalLectureUrl,
  validateLectureMetadata,
  validateLectureSignature,
  validateLectureUpload,
  type FacultyLectureProgressReport,
  type FacultyProgressSortField,
  type IteCourseSummary,
  type IteLectureVideoDTO,
  type LectureFileExtension,
  type LectureSourceType,
  type StudentLectureProgressSummary,
} from "@/lib/lecture-videos/lectures";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function probeLocalVideoDuration(file: File): Promise<number> {
  if (typeof document === "undefined" || typeof URL === "undefined") return 0;
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(0);
    }, 5000);
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const d = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      cleanup();
      resolve(Math.round(d * 100) / 100);
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      resolve(0);
    };
    video.src = objectUrl;
  });
}

function SourceBadge({ sourceType }: { sourceType: LectureSourceType }) {
  const label = LECTURE_SOURCE_LABELS[sourceType] ?? "Uploaded";
  if (sourceType === "YOUTUBE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-800/60 bg-red-50/90 dark:bg-red-950/50 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-300">
        <Youtube className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  if (sourceType === "DRIVE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 dark:border-amber-800/60 bg-amber-50/90 dark:bg-amber-950/50 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
        <HardDrive className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 dark:border-sky-800/60 bg-blue-50/90 dark:bg-sky-950/50 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:text-sky-200">
      <Upload className="h-3 w-3 shrink-0" />
      <span>{label}</span>
    </span>
  );
}

// ─── 1. Lecture Card ─────────────────────────────────────────────────────────

export interface LectureVideoCardProps {
  lecture: IteLectureVideoDTO;
  isStudent: boolean;
  onWatch: (lecture: IteLectureVideoDTO) => void;
  onEdit?: (lecture: IteLectureVideoDTO) => void;
  onDelete?: (lecture: IteLectureVideoDTO) => void;
  onOpenProgress?: (lecture: IteLectureVideoDTO) => void;
}

export function LectureVideoCard({
  lecture,
  isStudent,
  onWatch,
  onEdit,
  onDelete,
  onOpenProgress,
}: LectureVideoCardProps) {
  const isTracked = lecture.isProgressTracked && lecture.sourceType !== "DRIVE";
  const progress = isTracked ? lecture.myProgress : null;
  const isCompleted = progress?.status === "COMPLETED";
  const isInProgress = progress?.status === "IN_PROGRESS";
  const percentWatched = progress?.percentWatched ?? 0;
  const hasResumePosition =
    isStudent &&
    isTracked &&
    progress !== null &&
    progress.lastPositionSeconds > 1 &&
    (!lecture.durationSeconds ||
      progress.lastPositionSeconds < lecture.durationSeconds - 2);

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-theme bg-surface hover:border-blue-500/70 dark:hover:border-sky-400/70 p-5 shadow-xs transition-all space-y-4">
      <div className="space-y-3">
        {/* Top badges and Faculty actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-blue-600 to-sky-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs">
              <Video className="h-3 w-3" />
              <span>Lecture</span>
            </span>

            <SourceBadge sourceType={lecture.sourceType} />

            {/* Subject / Course Badge */}
            <span
              title={lecture.courseLabel}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 dark:border-sky-800/60 bg-blue-50/80 dark:bg-sky-950/50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:text-sky-200"
            >
              <BookOpen className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[230px]">
                {lecture.courseLabel}
              </span>
            </span>

            {lecture.durationSeconds > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-theme bg-elevated px-2 py-0.5 text-[11px] font-medium text-secondary-theme">
                <Clock className="h-3 w-3" />
                <span>{formatDurationTimestamp(lecture.durationSeconds)}</span>
              </span>
            )}

            {/* Student "Completed" badge */}
            {isStudent && isTracked && isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 dark:border-emerald-700/60 bg-emerald-100/90 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                <span>Completed</span>
              </span>
            )}
          </div>

          {(lecture.canViewProgress || lecture.canManage) && (
            <div className="flex items-center gap-1 shrink-0">
              {lecture.canViewProgress && onOpenProgress && (
                <button
                  type="button"
                  onClick={() => onOpenProgress(lecture)}
                  title="View student lecture progress"
                  aria-label={`View student progress for ${lecture.title}`}
                  className="rounded-lg p-1.5 text-secondary-theme hover:text-blue-600 dark:hover:text-sky-400 hover:bg-elevated transition cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
              )}
              {lecture.canManage && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(lecture)}
                  title="Edit lecture details"
                  aria-label={`Edit ${lecture.title}`}
                  className="rounded-lg p-1.5 text-secondary-theme hover:text-primary-theme hover:bg-elevated transition cursor-pointer"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              )}
              {lecture.canManage && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(lecture)}
                  title="Delete lecture"
                  aria-label={`Delete ${lecture.title}`}
                  className="rounded-lg p-1.5 text-secondary-theme hover:text-red-600 hover:bg-elevated transition cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Title & Uploader */}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-primary-theme leading-snug">
            {lecture.title}
          </h2>
          <p className="text-[11px] text-secondary-theme mt-0.5">
            Shared by{" "}
            <span className="font-semibold text-primary-theme">
              {lecture.uploadedByName}
            </span>
            {lecture.sourceType === "UPLOAD" && lecture.fileSize
              ? ` • ${formatFileSize(lecture.fileSize)}`
              : ` • ${lecture.sourceLabel}`}
          </p>
        </div>

        {/* Description */}
        {lecture.description && (
          <div className="rounded-xl border border-theme bg-elevated/70 p-3 text-xs text-secondary-theme leading-relaxed">
            {lecture.description}
          </div>
        )}

        {/* Student Progress Bar & "Continue watching" Hint (only for tracked sources: UPLOAD & YOUTUBE) */}
        {isStudent && isTracked && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-secondary-theme">
                {isCompleted
                  ? "Lecture completed"
                  : isInProgress
                    ? "Continue watching"
                    : "Not started yet"}
              </span>
              <span className="font-bold text-primary-theme">
                {percentWatched}% watched
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-elevated border border-theme"
              role="progressbar"
              aria-valuenow={percentWatched}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Viewing progress for ${lecture.title}`}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "bg-emerald-500"
                    : "bg-gradient-to-r from-blue-600 to-sky-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, percentWatched))}%` }}
              />
            </div>
            {hasResumePosition && (
              <p className="text-[11px] font-medium text-blue-700 dark:text-sky-300">
                Continue watching from{" "}
                {formatDurationTimestamp(progress!.lastPositionSeconds)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="pt-3 border-t border-theme flex items-center gap-2">
        <button
          type="button"
          onClick={() => onWatch(lecture)}
          className="group/btn flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all duration-200 focus-visible:outline-2 focus-visible:outline-sky-500 cursor-pointer"
        >
          <Play className="h-3.5 w-3.5 fill-amber-300 text-amber-300 transition-transform duration-200 group-hover/btn:scale-110" />
          <span>
            {hasResumePosition ? "Continue watching" : "Watch lecture"}
          </span>
        </button>
      </div>
    </article>
  );
}

// ─── 2. Upload / Edit Lecture Modal (Faculty/Admin only) ─────────────────────

export interface LectureUploadDialogProps {
  mode: "create" | "edit";
  lecture?: IteLectureVideoDTO | null;
  courses: IteCourseSummary[];
  userId: string;
  uploadsConfigured: boolean;
  onClose: () => void;
  onSaved: (lecture: IteLectureVideoDTO) => void;
}

export function LectureUploadDialog({
  mode,
  lecture,
  courses,
  userId,
  uploadsConfigured,
  onClose,
  onSaved,
}: LectureUploadDialogProps) {
  const [title, setTitle] = useState(lecture?.title ?? "");
  const [courseId, setCourseId] = useState(
    lecture?.courseId ?? courses[0]?.id ?? ""
  );
  const [description, setDescription] = useState(lecture?.description ?? "");
  const [sourceType, setSourceType] = useState<LectureSourceType>(
    lecture?.sourceType ?? "UPLOAD"
  );
  const [externalUrl, setExternalUrl] = useState(lecture?.externalUrl ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [probedDuration, setProbedDuration] = useState<number>(0);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const uncommittedBlobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasCourses = courses.length > 0;

  const cleanupUncommittedBlob = useCallback((blobUrl: string | null) => {
    if (!blobUrl) return;
    uncommittedBlobUrlRef.current = null;
    void fetch("/api/lecture-videos/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl: blobUrl }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handlePageHide = () => {
      if (uncommittedBlobUrlRef.current) {
        cleanupUncommittedBlob(uncommittedBlobUrlRef.current);
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      if (uncommittedBlobUrlRef.current) {
        cleanupUncommittedBlob(uncommittedBlobUrlRef.current);
      }
    };
  }, [cleanupUncommittedBlob]);

  const handlePickFile = async (picked: File | null) => {
    setInlineError(null);
    setFile(null);
    setProbedDuration(0);
    if (!picked) return;

    const check = validateLectureUpload(picked.name, picked.type, picked.size);
    if (!check.ok) {
      setInlineError(check.reason ?? "Invalid video file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const headerBuffer = await picked.slice(0, 16).arrayBuffer();
      const sigCheck = validateLectureSignature(
        picked.name,
        new Uint8Array(headerBuffer)
      );
      if (!sigCheck.ok) {
        setInlineError(
          sigCheck.reason ??
            "The selected file does not match a valid MP4 or WebM video signature."
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    } catch {
      setInlineError("Could not read the selected video file.");
      return;
    }

    setFile(picked);
    const duration = await probeLocalVideoDuration(picked);
    setProbedDuration(duration);
  };

  const handleCancelUpload = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      if (uncommittedBlobUrlRef.current) {
        cleanupUncommittedBlob(uncommittedBlobUrlRef.current);
      }
      setSubmitting(false);
      setUploadPercent(null);
      setInlineError("Upload cancelled.");
    } else {
      if (uncommittedBlobUrlRef.current) {
        cleanupUncommittedBlob(uncommittedBlobUrlRef.current);
      }
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);

    if (!hasCourses) {
      setInlineError("You have no courses yet.");
      return;
    }

    const meta = validateLectureMetadata({
      title,
      description,
      courseId,
    });
    if (!meta.ok) {
      setInlineError(meta.reason);
      return;
    }

    if (mode === "edit" && lecture) {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/lecture-videos/${lecture.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: meta.title,
            description: meta.description,
            courseId: meta.courseId,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          lecture?: IteLectureVideoDTO;
          message?: string;
        };
        if (!res.ok || !data.lecture) {
          throw new Error(data.message || "Failed to update lecture.");
        }
        onSaved(data.lecture);
      } catch (err) {
        setInlineError(
          err instanceof Error ? err.message : "Failed to update lecture."
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Link source types: YOUTUBE or DRIVE
    if (sourceType === "YOUTUBE" || sourceType === "DRIVE") {
      const parsedLink = parseExternalLectureUrl(sourceType, externalUrl);
      if (!parsedLink.ok) {
        setInlineError(parsedLink.reason);
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch("/api/lecture-videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: meta.title,
            description: meta.description,
            courseId: meta.courseId,
            sourceType,
            externalUrl: externalUrl.trim(),
          }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          lecture?: IteLectureVideoDTO;
          message?: string;
        };
        if (!res.ok || !data.lecture) {
          throw new Error(data.message || "Failed to save lecture.");
        }
        onSaved(data.lecture);
      } catch (err) {
        setInlineError(
          err instanceof Error ? err.message : "Failed to save lecture."
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Uploaded video source type
    if (!uploadsConfigured) {
      setInlineError(LECTURE_UPLOADS_UNAVAILABLE_MESSAGE);
      return;
    }

    if (!file) {
      setInlineError("Please select an MP4 or WebM video file to upload.");
      return;
    }

    const fileCheck = validateLectureUpload(file.name, file.type, file.size);
    if (!fileCheck.ok) {
      setInlineError(fileCheck.reason ?? "Invalid video file.");
      return;
    }

    setSubmitting(true);
    setUploadPercent(0);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const ext = getLectureFileExtension(file.name) as LectureFileExtension;
      const contentType = LECTURE_MIME_BY_EXTENSION[ext] || file.type;
      const pathname = buildLectureBlobPathname(userId, file.name);

      let uploadedUrl: string;
      try {
        const blob = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/lecture-videos/upload",
          multipart: true,
          contentType,
          abortSignal: controller.signal,
          onUploadProgress: ({ percentage }) => {
            setUploadPercent(Math.round(percentage));
          },
        });
        uploadedUrl = blob.url;
      } catch (blobErr) {
        if (
          controller.signal.aborted ||
          (blobErr as { name?: string })?.name === "AbortError"
        ) {
          throw blobErr;
        }
        const LOCAL_UPLOAD_CHUNK_BYTES = 4 * 1024 * 1024; // 4 MB chunks (stays well below Next.js 10 MB middleware body limit)
        const totalSize = file.size;
        let lastUrl = "";

        for (
          let offset = 0;
          offset < totalSize;
          offset += LOCAL_UPLOAD_CHUNK_BYTES
        ) {
          if (controller.signal.aborted) {
            const abortError = new Error("Upload cancelled.");
            abortError.name = "AbortError";
            throw abortError;
          }
          const chunkEnd = Math.min(
            offset + LOCAL_UPLOAD_CHUNK_BYTES,
            totalSize
          );
          const chunkBlob = file.slice(offset, chunkEnd);

          lastUrl = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(
              "PUT",
              `/api/lecture-videos/upload?pathname=${encodeURIComponent(pathname)}&offset=${offset}&totalSize=${totalSize}`
            );
            xhr.setRequestHeader("Content-Type", contentType);
            const onAbort = () => {
              xhr.abort();
              const abortError = new Error("Upload cancelled.");
              abortError.name = "AbortError";
              reject(abortError);
            };
            controller.signal.addEventListener("abort", onAbort, {
              once: true,
            });
            xhr.upload.onprogress = (ev) => {
              if (ev.lengthComputable && totalSize > 0) {
                const overallPct = Math.min(
                  100,
                  Math.round(((offset + ev.loaded) / totalSize) * 100)
                );
                setUploadPercent(overallPct);
              }
            };
            xhr.onload = () => {
              controller.signal.removeEventListener("abort", onAbort);
              let parsed: { url?: string; message?: string } = {};
              try {
                parsed = JSON.parse(xhr.responseText || "{}");
              } catch {
                // ignore
              }
              if (xhr.status >= 200 && xhr.status < 300 && parsed.url) {
                setUploadPercent(
                  Math.min(100, Math.round((chunkEnd / totalSize) * 100))
                );
                resolve(parsed.url);
              } else {
                reject(
                  new Error(
                    parsed.message || "Failed to upload lecture video file."
                  )
                );
              }
            };
            xhr.onerror = () => {
              controller.signal.removeEventListener("abort", onAbort);
              reject(new Error("Network error while uploading lecture video."));
            };
            xhr.send(chunkBlob);
          });
        }

        uploadedUrl = lastUrl;
      }

      uncommittedBlobUrlRef.current = uploadedUrl;

      const res = await fetch("/api/lecture-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meta.title,
          description: meta.description,
          courseId: meta.courseId,
          sourceType: "UPLOAD",
          fileUrl: uploadedUrl,
          fileName: file.name,
          durationSeconds: probedDuration,
        }),
        signal: controller.signal,
      });

      const data = (await res.json().catch(() => ({}))) as {
        lecture?: IteLectureVideoDTO;
        message?: string;
      };
      if (!res.ok || !data.lecture) {
        cleanupUncommittedBlob(uploadedUrl);
        throw new Error(data.message || "Failed to save lecture.");
      }

      uncommittedBlobUrlRef.current = null;
      onSaved(data.lecture);
    } catch (err) {
      if (uncommittedBlobUrlRef.current) {
        cleanupUncommittedBlob(uncommittedBlobUrlRef.current);
      }
      if ((err as { name?: string })?.name === "AbortError") {
        setInlineError("Upload cancelled.");
      } else {
        setInlineError(
          err instanceof Error ? err.message : "Lecture upload failed."
        );
      }
    } finally {
      abortRef.current = null;
      setSubmitting(false);
      setUploadPercent(null);
    }
  };

  const canSubmitCreate =
    sourceType === "UPLOAD" ? Boolean(file) : Boolean(externalUrl.trim());

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lecture-upload-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-theme bg-surface p-5 sm:p-6 shadow-2xl space-y-5 my-auto">
        <div className="flex items-center justify-between border-b border-theme pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Video className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="lecture-upload-dialog-title"
                className="text-base font-bold text-primary-theme"
              >
                {mode === "edit"
                  ? "Edit Recorded Lecture"
                  : "Add Lecture Video"}
              </h3>
              <p className="text-xs text-secondary-theme">
                {mode === "edit"
                  ? "Update the title, subject, or description of this lecture."
                  : "Upload a video file or paste a YouTube or Google Drive link for one of your subjects."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelUpload}
            aria-label="Close dialog"
            className="rounded-xl p-1.5 text-secondary-theme hover:text-primary-theme hover:bg-elevated transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Source Selector (Create mode) or Read-Only Source Summary (Edit mode) */}
          {mode === "create" ? (
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-primary-theme">
                Video Source <span className="text-rose-500" aria-hidden="true">*</span>
              </span>
              <div
                role="radiogroup"
                aria-label="Lecture video source"
                aria-required="true"
                className="grid grid-cols-3 gap-2"
              >
                {(
                  [
                    {
                      type: "UPLOAD" as const,
                      label: "Upload video",
                      icon: Upload,
                    },
                    {
                      type: "YOUTUBE" as const,
                      label: "YouTube link",
                      icon: Youtube,
                    },
                    {
                      type: "DRIVE" as const,
                      label: "Google Drive link",
                      icon: HardDrive,
                    },
                  ] as const
                ).map((option) => {
                  const Icon = option.icon;
                  const active = sourceType === option.type;
                  return (
                    <button
                      key={option.type}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={submitting}
                      onClick={() => {
                        setSourceType(option.type);
                        setInlineError(null);
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition cursor-pointer ${
                        active
                          ? "border-blue-600 bg-blue-600/10 text-blue-700 dark:border-sky-400 dark:bg-sky-400/15 dark:text-sky-200"
                          : "border-theme bg-elevated text-secondary-theme hover:text-primary-theme"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-center leading-tight">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            lecture && (
              <div className="rounded-xl border border-theme bg-elevated/70 p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-secondary-theme">
                    Source (not editable)
                  </span>
                  <SourceBadge sourceType={lecture.sourceType} />
                </div>
                {lecture.externalUrl && (
                  <p className="text-xs text-muted-theme truncate">
                    {lecture.externalUrl}
                  </p>
                )}
                {lecture.fileName && (
                  <p className="text-xs text-muted-theme truncate">
                    {lecture.fileName}
                  </p>
                )}
              </div>
            )
          )}

          {/* Subject (Required Course Select) */}
          <div className="space-y-1.5">
            <label
              htmlFor="lecture-subject-select"
              className="block text-xs font-bold text-primary-theme"
            >
              Subject <span className="text-rose-500" aria-hidden="true">*</span>
            </label>
            {hasCourses ? (
              <select
                id="lecture-subject-select"
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setInlineError(null);
                }}
                required
                aria-required="true"
                disabled={submitting}
                className="w-full h-11 px-3.5 rounded-xl border border-theme bg-elevated text-xs sm:text-sm font-semibold text-primary-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="" disabled>
                  Select a subject...
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.displayLabel}
                  </option>
                ))}
              </select>
            ) : (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-800 dark:text-amber-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>You have no courses yet</span>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="lecture-title-input"
                className="block text-xs font-bold text-primary-theme"
              >
                Title <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <span className="text-[10px] text-muted-theme">
                {title.length}/{LECTURE_MAX_TITLE_LENGTH}
              </span>
            </div>
            <input
              id="lecture-title-input"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setInlineError(null);
              }}
              maxLength={LECTURE_MAX_TITLE_LENGTH}
              placeholder="e.g., Week 4: Principles of Learner-Centered Instruction"
              required
              aria-required="true"
              disabled={submitting}
              className="w-full h-11 px-3.5 rounded-xl border border-theme bg-elevated text-xs sm:text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="lecture-description-input"
                className="block text-xs font-semibold text-primary-theme"
              >
                Description (Optional)
              </label>
              <span className="text-[10px] text-muted-theme">
                {description.length}/{LECTURE_MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
            <textarea
              id="lecture-description-input"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setInlineError(null);
              }}
              maxLength={LECTURE_MAX_DESCRIPTION_LENGTH}
              rows={3}
              disabled={submitting}
              placeholder="Key learning goals, reflection prompts, or lecture notes for enrolled students..."
              className="w-full p-3 rounded-xl border border-theme bg-elevated text-xs sm:text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 resize-none"
            />
          </div>

          {/* Source-specific input (Create mode only) */}
          {mode === "create" && sourceType === "UPLOAD" && (
            <div className="space-y-1.5">
              <label
                htmlFor="lecture-video-file"
                className="block text-xs font-bold text-primary-theme"
              >
                Video File <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <input
                ref={fileInputRef}
                id="lecture-video-file"
                type="file"
                accept={LECTURE_ACCEPT_ATTRIBUTE}
                disabled={submitting || !hasCourses}
                aria-required="true"
                onChange={(e) => void handlePickFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {!file ? (
                <button
                  type="button"
                  disabled={submitting || !hasCourses}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-theme hover:border-blue-500 bg-elevated/60 p-5 text-center transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileVideo className="h-7 w-7 text-blue-600 dark:text-sky-400" />
                  <span className="text-xs font-bold text-primary-theme">
                    Choose lecture video file
                  </span>
                  <span className="text-[11px] text-secondary-theme">
                    {LECTURE_HINT_TEXT}
                  </span>
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-300/80 dark:border-sky-500/30 bg-blue-50/60 dark:bg-sky-950/30 p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Film className="h-5 w-5 text-blue-600 dark:text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-primary-theme truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-secondary-theme">
                        {formatFileSize(file.size)}
                        {probedDuration > 0
                          ? ` • ${formatDurationTimestamp(probedDuration)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {!submitting && (
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setProbedDuration(0);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="rounded-lg border border-theme bg-surface px-2.5 py-1 text-xs font-semibold text-secondary-theme hover:text-red-600 cursor-pointer shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
              <p className="text-[11px] text-muted-theme">
                Accepted formats: {LECTURE_HINT_TEXT}.
              </p>
            </div>
          )}

          {mode === "create" &&
            (sourceType === "YOUTUBE" || sourceType === "DRIVE") && (
              <div className="space-y-1.5">
                <label
                  htmlFor="lecture-external-url-input"
                  className="block text-xs font-bold text-primary-theme"
                >
                  {sourceType === "YOUTUBE"
                    ? "YouTube Video Link"
                    : "Google Drive Video Link"}{" "}
                  <span className="text-rose-500" aria-hidden="true">*</span>
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-theme" />
                  <input
                    id="lecture-external-url-input"
                    type="url"
                    value={externalUrl}
                    onChange={(e) => {
                      setExternalUrl(e.target.value);
                      setInlineError(null);
                    }}
                    placeholder={
                      sourceType === "YOUTUBE"
                        ? "https://www.youtube.com/watch?v=..."
                        : "https://drive.google.com/file/d/.../view"
                    }
                    required
                    aria-required="true"
                    disabled={submitting || !hasCourses}
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-theme bg-elevated text-xs sm:text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
                  />
                </div>
                {sourceType === "DRIVE" ? (
                  <div className="space-y-1.5 pt-0.5">
                    <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{DRIVE_SHARING_NOTE}</span>
                    </p>
                    <p
                      role="note"
                      className="text-[11px] font-medium text-amber-800 dark:text-amber-300 flex items-start gap-1.5"
                    >
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{DRIVE_NOT_TRACKED_NOTE}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-theme">
                    Paste a direct https:// YouTube video link (watch, youtu.be, embed, or shorts).
                  </p>
                )}
              </div>
            )}

          {/* Upload Progress Bar */}
          {submitting && uploadPercent !== null && (
            <div className="space-y-1.5 rounded-xl border border-theme bg-elevated p-3">
              <div className="flex items-center justify-between text-xs font-semibold text-primary-theme">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  <span>Uploading video to secure storage…</span>
                </span>
                <span>{uploadPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-sky-600 transition-all duration-200"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Inline Error */}
          {inlineError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-600 dark:text-red-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{inlineError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme">
            <button
              type="button"
              onClick={handleCancelUpload}
              className="px-4 py-2 rounded-xl border border-theme bg-elevated text-xs font-semibold text-secondary-theme hover:text-primary-theme cursor-pointer"
            >
              {submitting && sourceType === "UPLOAD"
                ? "Cancel upload"
                : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                !hasCourses ||
                !courseId ||
                !title.trim() ||
                (mode === "create" && !canSubmitCreate)
              }
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-xs font-bold text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>
                {mode === "edit"
                  ? "Save Changes"
                  : submitting
                    ? sourceType === "UPLOAD"
                      ? "Uploading…"
                      : "Saving…"
                    : sourceType === "UPLOAD"
                      ? "Upload Lecture"
                      : "Add Lecture"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 3. Video Player Modal (HTML5 Video + YouTube IFrame API + Drive Embed) ──

export interface LectureVideoPlayerModalProps {
  lecture: IteLectureVideoDTO;
  isStudent: boolean;
  onClose: () => void;
  onProgressUpdated: (
    lectureId: string,
    summary: StudentLectureProgressSummary
  ) => void;
}

export function LectureVideoPlayerModal({
  lecture,
  isStudent,
  onClose,
  onProgressUpdated,
}: LectureVideoPlayerModalProps) {
  const isTracked = lecture.isProgressTracked && lecture.sourceType !== "DRIVE";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastObservedTimeRef = useRef<number>(
    lecture.myProgress?.lastPositionSeconds ?? 0
  );
  const accumulatedWatchedRef = useRef<number>(
    lecture.myProgress?.watchedSeconds ?? 0
  );
  const durationRef = useRef<number>(
    lecture.durationSeconds || lecture.myProgress?.durationSeconds || 0
  );
  const ytPlayerStateRef = useRef<number>(-1);
  const ytPlaybackRateRef = useRef<number>(1);
  const lastSavedAtMsRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const hasResumedRef = useRef<boolean>(false);

  const [liveSummary, setLiveSummary] =
    useState<StudentLectureProgressSummary | null>(
      isTracked ? lecture.myProgress : null
    );

  const flushProgress = useCallback(
    async (keepalive = false) => {
      if (!isStudent || !isTracked) return;
      const video = videoRef.current;
      const currentPos =
        lecture.sourceType === "UPLOAD" && video
          ? video.currentTime
          : lastObservedTimeRef.current;
      const currentDur =
        lecture.sourceType === "UPLOAD" &&
        video &&
        Number.isFinite(video.duration) &&
        video.duration > 0
          ? video.duration
          : durationRef.current;

      if (currentDur <= 0) return;
      lastSavedAtMsRef.current = Date.now();

      try {
        const res = await fetch(
          `/api/lecture-videos/${lecture.id}/progress`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lastPositionSeconds: Math.round(currentPos * 100) / 100,
              watchedSeconds:
                Math.round(
                  Math.min(accumulatedWatchedRef.current, currentDur) * 100
                ) / 100,
              durationSeconds: Math.round(currentDur * 100) / 100,
            }),
            keepalive,
          }
        );
        if (res.ok) {
          const data = (await res.json()) as {
            progress?: StudentLectureProgressSummary;
          };
          if (data.progress) {
            accumulatedWatchedRef.current = Math.max(
              accumulatedWatchedRef.current,
              data.progress.watchedSeconds
            );
            setLiveSummary(data.progress);
            onProgressUpdated(lecture.id, data.progress);
          }
        }
      } catch {
        // Ignore transient network errors during background flushes
      }
    },
    [isStudent, isTracked, lecture.id, lecture.sourceType, onProgressUpdated]
  );

  useEffect(() => {
    if (!isStudent || !isTracked) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushProgress(true);
      }
    };
    const handlePageHide = () => {
      void flushProgress(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      void flushProgress(true);
    };
  }, [flushProgress, isStudent, isTracked]);

  const registerYouTubeBridge = useCallback(() => {
    if (lecture.sourceType !== "YOUTUBE") return;
    const win = ytIframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({
          event: "listening",
          id: lecture.id,
          channel: "widget",
        }),
        "https://www.youtube-nocookie.com"
      );
      win.postMessage(
        JSON.stringify({
          event: "command",
          func: "addEventListener",
          args: ["onStateChange"],
          id: lecture.id,
          channel: "widget",
        }),
        "https://www.youtube-nocookie.com"
      );
    } catch {
      // Ignore cross-origin frame readiness race
    }
  }, [lecture.id, lecture.sourceType]);

  useEffect(() => {
    if (lecture.sourceType !== "YOUTUBE" || !isStudent) return;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.youtube-nocookie.com" &&
        event.origin !== "https://www.youtube.com"
      ) {
        return;
      }
      if (typeof event.data !== "string") return;

      let payload: {
        event?: string;
        info?: {
          currentTime?: number;
          duration?: number;
          playerState?: number;
          playbackRate?: number;
        } | number;
      };
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (
        (payload.event === "infoDelivery" ||
          payload.event === "initialDelivery") &&
        payload.info &&
        typeof payload.info === "object"
      ) {
        const info = payload.info;
        if (
          typeof info.duration === "number" &&
          Number.isFinite(info.duration) &&
          info.duration > 0 &&
          durationRef.current <= 0
        ) {
          durationRef.current = info.duration;
        }

        if (
          typeof info.playbackRate === "number" &&
          Number.isFinite(info.playbackRate) &&
          info.playbackRate > 0
        ) {
          ytPlaybackRateRef.current = info.playbackRate;
        }

        if (typeof info.playerState === "number") {
          const prevState = ytPlayerStateRef.current;
          ytPlayerStateRef.current = info.playerState;

          if (
            info.playerState === 1 &&
            !hasResumedRef.current &&
            lecture.myProgress
          ) {
            hasResumedRef.current = true;
            const resumeAt = lecture.myProgress.lastPositionSeconds;
            if (
              resumeAt > 1 &&
              (!durationRef.current || resumeAt < durationRef.current - 2)
            ) {
              lastObservedTimeRef.current = resumeAt;
              try {
                ytIframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({
                    event: "command",
                    func: "seekTo",
                    args: [resumeAt, true],
                    id: lecture.id,
                    channel: "widget",
                  }),
                  "https://www.youtube-nocookie.com"
                );
              } catch {
                // Ignore
              }
            }
          }

          if (
            (info.playerState === 2 || info.playerState === 0) &&
            prevState !== info.playerState
          ) {
            void flushProgress(false);
          }
        }

        if (
          typeof info.currentTime === "number" &&
          Number.isFinite(info.currentTime) &&
          info.currentTime >= 0
        ) {
          const nowPos = info.currentTime;
          const step = accumulateWatchedStep({
            previousPositionSeconds: lastObservedTimeRef.current,
            currentPositionSeconds: nowPos,
            isPlaying: ytPlayerStateRef.current === 1,
            isSeeking: false,
            playbackRate: ytPlaybackRateRef.current,
          });

          lastObservedTimeRef.current = nowPos;
          if (step > 0) {
            const dur = durationRef.current;
            accumulatedWatchedRef.current =
              dur > 0
                ? Math.min(dur, accumulatedWatchedRef.current + step)
                : accumulatedWatchedRef.current + step;
          }

          const nowMs = Date.now();
          if (
            ytPlayerStateRef.current === 1 &&
            nowMs - lastSavedAtMsRef.current >= LECTURE_SAVE_INTERVAL_MS
          ) {
            void flushProgress(false);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    const interval = window.setInterval(registerYouTubeBridge, 1500);
    registerYouTubeBridge();

    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearInterval(interval);
    };
  }, [
    flushProgress,
    isStudent,
    lecture.id,
    lecture.myProgress,
    lecture.sourceType,
    registerYouTubeBridge,
  ]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (Number.isFinite(video.duration) && video.duration > 0) {
      durationRef.current = video.duration;
    }
    if (!hasResumedRef.current && isStudent && lecture.myProgress) {
      hasResumedRef.current = true;
      const resumeAt = lecture.myProgress.lastPositionSeconds;
      if (
        resumeAt > 1 &&
        (!durationRef.current || resumeAt < durationRef.current - 2)
      ) {
        video.currentTime = resumeAt;
        lastObservedTimeRef.current = resumeAt;
      }
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !isStudent || !isTracked) return;

    const nowPos = video.currentTime;
    const step = accumulateWatchedStep({
      previousPositionSeconds: lastObservedTimeRef.current,
      currentPositionSeconds: nowPos,
      isPlaying: !video.paused && !video.ended,
      isSeeking: video.seeking || isSeekingRef.current,
      playbackRate: video.playbackRate,
    });

    lastObservedTimeRef.current = nowPos;
    if (step > 0) {
      const dur =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : durationRef.current;
      accumulatedWatchedRef.current =
        dur > 0
          ? Math.min(dur, accumulatedWatchedRef.current + step)
          : accumulatedWatchedRef.current + step;
    }

    const nowMs = Date.now();
    if (nowMs - lastSavedAtMsRef.current >= LECTURE_SAVE_INTERVAL_MS) {
      void flushProgress(false);
    }
  };

  const handleClose = async () => {
    await flushProgress(true);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lecture-player-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-2xl border border-theme bg-surface p-4 sm:p-6 shadow-2xl space-y-4 my-auto">
        <div className="flex items-center justify-between gap-3 border-b border-theme pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-blue-600 to-sky-600 px-2 py-0.5 text-[10px] font-bold text-white">
                Lecture
              </span>
              <SourceBadge sourceType={lecture.sourceType} />
              <span className="inline-flex items-center rounded-md border border-blue-200 dark:border-sky-800/60 bg-blue-50/80 dark:bg-sky-950/50 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:text-sky-200">
                {lecture.courseLabel}
              </span>
              {isStudent && isTracked && liveSummary?.status === "COMPLETED" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Completed</span>
                </span>
              )}
            </div>
            <h3
              id="lecture-player-modal-title"
              className="text-sm sm:text-base font-bold text-primary-theme truncate mt-1"
            >
              {lecture.title}
            </h3>
            <p className="text-[11px] text-secondary-theme">
              Shared by {lecture.uploadedByName}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleClose()}
            aria-label="Close lecture player"
            className="rounded-xl p-2 text-secondary-theme hover:text-primary-theme hover:bg-elevated transition cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Player (Uploaded HTML5 Video OR Sandboxed YouTube/Drive IFrame) */}
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg">
          {lecture.sourceType === "UPLOAD" && lecture.streamUrl ? (
            <video
              ref={videoRef}
              src={lecture.streamUrl}
              controls
              playsInline
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
              onSeeking={() => {
                isSeekingRef.current = true;
                if (videoRef.current) {
                  lastObservedTimeRef.current = videoRef.current.currentTime;
                }
              }}
              onSeeked={() => {
                isSeekingRef.current = false;
                if (videoRef.current) {
                  lastObservedTimeRef.current = videoRef.current.currentTime;
                }
              }}
              onPlay={() => {
                if (videoRef.current) {
                  lastObservedTimeRef.current = videoRef.current.currentTime;
                }
              }}
              onTimeUpdate={handleTimeUpdate}
              onPause={() => void flushProgress(false)}
              onEnded={() => void flushProgress(false)}
              className="w-full h-full object-contain"
            />
          ) : lecture.embedUrl ? (
            <iframe
              ref={ytIframeRef}
              src={lecture.embedUrl}
              title={lecture.title}
              onLoad={registerYouTubeBridge}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="w-full h-full border-0"
            />
          ) : null}
        </div>

        {isStudent && isTracked && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-theme text-xs text-secondary-theme">
            <span>
              Viewing progress is saved automatically while watching at normal speed (completed at 90%).
            </span>
            <span className="font-bold text-primary-theme shrink-0">
              {liveSummary?.percentWatched ?? 0}% watched
            </span>
          </div>
        )}
        {!isTracked && (
          <div
            role="note"
            className="flex items-center gap-1.5 pt-2 border-t border-theme text-xs font-medium text-amber-800 dark:text-amber-300"
          >
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>{DRIVE_NOT_TRACKED_NOTE}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 4. Faculty "Lecture progress" View (Enrolled Course Students Table) ────

export interface FacultyLectureProgressViewProps {
  lectures: IteLectureVideoDTO[];
  initialSelectedLectureId?: string | null;
}

export function FacultyLectureProgressView({
  lectures,
  initialSelectedLectureId,
}: FacultyLectureProgressViewProps) {
  const [selectedLectureId, setSelectedLectureId] = useState<string>(
    initialSelectedLectureId || lectures[0]?.id || ""
  );
  const [report, setReport] = useState<FacultyLectureProgressReport | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [programFilter, setProgramFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<FacultyProgressSortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (
      initialSelectedLectureId &&
      lectures.some((l) => l.id === initialSelectedLectureId)
    ) {
      setSelectedLectureId(initialSelectedLectureId);
    } else if (!selectedLectureId && lectures.length > 0) {
      setSelectedLectureId(lectures[0].id);
    } else if (
      selectedLectureId &&
      !lectures.some((l) => l.id === selectedLectureId)
    ) {
      setSelectedLectureId(lectures[0]?.id || "");
    }
  }, [initialSelectedLectureId, lectures, selectedLectureId]);

  useEffect(() => {
    if (!selectedLectureId) {
      setReport(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/lecture-videos/${selectedLectureId}/progress`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          report?: FacultyLectureProgressReport;
          message?: string;
        };
        if (!res.ok || !data.report) {
          throw new Error(data.message || "Unable to load student progress.");
        }
        if (!cancelled) {
          setReport(data.report);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load student progress."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLectureId]);

  const { rows: displayedRows, summary: filteredSummary } = useMemo(() => {
    if (!report) {
      return {
        rows: [],
        summary: { total: 0, completed: 0, inProgress: 0, notStarted: 0 },
      };
    }
    return filterAndSortFacultyProgressRows(report.rows, {
      programFilter,
      query: searchQuery,
      sortBy,
      sortDir,
    });
  }, [report, programFilter, searchQuery, sortBy, sortDir]);

  const toggleSort = (field: FacultyProgressSortField) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(
        field === "percentWatched" || field === "lastWatchedAt" ? "desc" : "asc"
      );
    }
  };

  if (lectures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-theme bg-surface p-12 text-center space-y-3">
        <BarChart3 className="h-10 w-10 text-muted-theme" />
        <h3 className="text-base font-bold text-primary-theme">
          No recorded lectures added yet
        </h3>
        <p className="text-xs sm:text-sm text-secondary-theme max-w-md">
          Add a recorded lecture using the &ldquo;Add lecture&rdquo; button above to monitor student viewing progress for your subject.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lecture Selector + Program Filter + Summary Cards */}
      <section className="rounded-2xl border border-theme bg-surface p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            <div className="space-y-1.5">
              <label
                htmlFor="faculty-progress-lecture-select"
                className="block text-xs font-bold uppercase tracking-wider text-secondary-theme"
              >
                Choose Recorded Lecture
              </label>
              <select
                id="faculty-progress-lecture-select"
                value={selectedLectureId}
                onChange={(e) => setSelectedLectureId(e.target.value)}
                className="w-full h-11 rounded-xl border border-theme bg-elevated px-3.5 text-sm font-semibold text-primary-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                {lectures.map((lec) => (
                  <option key={lec.id} value={lec.id}>
                    {lec.title} — {lec.courseLabel} [{lec.sourceLabel}]
                    {lec.durationSeconds > 0
                      ? ` (${formatDurationTimestamp(lec.durationSeconds)})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="faculty-progress-program-filter"
                className="block text-xs font-bold uppercase tracking-wider text-secondary-theme"
              >
                Filter by ITE Program
              </label>
              <select
                id="faculty-progress-program-filter"
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value)}
                className="w-full h-11 rounded-xl border border-theme bg-elevated px-3.5 text-sm font-semibold text-primary-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="ALL">All programs</option>
                {ITE_STUDENT_PROGRAM_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Count Pills (Completed / In progress / Not started) */}
          {report && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-theme bg-elevated px-3.5 py-2.5">
                <div className="text-[11px] font-semibold text-secondary-theme flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {programFilter === "ALL"
                      ? "Enrolled"
                      : `${programFilter} Enrolled`}
                  </span>
                </div>
                <div className="text-lg font-extrabold text-primary-theme mt-0.5">
                  {filteredSummary.total}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-300/70 dark:border-emerald-700/50 bg-emerald-500/10 px-3.5 py-2.5">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  Completed
                </div>
                <div className="text-lg font-extrabold text-emerald-800 dark:text-emerald-200 mt-0.5">
                  {filteredSummary.completed}
                </div>
              </div>

              <div className="rounded-xl border border-sky-300/70 dark:border-sky-700/50 bg-sky-500/10 px-3.5 py-2.5">
                <div className="text-[11px] font-bold text-sky-800 dark:text-sky-300">
                  In progress
                </div>
                <div className="text-lg font-extrabold text-sky-800 dark:text-sky-200 mt-0.5">
                  {filteredSummary.inProgress}
                </div>
              </div>

              <div className="rounded-xl border border-theme bg-elevated px-3.5 py-2.5">
                <div className="text-[11px] font-bold text-secondary-theme">
                  Not started
                </div>
                <div className="text-lg font-extrabold text-primary-theme mt-0.5">
                  {filteredSummary.notStarted}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Lecture Subject & Source Badge + Google Drive Untracked Note */}
        {report && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-theme bg-elevated/60 px-3.5 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-secondary-theme">Subject:</span>
              <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 dark:border-sky-800/60 bg-blue-50/80 dark:bg-sky-950/50 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:text-sky-200">
                <BookOpen className="h-3 w-3 shrink-0" />
                <span>{report.courseLabel}</span>
              </span>
              <span className="font-semibold text-secondary-theme ml-1">Source:</span>
              <SourceBadge sourceType={report.lectureSourceType} />
            </div>
            {!report.isProgressTracked && (
              <div
                role="note"
                className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300"
              >
                <Info className="h-4 w-4 shrink-0" />
                <span>{report.trackingNote || DRIVE_NOT_TRACKED_NOTE}</span>
              </div>
            )}
          </div>
        )}

        {/* Search by student name or ID */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-theme" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search enrolled student by name, student ID, program, or section..."
            aria-label="Search enrolled students by name or ID"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-theme bg-elevated text-xs sm:text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs font-semibold text-secondary-theme gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>Loading enrolled student viewing progress…</span>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-600 dark:text-red-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : report ? (
          <div className="overflow-x-auto rounded-xl border border-theme">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-theme bg-elevated text-[11px] font-bold uppercase tracking-wider text-secondary-theme">
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => toggleSort("name")}
                      className="inline-flex items-center gap-1 hover:text-primary-theme cursor-pointer"
                    >
                      <span>Student</span>
                      {sortBy === "name" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => toggleSort("program")}
                      className="inline-flex items-center gap-1 hover:text-primary-theme cursor-pointer"
                    >
                      <span>Program</span>
                      {sortBy === "program" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <span>Section</span>
                  </th>
                  <th className="py-3 px-4">
                    <span>Source</span>
                  </th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => toggleSort("percentWatched")}
                      className="inline-flex items-center gap-1 hover:text-primary-theme cursor-pointer"
                    >
                      <span>Percent Watched</span>
                      {sortBy === "percentWatched" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => toggleSort("lastWatchedAt")}
                      className="inline-flex items-center gap-1 hover:text-primary-theme cursor-pointer"
                    >
                      <span>Last Watched</span>
                      {sortBy === "lastWatchedAt" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => toggleSort("status")}
                      className="inline-flex items-center gap-1 hover:text-primary-theme cursor-pointer"
                    >
                      <span>Status</span>
                      {sortBy === "status" &&
                        (sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        ))}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme bg-surface">
                {displayedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 px-4 text-center text-xs text-secondary-theme"
                    >
                      {report.rows.length === 0
                        ? "No students are currently enrolled in this course."
                        : "No enrolled students matched your filters."}
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((row) => (
                    <tr
                      key={row.studentId}
                      className="hover:bg-elevated/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-primary-theme">
                          {row.studentName}
                        </div>
                        <div className="text-[11px] text-secondary-theme">
                          {row.studentNumber || row.studentEmail || "ITE Student"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-md border border-blue-200 dark:border-sky-800/60 bg-blue-50/70 dark:bg-sky-950/40 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:text-sky-200">
                          {row.programLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-secondary-theme">
                        {row.section || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <SourceBadge sourceType={report.lectureSourceType} />
                      </td>
                      <td className="py-3 px-4">
                        {row.status === "NOT_TRACKED" ? (
                          <span className="text-xs text-muted-theme">—</span>
                        ) : (
                          <div className="flex items-center gap-2.5 max-w-[180px]">
                            <div className="flex-1 h-2 rounded-full bg-elevated overflow-hidden border border-theme">
                              <div
                                className={`h-full rounded-full ${
                                  row.status === "COMPLETED"
                                    ? "bg-emerald-500"
                                    : row.status === "IN_PROGRESS"
                                      ? "bg-sky-500"
                                      : "bg-transparent"
                                }`}
                                style={{ width: `${row.percentWatched}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-primary-theme w-10 text-right">
                              {row.percentWatched}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-secondary-theme">
                        {row.lastWatchedAt
                          ? new Date(row.lastWatchedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            row.status === "COMPLETED"
                              ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-400/40"
                              : row.status === "IN_PROGRESS"
                                ? "bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-400/40"
                                : row.status === "NOT_TRACKED"
                                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-400/40"
                                  : "bg-elevated text-secondary-theme border border-theme"
                          }`}
                        >
                          {row.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

// ─── 5. Main Lecture Videos Client Page ──────────────────────────────────────

export interface LectureVideosClientProps {
  initialLectures: IteLectureVideoDTO[];
  courses: IteCourseSummary[];
  userId: string;
  userRole: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  uploadsConfigured: boolean;
}

export default function LectureVideosClient({
  initialLectures,
  courses,
  userId,
  userRole,
  uploadsConfigured,
}: LectureVideosClientProps) {
  const isStudent = userRole === "STUDENT";
  const isFacultyOrAdmin = userRole === "INSTRUCTOR" || userRole === "ADMIN";

  const [lectures, setLectures] =
    useState<IteLectureVideoDTO[]>(initialLectures);
  const [activeTab, setActiveTab] = useState<"lectures" | "progress">(
    "lectures"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("ALL");

  const [uploadDialogState, setUploadDialogState] = useState<{
    open: boolean;
    mode: "create" | "edit";
    lecture?: IteLectureVideoDTO | null;
  }>({ open: false, mode: "create", lecture: null });

  const [watchingLecture, setWatchingLecture] =
    useState<IteLectureVideoDTO | null>(null);
  const [progressSelectedLectureId, setProgressSelectedLectureId] = useState<
    string | null
  >(null);
  const [deleteTarget, setDeleteTarget] =
    useState<IteLectureVideoDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Build subject filter options from the user's enrolled/taught courses plus any courses present on visible lectures
  const subjectFilterOptions = useMemo(() => {
    const map = new Map<string, IteCourseSummary>();
    for (const c of courses) {
      map.set(c.id, c);
    }
    for (const lec of lectures) {
      if (!map.has(lec.courseId)) {
        map.set(lec.courseId, {
          id: lec.courseId,
          code: lec.courseCode,
          title: lec.courseTitle,
          section: lec.courseSection,
          displayLabel: lec.courseLabel,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.displayLabel.localeCompare(b.displayLabel)
    );
  }, [courses, lectures]);

  const filteredLectures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return lectures.filter((lec) => {
      if (selectedSubjectId !== "ALL") {
        if (lec.courseId !== selectedSubjectId) return false;
      }
      if (!q) return true;
      return (
        lec.title.toLowerCase().includes(q) ||
        (lec.description && lec.description.toLowerCase().includes(q)) ||
        lec.courseLabel.toLowerCase().includes(q) ||
        lec.courseCode.toLowerCase().includes(q) ||
        lec.courseTitle.toLowerCase().includes(q) ||
        lec.uploadedByName.toLowerCase().includes(q) ||
        lec.sourceLabel.toLowerCase().includes(q)
      );
    });
  }, [lectures, searchQuery, selectedSubjectId]);

  const handleSavedLecture = (saved: IteLectureVideoDTO) => {
    setLectures((prev) => {
      const idx = prev.findIndex((l) => l.id === saved.id);
      if (idx === -1) return [saved, ...prev];
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
    setUploadDialogState({ open: false, mode: "create", lecture: null });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/lecture-videos/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLectures((prev) => prev.filter((l) => l.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleProgressUpdated = useCallback(
    (lectureId: string, summary: StudentLectureProgressSummary) => {
      setLectures((prev) =>
        prev.map((lec) =>
          lec.id === lectureId ? { ...lec, myProgress: summary } : lec
        )
      );
      setWatchingLecture((prev) =>
        prev && prev.id === lectureId
          ? { ...prev, myProgress: summary }
          : prev
      );
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-blue-200/80 dark:border-sky-500/25 bg-gradient-to-br from-blue-600 via-blue-700 to-sky-700 p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-xs px-3 py-1 text-xs font-bold tracking-wide uppercase">
              <Video className="h-3.5 w-3.5 text-amber-300" />
              <span>Institute of Teacher Education • Lecture Videos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Lecture Videos
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              {isFacultyOrAdmin
                ? "Upload recorded lectures or share YouTube and Google Drive links for the ITE subjects you teach, and monitor enrolled student progress."
                : "Watch recorded lectures for the ITE subjects you are enrolled in and pick up right where you left off."}
            </p>
          </div>

          {isFacultyOrAdmin && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setUploadDialogState({
                    open: true,
                    mode: "create",
                    lecture: null,
                  })
                }
                className="inline-flex items-center gap-2 rounded-xl bg-white text-blue-800 hover:bg-blue-50 px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-md transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add lecture</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Tabs (Faculty/Admins see "Lectures" and "Lecture progress") */}
      {isFacultyOrAdmin && (
        <div
          role="tablist"
          aria-label="Lecture Videos views"
          className="inline-flex rounded-2xl border border-theme bg-surface p-1.5 shadow-2xs gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "lectures"}
            onClick={() => setActiveTab("lectures")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === "lectures"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-secondary-theme hover:text-primary-theme hover:bg-elevated"
            }`}
          >
            <Video className="h-4 w-4" />
            <span>Recorded Lectures ({lectures.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "progress"}
            onClick={() => setActiveTab("progress")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === "progress"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-secondary-theme hover:text-primary-theme hover:bg-elevated"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Lecture progress</span>
          </button>
        </div>
      )}

      {activeTab === "progress" && isFacultyOrAdmin ? (
        <FacultyLectureProgressView
          lectures={lectures}
          initialSelectedLectureId={progressSelectedLectureId}
        />
      ) : (
        <div className="space-y-5">
          {/* Search & Subject Filter Dropdown */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-theme" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lectures by title, subject, description, source, or instructor..."
                aria-label="Search recorded lectures"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-theme bg-surface text-xs sm:text-sm text-primary-theme placeholder:text-muted-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            {subjectFilterOptions.length > 0 && (
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                aria-label="Filter by subject"
                className="h-11 rounded-xl border border-theme bg-surface px-3.5 text-xs sm:text-sm font-semibold text-primary-theme outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="ALL">All subjects</option>
                {subjectFilterOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayLabel}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Subject Filter Chips */}
          {subjectFilterOptions.length > 1 && (
            <div
              role="group"
              aria-label="Subject filter chips"
              className="flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                onClick={() => setSelectedSubjectId("ALL")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  selectedSubjectId === "ALL"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "border border-theme bg-surface text-secondary-theme hover:text-primary-theme hover:bg-elevated"
                }`}
              >
                <span>All subjects</span>
              </button>
              {subjectFilterOptions.map((course) => {
                const active = selectedSubjectId === course.id;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(course.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${
                      active
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "border border-theme bg-surface text-secondary-theme hover:text-primary-theme hover:bg-elevated"
                    }`}
                  >
                    <BookOpen className="h-3 w-3 shrink-0" />
                    <span>{course.displayLabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Lectures Grid */}
          {filteredLectures.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-theme bg-surface p-12 text-center space-y-3">
              <Video className="h-10 w-10 text-muted-theme" />
              <h2 className="text-base font-bold text-primary-theme">
                {lectures.length === 0
                  ? "No recorded lectures yet"
                  : "No lectures match your filter"}
              </h2>
              <p className="text-xs sm:text-sm text-secondary-theme max-w-md">
                {lectures.length === 0
                  ? isFacultyOrAdmin
                    ? courses.length === 0
                      ? "You have no courses yet. Once you are assigned to an ITE subject, you can add lectures here."
                      : "Upload a recorded lecture video or add a YouTube or Google Drive link for one of your subjects."
                    : courses.length === 0
                      ? "You are not enrolled in any active ITE courses yet."
                      : "Your instructors haven't added any recorded lectures for your enrolled subjects yet."
                  : "Try clearing your search query or selecting a different subject filter."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {filteredLectures.map((lecture) => (
                <LectureVideoCard
                  key={lecture.id}
                  lecture={lecture}
                  isStudent={isStudent}
                  onWatch={(lec) => setWatchingLecture(lec)}
                  onEdit={(lec) =>
                    setUploadDialogState({
                      open: true,
                      mode: "edit",
                      lecture: lec,
                    })
                  }
                  onDelete={(lec) => setDeleteTarget(lec)}
                  onOpenProgress={
                    isFacultyOrAdmin
                      ? (lec) => {
                          setProgressSelectedLectureId(lec.id);
                          setActiveTab("progress");
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload / Edit Modal */}
      {uploadDialogState.open && (
        <LectureUploadDialog
          mode={uploadDialogState.mode}
          lecture={uploadDialogState.lecture}
          courses={courses}
          userId={userId}
          uploadsConfigured={uploadsConfigured}
          onClose={() =>
            setUploadDialogState({ open: false, mode: "create", lecture: null })
          }
          onSaved={handleSavedLecture}
        />
      )}

      {/* Video Player Modal */}
      {watchingLecture && (
        <LectureVideoPlayerModal
          lecture={watchingLecture}
          isStudent={isStudent}
          onClose={() => setWatchingLecture(null)}
          onProgressUpdated={handleProgressUpdated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-lecture-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-theme bg-surface p-6 shadow-2xl space-y-4">
            <h3
              id="delete-lecture-dialog-title"
              className="text-base font-bold text-primary-theme"
            >
              Delete recorded lecture?
            </h3>
            <p className="text-xs sm:text-sm text-secondary-theme">
              Are you sure you want to delete{" "}
              <span className="font-bold text-primary-theme">
                &ldquo;{deleteTarget.title}&rdquo;
              </span>
              ? This will permanently remove the lecture and any student viewing progress records for it.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-theme bg-elevated text-xs font-semibold text-secondary-theme hover:text-primary-theme cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleConfirmDelete()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete lecture</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
