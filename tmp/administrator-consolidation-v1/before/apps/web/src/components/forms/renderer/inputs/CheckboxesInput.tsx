"use client";

import { Check } from "lucide-react";
import type { FormOption } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface CheckboxesInputProps {
  options: FormOption[];
  selectedIds?: string[] | null;
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  theme?: InstituteTheme;
}

export default function CheckboxesInput({
  options = [],
  selectedIds = [],
  onChange,
  disabled = false,
  theme,
}: CheckboxesInputProps) {
  const current = selectedIds || [];
  const primaryColor = theme?.colors?.primary || "#3B82F6";

  const handleToggle = (id: string) => {
    if (disabled) return;
    if (current.includes(id)) {
      onChange(current.filter((item) => item !== id));
    } else {
      onChange([...current, id]);
    }
  };

  return (
    <div className="space-y-2 pt-1">
      {options.map((opt) => {
        const isChecked = current.includes(opt.id);

        return (
          <label
            key={opt.id}
            onClick={() => handleToggle(opt.id)}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs sm:text-sm cursor-pointer transition-all ${
              isChecked
                ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs ring-1 ring-primary"
                : "border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-white/[0.02]"
            } ${disabled ? "cursor-not-allowed opacity-75" : ""}`}
          >
            <div
              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                isChecked
                  ? "bg-primary border-primary text-white"
                  : "border-slate-300 dark:border-white/30"
              }`}
              style={{
                backgroundColor: isChecked ? primaryColor : undefined,
                borderColor: isChecked ? primaryColor : undefined,
              }}
            >
              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
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
