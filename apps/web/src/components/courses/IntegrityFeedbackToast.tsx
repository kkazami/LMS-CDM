"use client";

import { useEffect } from "react";
import { Shield, Eye, Copy, ExternalLink, MousePointer, Maximize2, X } from "lucide-react";

export interface IntegrityToastData {
  id: string;
  message: string;
  eventType: "TAB_SWITCH" | "COPY_PASTE" | "FULLSCREEN_EXIT" | "RIGHT_CLICK" | "INFO";
}

interface IntegrityFeedbackToastProps {
  toast: IntegrityToastData | null;
  onDismiss: () => void;
  isMonitoringActive: boolean;
}

const EVENT_CONFIG = {
  TAB_SWITCH: {
    icon: ExternalLink,
    color: "text-amber-500 dark:text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
  },
  COPY_PASTE: {
    icon: Copy,
    color: "text-orange-500 dark:text-orange-400",
    border: "border-orange-500/30",
    bg: "bg-orange-500/10",
  },
  FULLSCREEN_EXIT: {
    icon: Maximize2,
    color: "text-rose-500 dark:text-rose-400",
    border: "border-rose-500/30",
    bg: "bg-rose-500/10",
  },
  RIGHT_CLICK: {
    icon: MousePointer,
    color: "text-blue-500 dark:text-blue-400",
    border: "border-blue-500/30",
    bg: "bg-blue-500/10",
  },
  INFO: {
    icon: Eye,
    color: "text-emerald-500 dark:text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
  },
};

export default function IntegrityFeedbackToast({
  toast,
  onDismiss,
  isMonitoringActive,
}: IntegrityFeedbackToastProps) {
  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!isMonitoringActive && !toast) return null;

  const currentConfig = toast ? EVENT_CONFIG[toast.eventType] || EVENT_CONFIG.INFO : null;
  const IconComponent = currentConfig?.icon || Shield;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 pointer-events-none"
    >
      {/* Active Flag Notification Toast */}
      {toast && (
        <div
          role="status"
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-xl border ${currentConfig?.border} bg-white/95 dark:bg-[#121624]/95 text-slate-900 dark:text-white transition-all transform duration-300 animate-in fade-in slide-in-from-bottom-2 max-w-sm`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${currentConfig?.bg} ${currentConfig?.color}`}
          >
            <IconComponent className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <p className="text-xs font-bold text-slate-800 dark:text-[#F0F2F8] leading-tight">
              {toast.message}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-[#8B92A5] mt-0.5">
              Logged transparently for instructor review
            </p>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Subtle Persistent Status Pill */}
      {isMonitoringActive && (
        <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border border-orange-500/20 bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 shadow-xs backdrop-blur-md select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
          </span>
          <span>Integrity Monitoring Active</span>
        </div>
      )}
    </div>
  );
}
