"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "@/components/common/Toast";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { PlacementDTO, SubmissionDTO } from "@/lib/practicum/dto";
import {
  SUBMISSION_TYPES,
  SUBMISSION_TYPE_LABELS,
  formatBytes,
  formatPlacementDeletionSummary,
  parseSubmissionLink,
  statusAfterFeedback,
  type FeedbackDecision,
} from "@/lib/practicum/rules";
import EditPlacementDialog from "./EditPlacementDialog";
import FeedbackThread from "./FeedbackThread";
import { PlacementStatusBadge, SubmissionStatusBadge } from "./StatusBadges";
import SubmissionPreview from "./SubmissionPreview";
import { formatDate, practicumFetch } from "./shared";

interface PlacementDetailClientProps {
  instituteCode: string;
  placement: PlacementDTO;
  submissions: SubmissionDTO[];
  primaryColor: string;
  canDelete?: boolean;
}

const DECISION_OPTIONS: { value: FeedbackDecision; label: string }[] = [
  { value: "COMMENT", label: "Comment only" },
  { value: "NEEDS_REVISION", label: "Needs revision" },
  { value: "APPROVED", label: "Approve" },
];

const inputClass =
  "w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#1E2132] px-3 py-2 text-sm text-slate-900 dark:text-[#F0F2F8] placeholder:text-slate-500 dark:placeholder:text-[#94A3B8] outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

function FeedbackForm({ submission, onSaved }: { submission: SubmissionDTO; onSaved: () => void }) {
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<FeedbackDecision>("COMMENT");
  const [score, setScore] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (submission.status === "APPROVED") {
    return (
      <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
        This submission is approved. Approved submissions are final.
      </p>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError(null);

    if (!comment.trim()) {
      setError("Write a comment for the student.");
      return;
    }
    let parsedScore: number | null = null;
    if (score.trim() !== "") {
      parsedScore = Number(score);
      if (!Number.isInteger(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        setError("Score must be a whole number from 0 to 100.");
        return;
      }
    }

    setSaving(true);
    try {
      await practicumFetch(`/api/practicum/submissions/${submission.id}/feedback`, {
        method: "POST",
        body: JSON.stringify({ comment, decision, score: parsedScore }),
      });
      toast.success("Feedback sent", "The student has been notified.");
      setComment("");
      setScore("");
      setDecision("COMMENT");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setSaving(false);
    }
  }

  const id = `fb-${submission.id}`;

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
        Fields marked with <span className="text-rose-500" aria-hidden="true">*</span> are required.
      </p>
      <div>
        <label htmlFor={`${id}-comment`} className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
          Feedback <span className="text-rose-500" aria-hidden="true">*</span>
        </label>
        <textarea
          id={`${id}-comment`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={4000}
          disabled={saving}
          required
          aria-required="true"
          className={inputClass}
        />
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
          Decision <span className="text-rose-500" aria-hidden="true">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {DECISION_OPTIONS.map((option) => {
            const allowed = statusAfterFeedback(submission.status, option.value).ok;
            return (
              <label
                key={option.value}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  allowed
                    ? "cursor-pointer border-slate-300 text-slate-800 dark:border-white/15 dark:text-[#F0F2F8]"
                    : "cursor-not-allowed border-slate-200 text-slate-500 opacity-60 dark:border-white/10 dark:text-[#94A3B8]"
                } ${decision === option.value ? "bg-blue-500/10 ring-1 ring-blue-500" : ""}`}
              >
                <input
                  type="radio"
                  name={`${id}-decision`}
                  value={option.value}
                  checked={decision === option.value}
                  disabled={!allowed || saving}
                  onChange={() => setDecision(option.value)}
                />
                {option.label}
              </label>
            );
          })}
        </div>
        {submission.status === "NEEDS_REVISION" && (
          <p className="mt-1 text-xs text-slate-600 dark:text-[#94A3B8]">
            Waiting for the student to resubmit. You can still add comments.
          </p>
        )}
      </fieldset>

      <div className="max-w-40">
        <label htmlFor={`${id}-score`} className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
          Score <span className="font-normal text-slate-600 dark:text-[#94A3B8]">(optional, 0–100)</span>
        </label>
        <input
          id={`${id}-score`}
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          disabled={saving}
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Send feedback
      </button>
    </form>
  );
}

function SubmissionCard({ submission, onChanged }: { submission: SubmissionDTO; onChanged: () => void }) {
  const [open, setOpen] = useState(submission.status === "SUBMITTED");
  const panelId = `submission-${submission.id}`;
  const parsedLink = submission.videoLink ? parseSubmissionLink(submission.videoLink) : null;

  return (
    <li className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#141721]">
      <div className="flex w-full items-center justify-between gap-3 rounded-2xl p-3 hover:bg-slate-50 dark:hover:bg-white/5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">{submission.title}</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-[#94A3B8]">
            Version {submission.version} · {formatDate(submission.submittedAt)}
            {submission.fileName && ` · ${submission.fileName}`}
            {!submission.fileName && parsedLink?.ok && ` · ${parsedLink.siteName}`}
            {submission.feedback.length > 0 && ` · ${submission.feedback.length} feedback`}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {parsedLink?.ok && (
            <a
              href={parsedLink.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 rounded-xl border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Open link · {parsedLink.siteName}
            </a>
          )}
          <SubmissionStatusBadge status={submission.status} />
          <button
            type="button"
            aria-label={open ? "Collapse submission details" : "Expand submission details"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 dark:text-[#94A3B8]"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {open && (
        <div id={panelId} className="space-y-5 border-t border-slate-200 p-4 dark:border-white/10">
          {submission.description && (
            <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-[#D1D5DB]">{submission.description}</p>
          )}
          <SubmissionPreview submission={submission} />
          <section>
            <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">Feedback history</h4>
            <FeedbackThread feedback={submission.feedback} />
          </section>
          <section>
            <FeedbackForm submission={submission} onSaved={onChanged} />
          </section>
        </div>
      )}
    </li>
  );
}

function DeletePlacementDialog({
  placement,
  submissions,
  deleting,
  error,
  onClose,
  onConfirm,
}: {
  placement: PlacementDTO;
  submissions: SubmissionDTO[];
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [confirmText, setConfirmText] = useState("");

  useDialogA11y(true, () => !deleting && onClose(), panelRef, { autoFocus: false });

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const hasSubmissions = submissions.length > 0;
  const lessonPlans = submissions.filter((s) => s.type === "LESSON_PLAN").length;
  const portfolioEvidence = submissions.filter((s) => s.type === "PORTFOLIO_EVIDENCE").length;
  const demoVideos = submissions.filter((s) => s.type === "DEMO_VIDEO").length;
  const comments = submissions.reduce((sum, s) => sum + s.feedback.length, 0);
  const summaryText = formatPlacementDeletionSummary({
    lessonPlans,
    portfolioEvidence,
    demoVideos,
    comments,
    hasRubric: Boolean(placement.rubricFileName),
  });

  const normalizedInput = confirmText.trim();
  const isConfirmed =
    !hasSubmissions ||
    normalizedInput === placement.studentName.trim() ||
    normalizedInput === "DELETE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={() => !deleting && onClose()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-placement-title"
        aria-describedby="delete-placement-description"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl outline-none dark:border-white/10 dark:bg-[#1C2030] dark:text-[#F1F5F9]"
      >
        <h3 id="delete-placement-title" className="mb-2 text-lg font-bold">
          Delete placement for {placement.studentName}?
        </h3>
        <div id="delete-placement-description" className="mb-4 space-y-2 text-xs text-slate-600 dark:text-[#94A3B8]">
          <p>
            Placement: <span className="font-semibold text-slate-800 dark:text-[#F0F2F8]">{placement.schoolName}</span>{" "}
            ({placement.subject} · {placement.gradeLevel} · {placement.schoolYear})
          </p>
          <p>{summaryText}</p>
          <p className="font-semibold text-red-700 dark:text-red-300">This cannot be undone.</p>
        </div>

        {hasSubmissions && (
          <div className="mb-4">
            <label
              htmlFor="delete-placement-confirm-input"
              className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-[#D1D5DB]"
            >
              Type <span className="font-semibold text-slate-900 dark:text-[#F0F2F8]">{placement.studentName}</span> or{" "}
              <span className="font-mono font-semibold text-slate-900 dark:text-[#F0F2F8]">DELETE</span> to confirm
            </label>
            <input
              id="delete-placement-confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
              placeholder={placement.studentName}
              className={inputClass}
            />
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="min-h-11 flex-1 cursor-pointer rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting || !isConfirmed}
            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {deleting ? "Deleting…" : "Delete placement"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlacementDetailClient({
  instituteCode,
  placement,
  submissions,
  primaryColor,
  canDelete = false,
}: PlacementDetailClientProps) {
  const router = useRouter();
  const [confirmStatus, setConfirmStatus] = useState<"COMPLETED" | "ACTIVE" | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await practicumFetch(`/api/practicum/placements/${placement.id}`, {
        method: "DELETE",
      });
      toast.success("Placement deleted", `Removed ${placement.studentName}'s placement.`);
      setConfirmDelete(false);
      router.push(`/${instituteCode}/practicum`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete the placement.";
      setDeleteError(msg);
      toast.error("Could not delete the placement", msg);
    } finally {
      setDeleting(false);
    }
  }

  async function changeStatus(status: "COMPLETED" | "ACTIVE") {
    setUpdating(true);
    try {
      await practicumFetch(`/api/practicum/placements/${placement.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(status === "COMPLETED" ? "Placement completed" : "Placement reopened");
      setConfirmStatus(null);
      router.refresh();
    } catch (err) {
      toast.error("Could not update the placement", err instanceof Error ? err.message : undefined);
    } finally {
      setUpdating(false);
    }
  }

  const refresh = () => router.refresh();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/${instituteCode}/practicum`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:underline dark:text-[#94A3B8]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All student teachers
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#141721] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-[#94A3B8]">
              Practicum · {placement.schoolYear}
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-[#F0F2F8] sm:text-2xl">
              {placement.studentName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PlacementStatusBadge status={placement.status} />
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:text-[#F0F2F8] dark:hover:bg-white/5"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit placement
            </button>
            {placement.status === "ACTIVE" ? (
              <button
                type="button"
                onClick={() => setConfirmStatus("COMPLETED")}
                className="min-h-11 cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:text-[#F0F2F8] dark:hover:bg-white/5"
              >
                Mark completed
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmStatus("ACTIVE")}
                className="min-h-11 cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:text-[#F0F2F8] dark:hover:bg-white/5"
              >
                Reopen
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setConfirmDelete(true);
                }}
                className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-500/20 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete placement
              </button>
            )}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-[#D1D5DB]">
            <MapPin className="h-4 w-4 shrink-0 text-slate-500 dark:text-[#94A3B8]" aria-hidden="true" />
            <div>
              <dt className="text-xs text-slate-600 dark:text-[#94A3B8]">School</dt>
              <dd className="font-medium">{placement.schoolName}</dd>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-800 dark:text-[#D1D5DB]">
            <GraduationCap className="h-4 w-4 shrink-0 text-slate-500 dark:text-[#94A3B8]" aria-hidden="true" />
            <div>
              <dt className="text-xs text-slate-600 dark:text-[#94A3B8]">Subject · Grade</dt>
              <dd className="font-medium">
                {placement.subject} · {placement.gradeLevel}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-800 dark:text-[#D1D5DB]">
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-500 dark:text-[#94A3B8]" aria-hidden="true" />
            <div>
              <dt className="text-xs text-slate-600 dark:text-[#94A3B8]">Dates</dt>
              <dd className="font-medium">
                {formatDate(placement.startDate)} – {formatDate(placement.endDate)}
              </dd>
            </div>
          </div>
        </dl>

        {placement.rubricUrl && placement.rubricFileName && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={placement.rubricUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-700 hover:underline dark:text-blue-300"
            >
              <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="font-semibold">Rubric:</span>
              <span className="truncate">{placement.rubricFileName}</span>
              {placement.rubricFileSize ? (
                <span className="text-blue-600/80 dark:text-blue-300/80">
                  ({formatBytes(placement.rubricFileSize)})
                </span>
              ) : null}
            </a>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SUBMISSION_TYPES.map((type) => {
            const s = placement.summary[type];
            return (
              <div key={type} className="rounded-2xl border border-slate-200 p-3 dark:border-white/10">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-[#94A3B8]">
                  {SUBMISSION_TYPE_LABELS[type]}
                </p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-[#F0F2F8]">
                  {s.approved}
                  <span className="text-sm font-medium text-slate-600 dark:text-[#94A3B8]"> / {s.total} approved</span>
                </p>
                {s.pendingReview > 0 && (
                  <p className="mt-1 text-xs font-semibold" style={{ color: primaryColor }}>
                    {s.pendingReview} awaiting review
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {SUBMISSION_TYPES.map((type) => {
        const items = submissions.filter((s) => s.type === type);
        return (
          <section key={type} aria-labelledby={`section-${type}`}>
            <h2 id={`section-${type}`} className="mb-3 text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
              {SUBMISSION_TYPE_LABELS[type]}{" "}
              <span className="font-mono text-sm font-medium tabular-nums text-slate-600 dark:text-[#94A3B8]">
                {items.length}
              </span>
            </h2>
            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-700 dark:border-white/15 dark:text-[#94A3B8]">
                Nothing submitted yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((s) => (
                  <SubmissionCard key={s.id} submission={s} onChanged={refresh} />
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {editing && (
        <EditPlacementDialog
          placement={placement}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      )}

      {confirmStatus && (
        <ConfirmDialog
          title={confirmStatus === "COMPLETED" ? "Mark placement as completed?" : "Reopen this placement?"}
          description={
            confirmStatus === "COMPLETED"
              ? `${placement.studentName} will no longer be able to add or resubmit work. You can reopen it later.`
              : `${placement.studentName} will be able to submit work again.`
          }
          onClose={() => !updating && setConfirmStatus(null)}
        >
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmStatus(null)}
              disabled={updating}
              className="min-h-11 flex-1 cursor-pointer rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => changeStatus(confirmStatus)}
              disabled={updating}
              className="min-h-11 flex-1 cursor-pointer rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updating ? "Saving…" : confirmStatus === "COMPLETED" ? "Mark completed" : "Reopen"}
            </button>
          </div>
        </ConfirmDialog>
      )}

      {canDelete && confirmDelete && (
        <DeletePlacementDialog
          placement={placement}
          submissions={submissions}
          deleting={deleting}
          error={deleteError}
          onClose={() => !deleting && setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
