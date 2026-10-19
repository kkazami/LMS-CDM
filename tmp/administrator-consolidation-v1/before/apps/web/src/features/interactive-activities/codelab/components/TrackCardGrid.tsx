"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import DotConstellation from "./DotConstellation";
import { LANGUAGE_LOGO_MAP } from "./LanguageLogos";
import { MORPH_CONSTELLATIONS } from "./constellations";

export interface TrackConfig {
  language: string;
  name: string;
  description: string;
  borderClass: string;
  badgeClass: string;
  dotColor: string; // brand color for the dot constellation
}

export interface TrackProgressData {
  highestPassed: number;
  passedCount: number;
}

interface TrackCardGridProps {
  tracks: readonly TrackConfig[] | TrackConfig[];
  trackProgress: Record<string, TrackProgressData>;
  institute: string;
}

export default function TrackCardGrid({
  tracks,
  trackProgress,
  institute,
}: TrackCardGridProps) {
  const [hoveredLanguage, setHoveredLanguage] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {tracks.map((track, idx) => {
        const prog = trackProgress[track.language] ?? { highestPassed: 0, passedCount: 0 };
        const percent = Math.round((prog.passedCount / 30) * 100);
        const hasStarted = prog.passedCount > 0;
        const Logo = LANGUAGE_LOGO_MAP[track.language] ?? LANGUAGE_LOGO_MAP.python;
        const dots = MORPH_CONSTELLATIONS[track.language] ?? [];
        const isHovered = hoveredLanguage === track.language;

        return (
          <Link
            key={track.language}
            href={`/${institute}/activities/codelab/${track.language}`}
            className={`group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 border-l-4 ${track.borderClass} p-5 shadow-xs hover:shadow-lg hover:-translate-y-1 hover:border-slate-300 dark:hover:border-white/10 transition-all duration-200 cursor-pointer overflow-hidden`}
            style={{ animationDelay: `${idx * 40}ms` }}
            onMouseEnter={() => setHoveredLanguage(track.language)}
            onMouseLeave={() => setHoveredLanguage(null)}
          >
            {/* Dot Constellation Background — appears on hover */}
            <DotConstellation
              dots={dots}
              color={track.dotColor}
              isHovered={isHovered}
            />

            {/* Card Content (above the constellation) */}
            <div className="relative z-10 space-y-3.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#181B26] border border-slate-100 dark:border-white/5 flex items-center justify-center shrink-0">
                    <Logo size={26} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
                      {track.name}
                    </h2>
                    <span className="text-[11px] text-slate-500 dark:text-[#8B92A5] font-medium">
                      30 Levels
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${track.badgeClass}`}>
                  {hasStarted ? `${prog.passedCount}/30` : "Not Started"}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-[#8B92A5] leading-relaxed min-h-[36px]">
                {track.description}
              </p>
            </div>

            <div className="relative z-10 mt-5 pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-[#8B92A5]">
                  <span>Progress</span>
                  <span className="font-bold">{percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-[#1E2132] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F97316] transition-all duration-500 rounded-full"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-[#F0F2F8] group-hover:text-[#F97316] transition-colors pt-1">
                <span>{hasStarted ? "Continue Track" : "Start Track"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
