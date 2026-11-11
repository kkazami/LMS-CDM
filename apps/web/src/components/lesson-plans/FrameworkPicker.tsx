"use client";

import React from "react";
import Link from "next/link";
import type { LessonPlanFramework } from "@/lib/lesson-plans/types";
import {
  ArrowRight,
  BookOpen,
  FileEdit,
  FlaskConical,
  Layers,
  Sparkles,
} from "lucide-react";

interface FrameworkPickerProps {
  frameworks: readonly LessonPlanFramework[];
  pathname: string;
  draftStatus: Record<string, boolean>;
}

export function getFrameworkIcon(id: string) {
  switch (id) {
    case "ilaw":
      return Sparkles;
    case "4as":
      return BookOpen;
    case "5es":
      return FlaskConical;
    case "6es":
      return Layers;
    default:
      return BookOpen;
  }
}

export default function FrameworkPicker({
  frameworks,
  pathname,
  draftStatus,
}: FrameworkPickerProps) {
  return (
    <div
      role="region"
      aria-label="Pedagogical Frameworks Hub"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {frameworks.map((fw) => {
        const Icon = getFrameworkIcon(fw.id);
        const hasDraft = Boolean(draftStatus[fw.id]);

        return (
          <Link
            key={fw.id}
            href={`${pathname}?framework=${fw.id}`}
            id={`card-${fw.id}`}
            aria-label={`${fw.name} - ${fw.stages.length} stages`}
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 p-6 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-950/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 cursor-pointer"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 shadow-2xs transition-transform duration-200 group-hover:scale-105">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    {fw.stages.length} Stages
                  </span>
                  {hasDraft && (
                    <span
                      id={`badge-draft-${fw.id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400"
                    >
                      <FileEdit className="h-3 w-3" />
                      <span>Draft in progress</span>
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400 sm:text-xl">
                  {fw.name}
                </h2>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                  {fw.shortDescription}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
                {fw.originNote}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-xl bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors group-hover:bg-blue-700">
              <span>Open Framework</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
