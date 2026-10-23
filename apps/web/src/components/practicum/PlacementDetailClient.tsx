"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronDown, GraduationCap, Loader2, MapPin } from "lucide-react";
import { toast } from "@/components/common/Toast";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import type { PlacementDTO, SubmissionDTO } from "@/lib/practicum/dto";
import {
  SUBMISSION_TYPES,
  SUBMISSION_TYPE_LABELS,
  statusAfterFeedback,
  type FeedbackDecision,
} from "@/lib/practicum/rules";
import FeedbackThread from "./FeedbackThread";
import { PlacementStatusBadge, SubmissionStatusBadge } from "./StatusBadges";
import SubmissionPreview from "./SubmissionPreview";
import { formatDate, practicumFetch } from "./shared";

interface PlacementDetailClientProps {
  instituteCode: string;
  placement: PlacementDTO;
  submissions: SubmissionDTO[];
  primaryColor: string;
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
      <div>
        <label htmlFor={`${id}-comment`} className="mb-1 block text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">
          Feedback
        </label>
        <textarea
          id={`${id}-comment`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={4000}
          disabled={saving}
          className={inputClass}
        />
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-800 dark:text-[#F0F2F8]">Decision</legend>
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

  return (
    <li className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#141721]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl p-3 text-left hover:bg-slate-50 dark:hover:bg-white/5"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">{submission.title}</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-[#94A3B8]">
            Version {submission.version} · {formatDate(submission.submittedAt)}
            {submission.feedback.length > 0 && ` · ${submission.feedback.length} feedback`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SubmissionStatusBadge status={submission.status} />
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition-transform dark:text-[#94A3B8] ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>

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

export default function PlacementDetailClient({
  instituteCode,
  placement,
  submissions,
  primaryColor,
}: PlacementDetailClientProps) {
  const router = useRouter();
  const [confirmStatus, setConfirmStatus] = useState<"COMPLETED" | "ACTIVE" | null>(null);
  const [updating, setUpdating] = useState(false);

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
          <div className="flex items-center gap-2">
            <PlacementStatusBadge status={placement.status} />
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
    </div>
  );
}
