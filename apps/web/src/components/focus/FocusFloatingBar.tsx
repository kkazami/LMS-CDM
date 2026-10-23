/**
 * apps/web/src/components/focus/FocusFloatingBar.tsx
 *
 * Slim, non-intrusive floating bar displayed while Focus Mode is active.
 * Shows remaining or elapsed time, paused state, tab switches, menu navigation popover, and exit button.
 */

"use client";

import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Pause,
  Play,
  Maximize2,
  Minimize2,
  LogOut,
  EyeOff,
  Menu,
  X,
  Compass,
} from "lucide-react";
import { useFocusMode } from "./FocusModeContext";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { getIteStudentNavLinks } from "@/components/layout/Sidebar";

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function FocusFloatingBar() {
  const focus = useFocusMode();
  const pathname = usePathname() || "";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Esc closes, Tab traps inside the menu panel, focus returns on close
  useDialogA11y(isMenuOpen, () => setIsMenuOpen(false), menuPanelRef);

  const instituteCode = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    return parts[0] || "ite";
  }, [pathname]);

  const navLinks = useMemo(() => {
    return getIteStudentNavLinks(instituteCode);
  }, [instituteCode]);

  if (!focus || !focus.isActive) return null;

  const {
    elapsedFocusedSeconds,
    plannedMinutes,
    isPaused,
    isFullscreen,
    tabSwitchCount,
    toggleFullscreen,
    endSession,
    awayNotice,
  } = focus;

  // Calculate remaining or elapsed string
  const totalPlannedSeconds = plannedMinutes ? plannedMinutes * 60 : null;
  const remainingSeconds = totalPlannedSeconds
    ? Math.max(0, totalPlannedSeconds - elapsedFocusedSeconds)
    : null;

  const timeDisplay = remainingSeconds !== null
    ? `${formatDuration(remainingSeconds)} left`
    : `${formatDuration(elapsedFocusedSeconds)} elapsed`;

  const progressPercent = totalPlannedSeconds
    ? Math.min(100, Math.round((elapsedFocusedSeconds / totalPlannedSeconds) * 100))
    : null;

  return (
    <>
      {/* Top Floating Bar */}
      <aside
        aria-label="Active Focus Mode session"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[95vw] max-w-xl animate-in fade-in slide-in-from-top-4 duration-300"
      >
        <div className="relative flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-900/95 dark:bg-[#141721]/95 text-white backdrop-blur-md border border-slate-700/60 dark:border-white/10 shadow-2xl">
          {/* Left: Indicator & Time */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <span
              className={`flex h-2.5 w-2.5 rounded-full ${
                isPaused ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
              }`}
              aria-hidden="true"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className="font-mono text-xs sm:text-base font-bold tracking-tight text-white"
                  aria-label={`Focus timer: ${timeDisplay}`}
                >
                  {timeDisplay}
                </span>
                {isPaused && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Pause className="h-2.5 w-2.5" />
                    Paused
                  </span>
                )}
              </div>
              {progressPercent !== null && (
                <div className="w-20 sm:w-32 h-1 bg-white/20 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Center / Right: Tab Switches & Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {tabSwitchCount > 0 && (
              <span
                className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium text-slate-300 bg-white/10"
                title={`${tabSwitchCount} tab switch${tabSwitchCount > 1 ? "es" : ""} detected`}
              >
                <EyeOff className="h-3 w-3 text-slate-400" />
                <span>{tabSwitchCount}</span>
              </span>
            )}

            {/* Menu Popover Toggle */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label="Open navigation menu"
              aria-expanded={isMenuOpen}
              aria-haspopup="dialog"
            >
              <Menu className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Menu</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter distraction-free fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Exit Focus */}
            <button
              type="button"
              onClick={() => endSession(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              aria-label="Exit focus mode"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit</span>
            </button>
          </div>

          {/* Navigation Popover / Dialog while in Focus Mode */}
          {isMenuOpen && (
            <div
              ref={menuPanelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Focus mode navigation"
              className="absolute top-[calc(100%+8px)] left-1/2 -translate-x-1/2 w-[min(380px,calc(100vw-24px))] rounded-2xl bg-slate-900/98 dark:bg-[#141721]/98 border border-slate-700/80 dark:border-white/15 p-3.5 shadow-2xl backdrop-blur-xl z-50 text-white animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Focus Navigation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Persistence reassurance */}
              <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-300 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>Your focus session keeps running while you navigate.</span>
              </div>

              {/* Nav links grid */}
              <nav className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[55vh] overflow-y-auto pr-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isCurrent = pathname === link.href || pathname.startsWith(link.href + "/");

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isCurrent
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs"
                          : "text-slate-200 hover:text-white hover:bg-white/10 border border-transparent"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </aside>

      {/* Screen Reader Live Region for Away notices */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {awayNotice}
      </div>
    </>
  );
}
