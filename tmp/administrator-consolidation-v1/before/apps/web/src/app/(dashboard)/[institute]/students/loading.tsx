import Skeleton from "@/components/common/Skeleton";

export default function StudentDashboardLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner Skeleton */}
      <Skeleton className="h-32 w-full rounded-2xl" shimmer />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Enrolled Classes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9" rounded shimmer />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-48" shimmer />
                <Skeleton className="h-3 w-64" shimmer />
              </div>
            </div>
            <Skeleton className="h-7 w-20 rounded-full" shimmer />
          </div>

          {/* Course cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs overflow-hidden"
              >
                <Skeleton className="h-28 w-full rounded-none" shimmer />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" shimmer />
                  <Skeleton className="h-3 w-1/2" shimmer />
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 mt-3 flex justify-between">
                    <Skeleton className="h-3 w-16" shimmer />
                    <Skeleton className="h-3 w-20" shimmer />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Due Soon */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9" rounded shimmer />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-24" shimmer />
                <Skeleton className="h-3 w-36" shimmer />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-4 shadow-xs space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl">
                <Skeleton className="h-9 w-9 shrink-0" rounded shimmer />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" shimmer />
                  <Skeleton className="h-4 w-full" shimmer />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
