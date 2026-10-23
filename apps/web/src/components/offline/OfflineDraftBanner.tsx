"use client";

import { useOfflineStatus } from "./useOfflineStatus";
import { CloudOff, FileEdit, AlertCircle, Clock } from "lucide-react";

interface OfflineDraftBannerProps {
  itemTitle: string;
  hasUnsentDraft: boolean;
  lastSavedManila: string | null;
  isPastDeadline: boolean;
  isSubmitted: boolean;
}

export default function OfflineDraftBanner({
  itemTitle,
  hasUnsentDraft,
  lastSavedManila,
  isPastDeadline,
  isSubmitted,
}: OfflineDraftBannerProps) {
  const { online, isIteStudent } = useOfflineStatus();

  if (!isIteStudent || isSubmitted) return null;

  return (
    <div className="space-y-3 mb-5">
      {/* 1. Offline Mode Banner */}
      {!online && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CloudOff className="h-4 w-4 shrink-0" />
            <span>You're currently offline</span>
          </div>
          <p className="leading-relaxed">
            Your draft notes and links are automatically saved on this device.
            Attach files after you reconnect.
          </p>
          <div className="flex items-center gap-1.5 font-medium text-[11px] pt-1 border-t border-amber-500/20">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              Your submission time is when it reaches the server, so connect and press Submit before the deadline.
            </span>
          </div>
        </div>
      )}

      {/* 2. Unsent Draft Banner (Shown when online and student has a locally saved draft) */}
      {online && hasUnsentDraft && (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-3">
          <FileEdit className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <h4 className="font-bold text-sm">
              You have an unsent draft for {itemTitle}
            </h4>
            <p className="leading-relaxed">
              Saved locally on this device {lastSavedManila ? `at ${lastSavedManila}` : ""}.
              Review your work and press Submit before the deadline.
            </p>
          </div>
        </div>
      )}

      {/* 3. Local Draft Timestamp Indicator */}
      {lastSavedManila && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          <span>Draft saved on this device: {lastSavedManila} (Manila time)</span>
        </div>
      )}
    </div>
  );
}
