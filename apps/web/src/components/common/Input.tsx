"use client";

import { cn } from "@/lib/utils";
import type { InstituteTheme } from "@/lib/theme";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  theme: InstituteTheme;
};

export default function Input({
  label,
  theme,
  className,
  id,
  ...props
}: InputProps) {
  return (
    <div className="grid gap-2">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-gray-800">
          {label}
        </label>
      ) : null}

      <input
        id={id}
        className={cn(
          "w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 outline-none transition",
          "placeholder:text-gray-400",
          className
        )}
        style={{
          borderColor: theme.colors.border,
          boxShadow: "none",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = theme.colors.ring;
          e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.ring}33`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = theme.colors.border;
          e.currentTarget.style.boxShadow = "none";
        }}
        {...props}
      />
    </div>
  );
}