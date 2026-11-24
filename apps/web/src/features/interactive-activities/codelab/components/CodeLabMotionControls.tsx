"use client";

import { Gauge } from "lucide-react";
import { TypingBanner } from "@/components/motion/TypingBanner";
import { setCodeLabReducedMotion, useCodeLabMotionPreference, useCodeLabReducedMotion } from "./codelab-motion";

export function CodeLabMotionToggle() {
  const preference = useCodeLabMotionPreference();
  const reduced = preference !== "full";

  return (
    <button
      type="button"
      aria-pressed={reduced}
      data-codelab-motion={reduced ? "off" : "on"}
      disabled={preference === "system"}
      onClick={() => setCodeLabReducedMotion(!reduced)}
      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 enabled:hover:bg-slate-100 aria-pressed:border-orange-400 aria-pressed:bg-orange-50 aria-pressed:text-orange-900 dark:border-white/10 dark:bg-[#141721] dark:text-slate-200 dark:enabled:hover:bg-white/10 dark:aria-pressed:border-orange-500/50 dark:aria-pressed:bg-orange-500/10 dark:aria-pressed:text-orange-200"
    >
      <Gauge aria-hidden="true" className="size-4" />
      Reduce motion{preference === "system" ? " (system)" : ""}
    </button>
  );
}

export function CodeLabTitle({ text, cursorColor }: { text: string; cursorColor?: string }) {
  const reduced = useCodeLabReducedMotion();
  return reduced ? text : <TypingBanner text={text} speed={35} cursorColor={cursorColor} />;
}
