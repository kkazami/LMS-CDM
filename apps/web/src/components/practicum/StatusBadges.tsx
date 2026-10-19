import type { SubmissionStatus } from "@/lib/practicum/rules";
import { STATUS_CLASSES, statusLabel } from "./shared";

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${STATUS_CLASSES[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

export function PlacementStatusBadge({ status }: { status: "ACTIVE" | "COMPLETED" }) {
  const classes =
    status === "ACTIVE"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
      : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${classes}`}
    >
      {status === "ACTIVE" ? "Active" : "Completed"}
    </span>
  );
}
