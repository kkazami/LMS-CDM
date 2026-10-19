"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

interface CourseReorderButtonsProps {
  title: string;
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
}

/** Keyboard- and touch-operable alternative to drag-and-drop course ordering. */
export default function CourseReorderButtons({ title, index, total, onMove }: CourseReorderButtonsProps) {
  if (total < 2) return null;

  const buttonClass =
    "inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Reorder ${title}`}>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label={`Move ${title} up`}
      >
        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onMove(1)}
        disabled={index === total - 1}
        aria-label={`Move ${title} down`}
      >
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
