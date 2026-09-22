import React from "react";
import { CheckCircle2, Lock, XCircle, HelpCircle, Pin } from "lucide-react";
import { KxPostStatus } from "../types";

interface KxStatusBadgeProps {
  status: KxPostStatus;
  isPinned?: boolean;
  className?: string;
}

export function KxStatusBadge({ status, isPinned, className = "" }: KxStatusBadgeProps) {
  if (isPinned) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 ${className}`}
      >
        <Pin className="w-3 h-3" />
        Pinned
      </span>
    );
  }

  switch (status) {
    case "ANSWERED":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3" />
          Answered
        </span>
      );
    case "CLOSED":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 ${className}`}
        >
          <XCircle className="w-3 h-3" />
          Closed
        </span>
      );
    case "LOCKED":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 ${className}`}
        >
          <Lock className="w-3 h-3" />
          Locked
        </span>
      );
    case "OPEN":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground border border-border/50 ${className}`}
        >
          <HelpCircle className="w-3 h-3" />
          Open
        </span>
      );
  }
}
