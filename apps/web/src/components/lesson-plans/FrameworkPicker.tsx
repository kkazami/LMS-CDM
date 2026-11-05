"use client";

import React from "react";
import type { FrameworkId, LessonPlanFramework } from "@/lib/lesson-plans/types";
import { BookOpen, Layers, Sparkles } from "lucide-react";

interface FrameworkPickerProps {
  frameworks: readonly LessonPlanFramework[];
  selectedId: FrameworkId;
  onSelect: (id: FrameworkId) => void;
}

export default function FrameworkPicker({
  frameworks,
  selectedId,
  onSelect,
}: FrameworkPickerProps) {
  return (
    <div
      role="tablist"
      aria-label="Lesson planning frameworks"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {frameworks.map((fw) => {
        const isSelected = fw.id === selectedId;
        return (
          <button
            key={fw.id}
            role="tab"
            aria-selected={isSelected}
            aria-controls={`panel-${fw.id}`}
            id={`tab-${fw.id}`}
            type="button"
            onClick={() => onSelect(fw.id)}
            className={`group relative flex flex-col justify-between text-left p-4 rounded-xl border transition-all cursor-pointer ${
              isSelected
                ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm ring-2 ring-blue-500/20"
                : "border-theme bg-surface hover:border-blue-300 dark:hover:border-blue-800 hover:bg-elevated/60"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "border border-theme bg-elevated text-secondary-theme group-hover:text-primary-theme"
                  }`}
                >
                  {fw.id === "ilaw" ? (
                    <Sparkles className="h-4 w-4" />
                  ) : fw.id === "6es" ? (
                    <Layers className="h-4 w-4" />
                  ) : (
                    <BookOpen className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isSelected
                      ? "bg-blue-600/15 text-blue-700 dark:text-blue-300"
                      : "border border-theme bg-elevated text-muted-theme"
                  }`}
                >
                  {fw.stages.length} Stages
                </span>
              </div>

              <div>
                <h3
                  className={`text-sm font-bold ${
                    isSelected
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-primary-theme group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  }`}
                >
                  {fw.name}
                </h3>
                <p className="mt-1 text-xs text-secondary-theme leading-relaxed line-clamp-2">
                  {fw.shortDescription}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-theme/60 text-[11px] font-medium text-muted-theme line-clamp-1">
              {fw.originNote}
            </div>
          </button>
        );
      })}
    </div>
  );
}

