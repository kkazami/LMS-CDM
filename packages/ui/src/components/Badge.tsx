import React, { ReactNode } from "react";

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface BadgeThemeColors {
  primary?: string;
}

export interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "neutral";
  size?: "sm" | "md";
  className?: string;
  themeColors?: BadgeThemeColors;
}

export default function Badge({
  children,
  variant = "default",
  size = "md",
  className,
  themeColors,
}: BadgeProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-full whitespace-nowrap transition-colors";
  
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] sm:text-[11px]",
    md: "px-2.5 py-1 text-[11px] sm:text-xs",
  };

  const variantStyles = {
    default: !themeColors?.primary ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : "",
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    neutral: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  };

  const customStyle = variant === "default" && themeColors?.primary 
    ? { backgroundColor: `${themeColors.primary}20`, color: themeColors.primary } 
    : undefined;

  return (
    <span
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      style={customStyle}
    >
      {children}
    </span>
  );
}
