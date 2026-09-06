"use client";

import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface ButtonThemeColors {
  primary?: string;
  primaryHover?: string;
  border?: string;
  text?: string;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  themeColors?: ButtonThemeColors;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      themeColors,
      style,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 min-h-[44px]";

    const sizeStyles = {
      sm: "px-3 py-2 text-sm",
      md: "px-4 py-2.5 sm:px-5 text-base sm:text-sm",
      lg: "px-6 py-3 text-lg sm:text-base",
    };

    const isPrimary = variant === "primary";
    const isSecondary = variant === "secondary";
    const isGhost = variant === "ghost";

    const customStyles = {
      ...style,
      ...(isPrimary && themeColors?.primary
        ? { backgroundColor: themeColors.primary, color: "#ffffff" }
        : {}),
      ...(isSecondary && themeColors?.border
        ? { borderColor: themeColors.border }
        : {}),
      ...(isGhost && themeColors?.text ? { color: themeColors.text } : {}),
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          sizeStyles[size],
          !themeColors && isPrimary && "bg-blue-600 text-white hover:bg-blue-700 bg-primary-theme",
          !themeColors && isSecondary && "border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-theme text-secondary-theme",
          !themeColors && isGhost && "text-slate-600 bg-transparent hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 text-muted-theme",
          className
        )}
        style={customStyles}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
