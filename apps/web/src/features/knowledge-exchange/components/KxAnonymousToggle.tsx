"use client";

import React, { useId } from "react";
import { UserCheck, Shield } from "lucide-react";

interface KxAnonymousToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function KxAnonymousToggle({
  checked,
  onChange,
  disabled = false,
}: KxAnonymousToggleProps) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <div className="flex items-start justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={`p-2 rounded-lg shrink-0 transition-colors ${
            checked
              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
              : "bg-slate-200/60 dark:bg-white/5 text-slate-500"
          }`}
        >
          {checked ? (
            <Shield className="h-5 w-5" />
          ) : (
            <UserCheck className="h-5 w-5" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span id={labelId} className="text-sm font-semibold text-slate-900 dark:text-white">
              Post Anonymously
            </span>
          </div>
          <p id={descriptionId} className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Your name, avatar, and profile links will be hidden from peer
            students.
            <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Course instructors and system admins can view real identities to
              uphold academic integrity.
            </span>
          </p>
        </div>
      </div>

      {/* Switch Toggle */}
      <button
        type="button"
        role="switch"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span aria-hidden="true" className={`pointer-events-none relative inline-flex h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${checked ? "bg-orange-600" : "bg-slate-400 dark:bg-slate-600"}`}>
          <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${checked ? "translate-x-5" : "translate-x-0"}`} />
        </span>
      </button>
    </div>
  );
}
