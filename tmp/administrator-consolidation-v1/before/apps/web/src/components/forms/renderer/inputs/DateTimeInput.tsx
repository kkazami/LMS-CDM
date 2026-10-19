"use client";

import { Calendar } from "lucide-react";

interface DateTimeInputProps {
  value?: string | Date | null;
  onChange: (date: string) => void;
  disabled?: boolean;
}

export default function DateTimeInput({
  value,
  onChange,
  disabled = false,
}: DateTimeInputProps) {
  const formatted = value ? new Date(value).toISOString().slice(0, 10) : "";

  return (
    <div className="pt-1 max-w-xs">
      <div className="relative">
        <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="date"
          value={formatted}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-xs sm:text-sm pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/40"
        />
      </div>
    </div>
  );
}
