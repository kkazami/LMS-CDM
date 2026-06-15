"use client";

import { cn } from "@/lib/utils";
import type { InstituteTheme } from "@/lib/theme";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  theme: InstituteTheme;
  variant?: "primary" | "secondary" | "ghost";
};

export default function Button({
  children,
  theme,
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const styles = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      color: "#FFFFFF",
    },
    secondary: {
      backgroundColor: "#FFFFFF",
      borderColor: theme.colors.border,
      color: theme.colors.text,
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      color: theme.colors.text,
    },
  }[variant];

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      style={styles}
      onMouseEnter={(e) => {
        if (variant === "primary") {
          e.currentTarget.style.backgroundColor = theme.colors.primaryHover;
          e.currentTarget.style.borderColor = theme.colors.primaryHover;
        }
      }}
      onMouseLeave={(e) => {
        if (variant === "primary") {
          e.currentTarget.style.backgroundColor = theme.colors.primary;
          e.currentTarget.style.borderColor = theme.colors.primary;
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}