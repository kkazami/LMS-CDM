"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import BadgeIcon from "@/components/common/BadgeIcon";
import type { BadgeDefinition } from "@/lib/gamification/badge-catalog";

export interface UnnotifiedBadge {
  id: string;
  badgeRuleId: string;
  earnedAt: string;
  definition?: BadgeDefinition;
}

export default function BadgeToastProvider() {
  const [toasts, setToasts] = useState<UnnotifiedBadge[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function checkNewBadges() {
      try {
        const res = await fetch("/api/gamification/new-badges");
        if (!res.ok) return;
        const data = (await res.json()) as UnnotifiedBadge[];
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setToasts(data);

          // Mark them as viewed after a brief delay
          const badgeIds = data.map((b) => b.id);
          fetch("/api/gamification/new-badges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ badgeIds }),
          }).catch((err) => console.error("Mark badges viewed failed", err));
        }
      } catch {
        // silent fail
      }
    }

    checkNewBadges();
    return () => {
      cancelled = true;
    };
  }, []);

  function removeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <BadgeToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function BadgeToastItem({
  toast,
  onDismiss,
}: {
  toast: UnnotifiedBadge;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const def = toast.definition;
  const name = def?.name || "New Achievement";
  const desc = def?.description || "You earned a new badge!";
  const iconName = def?.iconName || "Award";
  const color = def?.color || "text-[#F97316]";
  const darkColor = def?.darkColor || "dark:text-[#FB923C]";
  const bgColor = def?.bgColor || "bg-[#F97316]/10";

  return (
    <div className="pointer-events-auto animate-slide-in-right rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] p-4 shadow-2xl transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl ${bgColor} shrink-0`}>
          <BadgeIcon name={iconName} className={`w-6 h-6 ${color} ${darkColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Badge Unlocked!
              </span>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded-md cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] truncate mt-0.5">
            {name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] line-clamp-1 mt-0.5">
            {desc}
          </p>

          <div className="mt-2 flex items-center gap-2 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
            <span>+25 EXP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
