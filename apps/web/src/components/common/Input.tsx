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
    <div className="grid gap-2">
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-gray-800">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          id={id}
          className={cn(
            "w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 outline-none transition",
            "placeholder:text-gray-400",
            isPassword && "pr-10",
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
          type={inputType}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
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