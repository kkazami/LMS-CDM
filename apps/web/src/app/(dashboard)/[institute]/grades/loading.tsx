import Skeleton from "@/components/common/Skeleton";

export default function GradesLoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <Skeleton className="h-8 w-28" shimmer />
        <Skeleton className="h-4 w-72 mt-2" shimmer />
      </div>

      {/* Tab bar */}
      <div className="flex items-end gap-2 border-b border-slate-200/80 dark:border-white/5 pb-2">
        <Skeleton className="h-8 w-36 rounded-xl" shimmer />
        <Skeleton className="h-8 w-36 rounded-xl" shimmer />
        <Skeleton className="h-8 w-36 rounded-xl" shimmer />
      </div>

      {/* Filter + summary bar */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-52 rounded-xl" shimmer />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-24 rounded-xl" shimmer />
          <Skeleton className="h-10 w-24 rounded-xl" shimmer />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] overflow-hidden shadow-xs">
        {/* Header row */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-[#181B26] px-4 py-3 border-b border-slate-100 dark:border-white/5">
          <Skeleton className="h-3.5 w-48" shimmer />
          <Skeleton className="h-3.5 w-20" shimmer />
          <Skeleton className="h-3.5 w-28" shimmer />
          <Skeleton className="h-3.5 w-16" shimmer />
          <Skeleton className="h-3.5 w-16" shimmer />
          <Skeleton className="h-3.5 w-24" shimmer />
        </div>
        {/* Data rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-slate-100 dark:border-white/5 last:border-b-0"
          >
            <div className="flex items-center gap-2.5 flex-1">
              <Skeleton className="h-8 w-8 shrink-0" rounded shimmer />
              <Skeleton className="h-4 w-40" shimmer />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" shimmer />
            <Skeleton className="h-4 w-16" shimmer />
            <Skeleton className="h-4 w-10" shimmer />
            <Skeleton className="h-4 w-10" shimmer />
            <Skeleton className="h-5 w-14 rounded-full" shimmer />
            <Skeleton className="h-3.5 w-24" shimmer />
          </div>
        ))}
      </div>
    </div>
  );
}
