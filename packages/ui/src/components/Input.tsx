"use client";

import React, { InputHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface InputThemeColors {
  primary?: string;
  border?: string;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  themeColors?: InputThemeColors;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, themeColors, style, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 text-primary-theme">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={cn(
              "flex w-full min-h-[44px] items-center rounded-lg border bg-white px-3 py-2 text-base sm:text-sm transition-colors",
              "dark:bg-slate-900 bg-surface text-slate-900 dark:text-white text-primary-theme",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-900",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                : "border-slate-300 dark:border-slate-700 border-theme focus:border-blue-500 focus:ring-blue-500/20",
              isPassword && "pr-12",
              className
            )}
            style={{
              ...style,
              ...(themeColors?.border && !error ? { borderColor: themeColors.border } : {}),
            }}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-0 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-r-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-500 font-medium mt-0.5">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
