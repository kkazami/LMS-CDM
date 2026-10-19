"use client";

import type { InstituteTheme } from "@/lib/theme";

interface ShortAnswerInputProps {
  value?: string | null;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  theme?: InstituteTheme;
}

export default function ShortAnswerInput({
  value = "",
  onChange,
  placeholder = "Your answer...",
  disabled = false,
  theme,
}: ShortAnswerInputProps) {
  return (
    <div className="pt-1">
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full text-sm sm:text-base px-1 py-2 bg-transparent border-b-2 border-slate-200 dark:border-white/10 focus:border-primary text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden transition-colors"
      />
    </div>
  );
}
