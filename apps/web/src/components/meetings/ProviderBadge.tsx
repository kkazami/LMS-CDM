"use client";

import { Video, Globe } from "lucide-react";
import type { MeetingProvider } from "@/lib/ite/meetings/types";

interface ProviderBadgeProps {
  provider: MeetingProvider;
  className?: string;
}

export default function ProviderBadge({ provider, className = "" }: ProviderBadgeProps) {
  switch (provider) {
    case "GOOGLE_MEET":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 ${className}`}
        >
          <Video className="h-3 w-3" />
          Google Meet
        </span>
      );
    case "GOOGLE_CLASSROOM":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 ${className}`}
        >
          <Video className="h-3 w-3" />
          Google Classroom
        </span>
      );
    case "ZOOM":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 ${className}`}
        >
          <Video className="h-3 w-3" />
          Zoom
        </span>
      );
    case "MICROSOFT_TEAMS":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 ${className}`}
        >
          <Video className="h-3 w-3" />
          Microsoft Teams
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 ${className}`}
        >
          <Globe className="h-3 w-3" />
          Meeting Link
        </span>
      );
  }
}
