"use client";

import { useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";

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
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = props.type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : props.type;

  return (
    <div className="grid gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 dark:text-[#8B92A5]">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          id={id}
          className={cn(
            "w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3.5 py-2.5 text-base sm:text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition scroll-my-20",
            "placeholder:text-[var(--text-muted)]",
            isPassword && "pr-10",
            className
          )}
          style={{
            boxShadow: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--focus-ring)";
            e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--focus-ring) 18%, transparent)";
            props.onFocus?.(e);

            // On mobile devices & WebViews, ensure focused input is smoothly centered above virtual keyboard
            const target = e.currentTarget;
            if (window.matchMedia('(max-width: 767px)').matches) {
              setTimeout(() => {
                target.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 300);
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "none";
            props.onBlur?.(e);
          }}
          {...props}
          type={inputType}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:text-[#8B92A5] dark:hover:text-[#F0F2F8] focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer disabled:opacity-50"
            disabled={props.disabled}
            aria-label={`${showPassword ? "Hide" : "Show"} ${label?.toLowerCase() || "password"}`}
            aria-pressed={showPassword}
            aria-controls={id}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
