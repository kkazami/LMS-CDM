"use client";

import { Check } from "lucide-react";
import type { FormOption } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface ImageChoiceInputProps {
  options: FormOption[];
  selectedId?: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  theme?: InstituteTheme;
}

export default function ImageChoiceInput({
  options = [],
  selectedId,
  onChange,
  disabled = false,
  theme,
}: ImageChoiceInputProps) {
  const primaryColor = theme?.colors?.primary || "#3B82F6";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
      {options.map((opt) => {
        const isSelected = selectedId === opt.id;

        return (
          <div
            key={opt.id}
            onClick={() => !disabled && onChange(opt.id)}
            className={`rounded-2xl border overflow-hidden cursor-pointer transition-all ${
              isSelected
                ? "border-primary ring-2 ring-primary bg-primary/5 shadow-md"
                : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#12151E]"
            } ${disabled ? "cursor-not-allowed opacity-75" : ""}`}
          >
            {opt.imageUrl ? (
              <img
                src={opt.imageUrl}
                alt={opt.text}
                className="w-full h-36 object-cover bg-slate-100 dark:bg-white/5"
              />
            ) : (
              <div className="w-full h-24 bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs text-slate-400">
                Image Card
              </div>
            )}

            <div className="p-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                {opt.text}
              </span>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "bg-primary border-primary text-white"
                    : "border-slate-300 dark:border-white/30"
                }`}
                style={{
                  backgroundColor: isSelected ? primaryColor : undefined,
                  borderColor: isSelected ? primaryColor : undefined,
                }}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
