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
            "w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3.5 py-2.5 text-sm text-slate-900 dark:text-[#F0F2F8] outline-none transition",
            "placeholder:text-slate-400 dark:placeholder:text-[#555C72]",
            isPassword && "pr-10",
            className
          )}
          style={{
            boxShadow: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme.colors.primary;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.primary}33`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "none";
          }}
          {...props}
          type={inputType}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-[#8B92A5] dark:hover:text-[#F0F2F8] focus:outline-none cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}