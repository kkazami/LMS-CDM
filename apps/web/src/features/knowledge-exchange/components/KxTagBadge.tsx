"use client";

import React from "react";
import Link from "next/link";
import { Hash } from "lucide-react";
import { KX_TAG_CATEGORIES } from "../constants";

interface KxTagBadgeProps {
  slug: string;
  name: string;
  category?: string;
  count?: number;
  instituteCode?: string;
  clickable?: boolean;
  onRemove?: () => void;
  size?: "sm" | "md";
  className?: string;
}

export default function KxTagBadge({
  slug,
  name,
  category = "TOPIC",
  count,
  instituteCode = "ics",
  clickable = true,
  onRemove,
  size = "md",
  className = "",
}: KxTagBadgeProps) {
  const catConfig =
    KX_TAG_CATEGORIES[category as keyof typeof KX_TAG_CATEGORIES] ||
    KX_TAG_CATEGORIES.TOPIC;

  const sizeClasses =
    size === "sm"
      ? "text-xs px-2 py-0.5 gap-1"
      : "text-xs px-2.5 py-1 gap-1.5";

  const badgeContent = (
    <span
      className={`inline-flex items-center font-medium rounded-md border transition-all ${catConfig.color} ${sizeClasses} ${
        clickable && !onRemove ? "hover:opacity-80 cursor-pointer" : ""
      } ${className}`}
    >
      <Hash className="h-3 w-3 opacity-60 shrink-0" />
      <span className="truncate">{name}</span>
      {count !== undefined && (
        <span className="ml-1 text-[10px] opacity-75 font-mono">
          {count}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 -mr-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
          aria-label={`Remove tag ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );

  if (clickable && !onRemove) {
    return (
      <Link
        href={`/${instituteCode}/knowledge-exchange?tag=${encodeURIComponent(
          slug
        )}`}
      >
        {badgeContent}
      </Link>
    );
  }

  return badgeContent;
}
