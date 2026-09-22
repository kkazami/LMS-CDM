"use client";

import React from "react";
import { UserCheck, Shield, HelpCircle } from "lucide-react";

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
  return (
    <div className="flex items-start justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
      <div className="flex items-start gap-3">
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
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Post Anonymously
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
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
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
          checked ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
