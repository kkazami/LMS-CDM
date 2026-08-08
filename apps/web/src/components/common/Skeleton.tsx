import { cn } from "@/lib/utils";

/**
 * A skeleton placeholder element used to indicate loading content.
 *
 * @param className - Additional CSS classes for sizing (e.g. `h-4 w-32`).
 * @param rounded - When `true`, renders as a circle/pill (for avatars or badges).
 * @param shimmer - When `true` (default), uses a traveling shimmer gradient instead of a simple pulse.
 */
interface SkeletonProps {
  className?: string;
  /** Rounded pill variant (for avatars / badges) */
  rounded?: boolean;
  /** Use traveling shimmer gradient instead of pulse. Default: true */
  shimmer?: boolean;
}

export default function Skeleton({
  className,
  rounded = false,
  shimmer = true,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        shimmer ? "skeleton-shimmer" : "animate-pulse bg-gray-200",
        rounded ? "rounded-full" : "rounded-md",
        className
      )}
      aria-hidden="true"
    />
  );
}
