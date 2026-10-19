"use client";

import { Check } from "lucide-react";
import type { FormOption } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface MultipleChoiceInputProps {
  options: FormOption[];
  selectedId?: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  theme?: InstituteTheme;
}

export default function MultipleChoiceInput({
  options = [],
  selectedId,
  onChange,
  disabled = false,
  theme,
}: MultipleChoiceInputProps) {
  const primaryColor = theme?.colors?.primary || "#3B82F6";

  return (
    <div className="space-y-2 pt-1">
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;

        return (
          <label
            key={opt.id}
            onClick={() => !disabled && onChange(opt.id)}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all ${
              isSelected
                ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs ring-1 ring-primary"
                : "border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-white/[0.02]"
            } ${disabled ? "cursor-not-allowed opacity-75" : ""}`}
          >
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                isSelected
                  ? "bg-primary border-primary text-white"
                  : "border-slate-300 dark:border-white/30"
              }`}
              style={{
                backgroundColor: isSelected ? primaryColor : undefined,
                borderColor: isSelected ? primaryColor : undefined,
              }}
            >
              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>

            <span className="font-medium text-slate-800 dark:text-slate-100 flex-1 leading-snug">
              {opt.text}
            </span>
          </label>
        );
      })}
    </div>
  );
}
