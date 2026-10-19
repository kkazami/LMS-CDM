"use client";

import { cn } from "@/lib/utils";
import type { InstituteTheme } from "@/lib/theme";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { triggerNativeHaptic } from "@/lib/mobile-bridge";

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
      backgroundColor: "var(--bg-surface, #FFFFFF)",
      borderColor: "var(--border-color, #E2E8F0)",
      color: "var(--text-primary, #0F172A)",
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      color: "var(--text-primary, #0F172A)",
    },
  }[variant];

  return (
    <button
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer",
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
      onClick={(e) => {
        try {
          triggerNativeHaptic("light");
        } catch {
          // ignore
        }
        props.onClick?.(e);
      }}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
}