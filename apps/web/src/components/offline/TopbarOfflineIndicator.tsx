"use client";

import { useOfflineStatus } from "./useOfflineStatus";
import { CloudOff, RefreshCw, CheckCircle2, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

interface TopbarOfflineIndicatorProps {
  instituteCode: string;
  userRole: string;
}

export default function TopbarOfflineIndicator({
  instituteCode,
  userRole,
}: TopbarOfflineIndicatorProps) {
  const isIteStudent =
    (instituteCode || "").toLowerCase() === "ite" &&
    (userRole || "").toUpperCase() === "STUDENT";

  const { online, pendingCount, syncing, lastSyncedAt } = useOfflineStatus();
  const [showSyncedBriefly, setShowSyncedBriefly] = useState(false);

  // Briefly show "All changes synced" for 4 seconds after syncing finishes
  useEffect(() => {
    if (lastSyncedAt && pendingCount === 0 && !syncing) {
      setShowSyncedBriefly(true);
      const timer = setTimeout(() => setShowSyncedBriefly(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncedAt, pendingCount, syncing]);

  if (!isIteStudent) return null;

  // 1. Syncing state
  if (syncing) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 shrink-0"
        aria-live="polite"
      >
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline">
          Syncing {pendingCount} change{pendingCount === 1 ? "" : "s"}...
        </span>
        <span className="sm:hidden">Syncing...</span>
      </div>
    );
  }

  // 2. Offline state
  if (!online) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 shrink-0"
        aria-live="polite"
        title="Lessons you've opened are available offline"
      >
        <CloudOff className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden md:inline">
          Offline: lessons you've opened are available
        </span>
        <span className="md:hidden">Offline</span>
      </div>
    );
  }

  // 3. Just synced confirmation
  if (showSyncedBriefly) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shrink-0 animate-in fade-in duration-200"
        aria-live="polite"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">All changes synced</span>
      </div>
    );
  }

  // 4. Pending items waiting for sync
  if (pendingCount > 0) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 shrink-0"
        aria-live="polite"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {pendingCount} item{pendingCount === 1 ? "" : "s"} to sync
        </span>
        <span className="sm:hidden">{pendingCount} pending</span>
      </div>
    );
  }

  // 5. Default Online state (compact & clean)
  return (
    <div
      className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] shrink-0"
      title="Connected to LMS server"
    >
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      <span>Online</span>
    </div>
  );
}
