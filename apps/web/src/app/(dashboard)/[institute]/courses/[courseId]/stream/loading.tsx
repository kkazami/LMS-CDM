import Skeleton from "@/components/common/Skeleton";

export default function StreamLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner skeleton */}
      <Skeleton className="h-44 w-full rounded-2xl" shimmer />

      {/* Announcement composer skeleton */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0" rounded shimmer />
        <Skeleton className="h-10 flex-1 rounded-xl" shimmer />
      </div>

      {/* 3 post-card skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 space-y-3 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0" rounded shimmer />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32" shimmer />
                <Skeleton className="h-3 w-16" shimmer />
              </div>
              <Skeleton className="h-4 w-full" shimmer />
              <Skeleton className="h-4 w-4/5" shimmer />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
