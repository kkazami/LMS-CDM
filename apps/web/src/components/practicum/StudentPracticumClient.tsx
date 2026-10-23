"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, GraduationCap, MapPin, NotebookPen, Plus, UserRound, X } from "lucide-react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { PlacementDTO, SubmissionDTO } from "@/lib/practicum/dto";
import {
  SUBMISSION_TYPES,
  SUBMISSION_TYPE_LABELS,
  canResubmit,
  type SubmissionType,
} from "@/lib/practicum/rules";
import FeedbackThread from "./FeedbackThread";
import { PlacementStatusBadge, SubmissionStatusBadge } from "./StatusBadges";
import SubmissionPreview from "./SubmissionPreview";
import UploadDialog, { type UploadTarget } from "./UploadDialog";
import { formatDate } from "./shared";

interface StudentPracticumClientProps {
  placements: PlacementDTO[];
  placement: PlacementDTO | null;
  submissions: SubmissionDTO[];
  uploadsConfigured: boolean;
  primaryColor: string;
}

const NEW_LABEL: Record<SubmissionType, string> = {
  LESSON_PLAN: "New lesson plan",
  DEMO_VIDEO: "New demo video",
  PORTFOLIO_EVIDENCE: "New portfolio evidence",
};

const EMPTY_LABEL: Record<SubmissionType, string> = {
  LESSON_PLAN: "You have not submitted any lesson plans yet.",
  DEMO_VIDEO: "You have not submitted any demo videos yet.",
  PORTFOLIO_EVIDENCE: "You have not submitted any portfolio evidence yet.",
};

function SubmissionDetailDialog({
  submission,
  canRevise,
  onResubmit,
  onClose,
}: {
  submission: SubmissionDTO;
  canRevise: boolean;
  onResubmit: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogA11y(true, onClose, panelRef);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-detail-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl outline-none dark:border-white/10 dark:bg-[#141721] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 id="submission-detail-title" className="truncate text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
              {submission.title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-[#94A3B8]">
              <SubmissionStatusBadge status={submission.status} />
              <span>Version {submission.version}</span>
              <span>Submitted {formatDate(submission.submittedAt)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-[#94A3B8] dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-5 py-4">
          {submission.description && (
            <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-[#D1D5DB]">{submission.description}</p>
          )}
          <SubmissionPreview submission={submission} />
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">Supervisor feedback</h3>
            <FeedbackThread feedback={submission.feedback} />
          </section>
        </div>

        {canRevise && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-amber-500/5 px-5 py-3 dark:border-white/10">
            <p className="text-sm text-amber-800 dark:text-amber-300">Your supervisor asked for a revision.</p>
            <button
              type="button"
              onClick={onResubmit}
              className="min-h-11 shrink-0 cursor-pointer rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Resubmit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentPracticumClient({
  placements,
  placement,
  submissions,
  uploadsConfigured,
  primaryColor,
}: StudentPracticumClientProps) {
  const router = useRouter();
  const [activeType, setActiveType] = useState<SubmissionType>("LESSON_PLAN");
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null);
  const [openSubmissionId, setOpenSubmissionId] = useState<string | null>(null);

  const openSubmission = useMemo(
    () => submissions.find((s) => s.id === openSubmissionId) ?? null,
    [submissions, openSubmissionId]
  );

  if (!placement) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-white/10 dark:bg-[#141721]">
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}
        >
          <NotebookPen className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">Practicum</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-[#94A3B8]">
          You have not been assigned a practicum placement yet. Your supervisor will add you.
        </p>
      </div>
    );
  }

  const canSubmit = placement.status === "ACTIVE";
  const visible = submissions.filter((s) => s.type === activeType);

  function refresh() {
    setUploadTarget(null);
    setOpenSubmissionId(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Placement card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#141721] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-[#94A3B8]">
              Practicum placement · {placement.schoolYear}
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-[#F0F2F8] sm:text-2xl">
              {placement.schoolName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {placements.length > 1 && (
              <>
                <label htmlFor="placement-switch" className="sr-only">
                  Switch placement
                </label>
                <select
                  id="placement-switch"
                  value={placement.id}
                  onChange={(e) => router.push(`?placement=${encodeURIComponent(e.target.value)}`)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-white/15 dark:bg-[#1E2132] dark:text-[#F0F2F8] [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {placements.map((p) => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-[#1E2132] text-slate-900 dark:text-[#F0F2F8]">
                      {p.schoolYear} · {p.schoolName}
                    </option>
                  ))}
                </select>
              </>
            )}
            <PlacementStatusBadge status={placement.status} />
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
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
            <UserRound className="h-4 w-4 shrink-0 text-slate-500 dark:text-[#94A3B8]" aria-hidden="true" />
            <div>
              <dt className="text-xs text-slate-600 dark:text-[#94A3B8]">Supervisor</dt>
              <dd className="font-medium">{placement.supervisorName}</dd>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-800 dark:text-[#D1D5DB]">
            <MapPin className="h-4 w-4 shrink-0 text-slate-500 dark:text-[#94A3B8]" aria-hidden="true" />
            <div>
              <dt className="text-xs text-slate-600 dark:text-[#94A3B8]">School</dt>
              <dd className="font-medium">{placement.schoolName}</dd>
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
      </section>

      {/* Progress summary (from the database) */}
      <section aria-label="Progress" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SUBMISSION_TYPES.map((type) => {
          const s = placement.summary[type];
          const percent = s.total === 0 ? 0 : Math.round((s.approved / s.total) * 100);
          return (
            <div
              key={type}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#141721]"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-[#94A3B8]">
                {SUBMISSION_TYPE_LABELS[type]}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-[#F0F2F8]">
                {s.approved}
                <span className="text-base font-medium text-slate-600 dark:text-[#94A3B8]"> / {s.total} approved</span>
              </p>
              <div
                role="progressbar"
                aria-label={`${SUBMISSION_TYPE_LABELS[type]} approved`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
              >
                <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: primaryColor }} />
              </div>
              {(s.pendingReview > 0 || s.needsRevision > 0) && (
                <p className="mt-2 text-xs text-slate-700 dark:text-[#94A3B8]">
                  {s.pendingReview > 0 && `${s.pendingReview} awaiting review`}
                  {s.pendingReview > 0 && s.needsRevision > 0 && " · "}
                  {s.needsRevision > 0 && `${s.needsRevision} need revision`}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Tabs */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#141721]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 pt-3 dark:border-white/10">
          <div role="tablist" aria-label="Submission types" className="flex gap-1 overflow-x-auto">
            {SUBMISSION_TYPES.map((type) => {
              const selected = type === activeType;
              return (
                <button
                  key={type}
                  id={`tab-${type}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`panel-${type}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveType(type)}
                  onKeyDown={(e) => {
                    const index = SUBMISSION_TYPES.indexOf(type);
                    if (e.key === "ArrowRight") setActiveType(SUBMISSION_TYPES[(index + 1) % SUBMISSION_TYPES.length]);
                    if (e.key === "ArrowLeft")
                      setActiveType(SUBMISSION_TYPES[(index + SUBMISSION_TYPES.length - 1) % SUBMISSION_TYPES.length]);
                  }}
                  className={`-mb-px cursor-pointer whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${
                    selected
                      ? "text-slate-900 dark:text-[#F0F2F8]"
                      : "border-transparent text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-[#F0F2F8]"
                  }`}
                  style={selected ? { borderColor: primaryColor } : undefined}
                >
                  {SUBMISSION_TYPE_LABELS[type]}
                  <span className="ml-1.5 font-mono text-xs tabular-nums text-slate-600 dark:text-[#94A3B8]">
                    {placement.summary[type].total}
                  </span>
                </button>
              );
            })}
          </div>
          {canSubmit && (
            <button
              type="button"
              onClick={() => setUploadTarget({ kind: "new", placementId: placement.id, type: activeType })}
              className="mb-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {NEW_LABEL[activeType]}
            </button>
          )}
        </div>

        <div id={`panel-${activeType}`} role="tabpanel" aria-labelledby={`tab-${activeType}`} className="p-4">
          {!canSubmit && (
            <p className="mb-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-[#181B26] dark:text-[#D1D5DB]">
              This placement is completed. You can still view your submissions and feedback.
            </p>
          )}
          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-700 dark:text-[#94A3B8]">{EMPTY_LABEL[activeType]}</p>
          ) : (
            <ul className="space-y-2">
              {visible.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setOpenSubmissionId(s.id)}
                    className="flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">{s.title}</p>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-[#94A3B8]">
                        Version {s.version} · {formatDate(s.submittedAt)}
                        {s.feedback.length > 0 && ` · ${s.feedback.length} feedback`}
                      </p>
                    </div>
                    <SubmissionStatusBadge status={s.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {openSubmission && (
        <SubmissionDetailDialog
          submission={openSubmission}
          canRevise={canSubmit && canResubmit(openSubmission.status)}
          onClose={() => setOpenSubmissionId(null)}
          onResubmit={() => {
            setUploadTarget({ kind: "resubmit", submission: openSubmission });
            setOpenSubmissionId(null);
          }}
        />
      )}

      {uploadTarget && (
        <UploadDialog
          target={uploadTarget}
          uploadsConfigured={uploadsConfigured}
          onClose={() => setUploadTarget(null)}
          onDone={refresh}
        />
      )}
    </div>
  );
}
