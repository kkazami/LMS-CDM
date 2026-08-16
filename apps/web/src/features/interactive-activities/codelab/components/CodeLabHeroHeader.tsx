"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import {
  PythonLogo,
  CppLogo,
  CSharpLogo,
  JavaLogo,
  JavaScriptLogo,
  SqlLogo,
  HtmlLogo,
  CssLogo,
} from "./LanguageLogos";

const TRACK_LOGOS = [
  PythonLogo,
  CppLogo,
  CSharpLogo,
  JavaLogo,
  JavaScriptLogo,
  SqlLogo,
  HtmlLogo,
  CssLogo,
];

// Replicated arrays for seamless continuous horizontal ticker scrolling
const MARQUEE_ROW_1 = [...TRACK_LOGOS, ...TRACK_LOGOS, ...TRACK_LOGOS, ...TRACK_LOGOS];
const MARQUEE_ROW_2 = [
  ...TRACK_LOGOS.slice(4),
  ...TRACK_LOGOS.slice(0, 4),
  ...TRACK_LOGOS.slice(4),
  ...TRACK_LOGOS.slice(0, 4),
  ...TRACK_LOGOS.slice(4),
  ...TRACK_LOGOS.slice(0, 4),
  ...TRACK_LOGOS.slice(4),
  ...TRACK_LOGOS.slice(0, 4),
];

interface CodeLabHeroHeaderProps {
  institute: string;
}

export default function CodeLabHeroHeader({ institute: _institute }: CodeLabHeroHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs transition-colors">
      {/* ── Continuous Horizontal Marquee Scrolling Icons ── */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden flex flex-col justify-between py-2.5"
        aria-hidden="true"
      >
        {/* Top row: smooth continuous scroll to the left */}
        <div className="overflow-hidden w-full opacity-20 dark:opacity-15">
          <div className="animate-marquee-left flex items-center gap-12 sm:gap-16">
            {MARQUEE_ROW_1.map((Logo, i) => (
              <div key={`top-${i}`} className="shrink-0">
                <Logo size={28} />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row: smooth continuous scroll to the right */}
        <div className="overflow-hidden w-full opacity-15 dark:opacity-10">
          <div className="animate-marquee-right flex items-center gap-14 sm:gap-20">
            {MARQUEE_ROW_2.map((Logo, i) => (
              <div key={`bot-${i}`} className="shrink-0">
                <Logo size={34} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Foreground Text (Dual-Theme Light & Dark) ── */}
      <div className="relative z-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-500/20 dark:border-orange-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ICS Interactive CodeLab Tracks</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8]">
          Choose Your Learning Track
        </h1>
        <p className="text-slate-600 dark:text-[#8B92A5] text-xs sm:text-sm max-w-2xl leading-relaxed font-normal">
          Step-by-step programming mastery inspired by W3Schools. 30 guided levels per track — from
          fundamental syntax to algorithmic thinking. Complete Level N to unlock Level N+1.
        </p>
      </div>
    </div>
  );
}
