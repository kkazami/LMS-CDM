"use client";

import type { FormOption } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface DropdownInputProps {
  options: FormOption[];
  selectedId?: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  theme?: InstituteTheme;
}

export default function DropdownInput({
  options = [],
  selectedId,
  onChange,
  disabled = false,
  theme,
}: DropdownInputProps) {
  return (
    <div className="pt-1 max-w-sm">
      <select
        value={selectedId || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full text-sm py-2.5 px-3 rounded-xl bg-white dark:bg-[#1A1E2B] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/40"
      >
        <option value="">-- Select an option --</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.text}
          </option>
        ))}
      </select>
    </div>
  );
}
