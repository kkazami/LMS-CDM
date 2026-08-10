"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface UserAvatarProps {
  /** The user's full name — used to derive initials if no avatarUrl */
  name: string;
  /** URL of the uploaded avatar image, or null/undefined for initials fallback */
  avatarUrl?: string | null;
  /** Visual size of the avatar */
  size?: AvatarSize;
  /** Hex background color for the initials fallback */
  color?: string;
  /** Whether to show a green "online" ring indicator */
  showOnline?: boolean;
  /** Additional Tailwind classes */
  className?: string;
  /** Called when the avatar is clicked */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const SIZE_CLASSES: Record<AvatarSize, { container: string; text: string; px: number }> = {
  xs: { container: "h-6 w-6", text: "text-[10px]", px: 24 },
  sm: { container: "h-8 w-8", text: "text-xs", px: 32 },
  md: { container: "h-9 w-9", text: "text-sm", px: 36 },
  lg: { container: "h-12 w-12", text: "text-base", px: 48 },
  xl: { container: "h-20 w-20", text: "text-2xl", px: 80 },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  color = "#1E88E5",
  showOnline = false,
  className,
  onClick,
}: UserAvatarProps) {
  const { container, text, px } = SIZE_CLASSES[size];

  const inner = avatarUrl ? (
    <Image
      src={avatarUrl}
      alt={`${name}'s avatar`}
      width={px}
      height={px}
      className="h-full w-full rounded-full object-cover"
      unoptimized={avatarUrl.startsWith("data:")}
    />
  ) : (
    <span className={cn("font-semibold text-white select-none", text)}>
      {getInitials(name)}
    </span>
  );

  const base = cn(
    "relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden",
    container,
    onClick && "cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all duration-150",
    className
  );

  const style = !avatarUrl ? { backgroundColor: color } : undefined;

  if (onClick) {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={onClick}
          className={base}
          style={style}
          aria-label={`View ${name}'s profile`}
        >
          {inner}
        </button>
        {showOnline && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <div className={base} style={style}>
        {inner}
      </div>
      {showOnline && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
      )}
    </div>
  );
}
