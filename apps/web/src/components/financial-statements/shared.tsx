"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowLeftRight,
  Landmark,
  Scale,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import type { StatementStatus, StatementType, ValidationIssue } from "@/lib/financial-statements/types";

export const TEMPLATE_ICONS: Record<StatementType, LucideIcon> = {
  INCOME_STATEMENT: TrendingUp,
  BALANCE_SHEET: Scale,
  CASH_FLOW: ArrowLeftRight,
  OWNERS_EQUITY: Landmark,
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; issues?: ValidationIssue[] };

/** Thin fetch wrapper that always resolves to a typed success/failure result. */
export async function callApi<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    });
    const json = (await res.json().catch(() => ({}))) as { message?: string; issues?: ValidationIssue[] } & T;
    if (!res.ok) {
      return { ok: false, message: json.message ?? "Something went wrong. Please try again.", issues: json.issues };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, message: "Network error. Check your connection and try again." };
  }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function StatusBadge({ status }: { status: StatementStatus }) {
  const generated = status === "GENERATED";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
        generated
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
          : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/10"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${generated ? "bg-emerald-500" : "bg-amber-500"}`} />
      {generated ? "Generated" : "Draft"}
    </span>
  );
}

export const cardClass =
  "rounded-xl border-2 border-slate-200 dark:border-white/15 bg-white dark:bg-[#141721] shadow-xs";

export const inputClass =
  "w-full min-h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#10131B] px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors focus:outline-none focus:border-amber-500 disabled:opacity-60";

export const mutedText = "text-slate-500 dark:text-slate-400";
export const headingText = "text-slate-900 dark:text-white";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible confirm dialog (focus moves in, Escape cancels). */
export function ConfirmDialog({ open, title, description, confirmLabel, destructive, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-120 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={onCancel} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="fs-confirm-title"
        className={`relative w-full max-w-md ${cardClass} p-5 shadow-lg`}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 id="fs-confirm-title" className={`pr-8 text-base font-bold ${headingText}`}>
          {title}
        </h2>
        <div className={`mt-2 text-xs sm:text-sm leading-relaxed ${mutedText}`}>{description}</div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-9 rounded-lg border border-slate-200 dark:border-white/10 px-4 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-60 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`min-h-9 rounded-lg px-4 text-xs font-semibold text-white disabled:opacity-60 cursor-pointer ${
              destructive ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
            }`}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
