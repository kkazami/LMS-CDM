import Skeleton from "@/components/common/Skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner Skeleton */}
      <Skeleton className="h-32 w-full rounded-2xl" shimmer />

      {/* KPI Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs flex items-center justify-between"
          >
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" shimmer />
              <Skeleton className="h-7 w-16" shimmer />
            </div>
            <Skeleton className="h-12 w-12 rounded-2xl" shimmer />
          </div>
        ))}
      </div>

      {/* Administrative Modules Grid Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 rounded-xl" shimmer />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48" shimmer />
            <Skeleton className="h-3 w-72" shimmer />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-12 w-12 rounded-2xl" shimmer />
                <Skeleton className="h-6 w-24 rounded-full" shimmer />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" shimmer />
                <Skeleton className="h-3 w-full" shimmer />
                <Skeleton className="h-3 w-2/3" shimmer />
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex justify-between">
                <Skeleton className="h-3 w-20" shimmer />
                <Skeleton className="h-4 w-4" rounded shimmer />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
