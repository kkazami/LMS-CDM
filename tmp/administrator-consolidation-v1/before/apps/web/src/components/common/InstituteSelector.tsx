"use client";

import type { InstituteCode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Code2, BookOpen, Briefcase } from "lucide-react";

export interface InstituteOption {
  code: InstituteCode;
  short: string;
  name: string;
  subtext: string;
  color: string;
  icon: typeof Code2;
}

export const INSTITUTES: InstituteOption[] = [
  {
    code: "ics",
    short: "ICS",
    name: "Computing Studies",
    subtext: "Computer Science & IT",
    color: "#FF7517",
    icon: Code2,
  },
  {
    code: "ite",
    short: "ITE",
    name: "Teacher Education",
    subtext: "Technical Education & Teaching",
    color: "#2563EB",
    icon: BookOpen,
  },
  {
    code: "ibe",
    short: "IBE",
    name: "Business & Entrep",
    subtext: "Business & Management",
    color: "#D4A017",
    icon: Briefcase,
  },
];

interface InstituteSelectorProps {
  currentInstitute: InstituteCode;
  onSelect: (code: InstituteCode) => void;
  className?: string;
  label?: string;
}

export default function InstituteSelector({
  currentInstitute,
  onSelect,
  className,
  label = "Select Institute",
}: InstituteSelectorProps) {
  return (
    <div className={cn("grid gap-1.5 sm:gap-2 w-full", className)}>
      {label && (
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-0.5 px-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            {label}
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Switch campus & theme
          </span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
        {INSTITUTES.map((inst) => {
          const isSelected = currentInstitute === inst.code;
          const Icon = inst.icon;
          return (
            <button
              key={inst.code}
              type="button"
              onClick={() => onSelect(inst.code)}
              className={cn(
                "group relative flex flex-col items-center justify-center rounded-xl p-2 sm:p-3 text-center transition-all duration-200 cursor-pointer border min-h-[58px] sm:min-h-[68px] active:scale-[0.97]",
                isSelected
                  ? "shadow-sm"
                  : "border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900"
              )}
              style={
                isSelected
                  ? {
                      borderColor: inst.color,
                      backgroundColor: `${inst.color}14`,
                      boxShadow: `0 0 0 1.5px ${inst.color}`,
                    }
                  : undefined
              }
              aria-pressed={isSelected}
            >
              <div
                className="mb-1 sm:mb-1.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 shrink-0"
                style={{
                  backgroundColor: isSelected ? `${inst.color}25` : "rgba(148, 163, 184, 0.12)",
                  color: isSelected ? inst.color : "#64748B",
                }}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <span
                className="text-xs sm:text-sm font-black tracking-tight"
                style={{ color: isSelected ? inst.color : undefined }}
              >
                {inst.short}
              </span>
              <span className="mt-0.5 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-tight px-0.5 max-w-full">
                {inst.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
