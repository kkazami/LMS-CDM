"use client";

import type { InstituteTheme } from "@/lib/theme";

interface ParagraphInputProps {
  value?: string | null;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  theme?: InstituteTheme;
}

export default function ParagraphInput({
  value = "",
  onChange,
  placeholder = "Your answer...",
  disabled = false,
  theme,
}: ParagraphInputProps) {
  return (
    <div className="pt-1">
      <textarea
        rows={4}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full text-sm sm:text-base p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 focus:border-primary text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden transition-colors resize-y"
      />
    </div>
  );
}
