"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Sparkles, X } from "lucide-react";
import BadgeIcon from "@/components/common/BadgeIcon";
import { formatBadgeName, type BadgeDefinition } from "@/lib/gamification/badge-catalog";
import { BADGES_EARNED_EVENT, earnedBadgeHref } from "@/lib/gamification/badge-links";
import { EXP_VALUES } from "@/lib/gamification/exp-engine";

export interface UnnotifiedBadge {
  id: string;
  badgeRuleId: string;
  earnedAt: string;
  definition?: BadgeDefinition;
}

export default function BadgeToastProvider({ instituteCode }: { instituteCode: string }) {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<UnnotifiedBadge[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function checkNewBadges() {
      try {
        const res = await fetch("/api/gamification/new-badges");
        if (!res.ok) return;
        const data = (await res.json()) as UnnotifiedBadge[];
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setToasts(current => [...current, ...data.filter(badge => !current.some(toast => toast.id === badge.id))]);

          // Clear the indicators after the toasts are displayed.
          const badgeIds = data.map((b) => b.id);
          await fetch("/api/gamification/new-badges", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ badgeIds }),
          }).catch((err) => console.error("Mark badges viewed failed", err));
        }
      } catch {
        // silent fail
      }
    }

    void checkNewBadges();
    window.addEventListener(BADGES_EARNED_EVENT, checkNewBadges);
    return () => {
      cancelled = true;
      window.removeEventListener(BADGES_EARNED_EVENT, checkNewBadges);
    };
  }, [pathname]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-[calc(8rem+env(safe-area-inset-bottom,0px))] right-3 z-80 flex w-[calc(100%_-_1.5rem)] max-w-sm flex-col gap-2.5 sm:right-6 lg:bottom-24">
      {toasts.map((toast) => (
        <BadgeToastItem
          key={toast.id}
          toast={toast}
          href={earnedBadgeHref(instituteCode, toast.badgeRuleId)}
          onDismiss={removeToast}
        />
      ))}
    </div>
  );
}

function BadgeToastItem({
  toast,
  href,
  onDismiss,
}: {
  toast: UnnotifiedBadge;
  href: string;
  onDismiss: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (hovered || focused) return;
    const timer = setTimeout(() => onDismiss(toast.id), 8000);
    return () => clearTimeout(timer);
  }, [focused, hovered, onDismiss, toast.id]);

  const def = toast.definition;
  const name = def?.name || formatBadgeName(toast.badgeRuleId) || "New Achievement";
  const desc = def?.description || "You earned a new badge!";
  const iconName = def?.iconName || "Award";
  const color = def?.color || "text-[#F97316]";
  const darkColor = def?.darkColor || "dark:text-[#FB923C]";
  const bgColor = def?.bgColor || "bg-[#F97316]/10";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      className="pointer-events-auto relative rounded-2xl border border-slate-200 bg-white shadow-xl motion-safe:animate-slide-in-right dark:border-white/10 dark:bg-[#1A1D27]"
    >
      <Link href={href} onClick={() => onDismiss(toast.id)} className="flex items-start gap-3 rounded-2xl p-4 pr-12 hover:bg-slate-50 dark:hover:bg-white/5" aria-label={`View earned badge: ${name}`}>
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
          </div>

          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] truncate mt-0.5">
            {name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] line-clamp-1 mt-0.5">
            {desc}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span className="inline-flex items-center gap-1">View badge <ArrowRight aria-hidden="true" className="size-3.5" /></span>
            <span className="text-emerald-700 dark:text-emerald-400">+{EXP_VALUES.badge_earned} EXP</span>
          </div>
        </div>
      </Link>
      <button type="button" onClick={() => onDismiss(toast.id)} className="absolute right-1 top-1 grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" aria-label="Dismiss notification">
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
