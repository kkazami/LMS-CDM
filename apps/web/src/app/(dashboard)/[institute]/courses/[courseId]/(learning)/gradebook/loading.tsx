import Skeleton from "@/components/common/Skeleton";

export default function GradebookLoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" shimmer />
        <Skeleton className="h-10 w-28 rounded-xl" shimmer />
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] overflow-hidden shadow-xs">
        {/* Header row */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#181B26]">
          <Skeleton className="h-4 w-32 flex-1" shimmer />
          <Skeleton className="h-4 w-20" shimmer />
          <Skeleton className="h-4 w-20" shimmer />
          <Skeleton className="h-4 w-20" shimmer />
          <Skeleton className="h-4 w-20" shimmer />
        </div>

        {/* 5 data rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-white/5 last:border-b-0"
          >
            <Skeleton className="h-4 w-40 flex-1" shimmer />
            <Skeleton className="h-4 w-16" shimmer />
            <Skeleton className="h-4 w-16" shimmer />
            <Skeleton className="h-4 w-16" shimmer />
            <Skeleton className="h-5 w-16 rounded-full" shimmer />
          </div>
        ))}
      </div>
    </div>
  );
}
