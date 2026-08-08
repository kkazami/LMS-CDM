"use client";

import { cn } from "@/lib/utils";
import type { InstituteTheme } from "@/lib/theme";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  theme: InstituteTheme;
  variant?: "primary" | "secondary" | "ghost";
  /** Shows a spinner and disables the button. */
  loading?: boolean;
};

export default function Button({
  children,
  theme,
  variant = "primary",
  className,
  loading = false,
  disabled,
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
        "inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60",
        loading && "cursor-wait opacity-80",
        className
      )}
      style={styles}
      disabled={loading || disabled}
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
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
}