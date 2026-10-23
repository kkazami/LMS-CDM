import type { FeedbackDTO } from "@/lib/practicum/dto";
import { formatDateTime } from "./shared";

const DECISION_LABEL: Record<FeedbackDTO["decision"], string> = {
  COMMENT: "Comment",
  NEEDS_REVISION: "Needs revision",
  APPROVED: "Approved",
};

const DECISION_CLASS: Record<FeedbackDTO["decision"], string> = {
  COMMENT: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25",
  NEEDS_REVISION: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
};

/** The supervisor's feedback history for one submission, oldest first. */
export default function FeedbackThread({ feedback }: { feedback: FeedbackDTO[] }) {
  if (feedback.length === 0) {
    return <p className="text-sm text-slate-600 dark:text-[#94A3B8]">No feedback yet.</p>;
  }

  return (
    <ul className="space-y-3" aria-label="Feedback history">
      {feedback.map((entry) => (
        <li
          key={entry.id}
          className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181B26] p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">{entry.authorName}</span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${DECISION_CLASS[entry.decision]}`}
              >
                {DECISION_LABEL[entry.decision]}
              </span>
              {entry.score !== null && (
                <span className="inline-flex items-center rounded-full border border-slate-300 dark:border-white/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-[#F0F2F8] tabular-nums">
                  Score {entry.score}/100
                </span>
              )}
            </div>
            <time dateTime={entry.createdAt} className="text-xs text-slate-600 dark:text-[#94A3B8]">
              {formatDateTime(entry.createdAt)}
            </time>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800 dark:text-[#D1D5DB]">{entry.comment}</p>
        </li>
      ))}
    </ul>
  );
}
