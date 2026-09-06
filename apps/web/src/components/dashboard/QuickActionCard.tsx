"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export type BadgeVariant = "error" | "warning" | "info" | "success" | "muted";

interface QuickActionCardProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  badge?: string | null;
  badgeVariant?: BadgeVariant;
  sublabel?: string;
  color: string;
}

const badgeStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  error: { bg: "#FEE2E2", text: "#B91C1C" },
  warning: { bg: "#FEF3C7", text: "#92400E" },
  info: { bg: "#DBEAFE", text: "#1D4ED8" },
  success: { bg: "#D1FAE5", text: "#065F46" },
  muted: { bg: "#F1F5F9", text: "#64748B" },
};

export function QuickActionCard({
  icon: Icon,
  label,
  href = "#",
  onClick,
  badge,
  badgeVariant = "muted",
  sublabel,
  color,
}: QuickActionCardProps) {
  const bs = badgeStyles[badgeVariant];

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <Link
        href={href}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            onClick();
          }
        }}
        className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.07] bg-white dark:bg-[#141721] p-4 shadow-xs hover:shadow-md transition-shadow cursor-pointer block h-full"
      >
        <div className="flex items-start justify-between">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}14` }}
          >
            <Icon className="h-[18px] w-[18px]" style={{ color }} aria-hidden="true" />
          </div>
          {badge && (
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold font-mono tabular-nums"
              style={{ backgroundColor: bs.bg, color: bs.text }}
            >
              {badge}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8]">
            {label}
          </p>
          {sublabel && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-[#8B92A5] truncate">
              {sublabel}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
