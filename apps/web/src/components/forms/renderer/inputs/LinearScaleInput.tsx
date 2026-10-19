"use client";

import type { LinearScaleConfig } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface LinearScaleInputProps {
  config?: LinearScaleConfig;
  value?: number | null;
  onChange: (val: number) => void;
  disabled?: boolean;
  theme?: InstituteTheme;
}

export default function LinearScaleInput({
  config,
  value,
  onChange,
  disabled = false,
  theme,
}: LinearScaleInputProps) {
  const min = config?.min ?? 1;
  const max = config?.max ?? 5;
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const primaryColor = theme?.colors?.primary || "#3B82F6";

  return (
    <div className="pt-3 space-y-2 overflow-x-auto">
      <div className="flex items-center justify-between sm:justify-center gap-2 sm:gap-4 min-w-max px-2">
        {config?.minLabel && (
          <span className="text-xs text-slate-500 dark:text-[#8B92A5] max-w-[100px] text-right pr-2">
            {config.minLabel}
          </span>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          {numbers.map((num) => {
            const isSelected = value === num;

            return (
              <button
                key={num}
                type="button"
                disabled={disabled}
                onClick={() => onChange(num)}
                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-primary text-white shadow-md scale-105"
                    : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-white/10"
                }`}
                style={{ backgroundColor: isSelected ? primaryColor : undefined }}
              >
                {num}
              </button>
            );
          })}
        </div>

        {config?.maxLabel && (
          <span className="text-xs text-slate-500 dark:text-[#8B92A5] max-w-[100px] text-left pl-2">
            {config.maxLabel}
          </span>
        )}
      </div>
    </div>
  );
}
