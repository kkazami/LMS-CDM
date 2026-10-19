"use client";

import React, { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ShieldAlert, AlertTriangle, CheckCircle2, X, Clock, MessageSquareQuote } from "lucide-react";

export interface CodeLabAlertItem {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface CodeLabAlertModalProps {
  alerts: CodeLabAlertItem[];
  institute: string;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CodeLabAlertModal({ alerts, institute: _institute }: CodeLabAlertModalProps) {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [activeAlert, setActiveAlert] = useState<CodeLabAlertItem | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isDismissed || alerts.length === 0) return;

    const alertIdParam = searchParams.get("alertId");
    if (alertIdParam) {
      const targeted = alerts.find((a) => a.id === alertIdParam);
      if (targeted) {
        setActiveAlert(targeted);
        return;
      }
    }

    // Otherwise, find the newest unread alert (if any)
    const unreadAlert = alerts.find((a) => !a.isRead);
    if (unreadAlert) {
      setActiveAlert(unreadAlert);
    }
  }, [alerts, searchParams, isDismissed]);

  const handleAcknowledge = async () => {
    if (!activeAlert) return;

    const alertIdToMark = activeAlert.id;
    setIsDismissed(true);
    setActiveAlert(null);

    // Clean up URL query param if present
    if (searchParams.get("alertId")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("alertId");
      const nextQuery = params.toString() ? `?${params.toString()}` : "";
      startTransition(() => {
        router.replace(`${pathname}${nextQuery}`, { scroll: false });
      });
    }

    // Mark as read in the database
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", id: alertIdToMark }),
      });
    } catch (err) {
      console.error("Failed to mark alert as read:", err);
    }
  };

  if (!mounted || !activeAlert) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-slate-800 dark:text-[#F0F2F8] animate-in zoom-in-95 duration-150 overflow-hidden">
        {/* Soft Ambient Amber Glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-amber-500/15 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-500/30 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
                <AlertTriangle className="w-3 h-3" />
                <span>Instructor Notice</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F0F2F8] mt-1 leading-tight">
                {activeAlert.title || "Academic Support Alert"}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAcknowledge}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Body Card */}
        <div className="relative z-10 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#1A1D27] border border-slate-200/80 dark:border-white/5 space-y-3">
          <div className="flex items-start gap-2.5">
            <MessageSquareQuote className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-slate-700 dark:text-[#D1D5DB] leading-relaxed whitespace-pre-wrap font-normal">
              {activeAlert.message}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-[#8B92A5] font-mono pt-1 border-t border-slate-200/50 dark:border-white/5">
            <Clock className="w-3.5 h-3.5" />
            <span>Sent {timeAgo(activeAlert.createdAt)}</span>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="relative z-10 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleAcknowledge}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Understood &amp; Continue</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
