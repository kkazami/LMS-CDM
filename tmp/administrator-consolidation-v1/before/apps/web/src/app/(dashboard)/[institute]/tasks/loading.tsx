import Skeleton from "@/components/common/Skeleton";

export default function TasksLoadingSkeleton() {
  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner Skeleton */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white/80 dark:bg-[#141721] p-5 shadow-xs backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" shimmer />
            <Skeleton className="h-8 w-72 md:w-96" shimmer />
            <Skeleton className="h-4 w-60 md:w-80" shimmer />
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-64 rounded-full" shimmer />
          </div>
        </div>
      </div>

      {/* Workspace Content Skeleton */}
      <div className="space-y-5">
        {/* Quick action bar */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-36" shimmer />
              <Skeleton className="h-4 w-64" shimmer />
            </div>
            <Skeleton className="h-10 w-44 rounded-full" shimmer />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_200px_180px_220px_auto]">
            <Skeleton className="h-12 w-full rounded-2xl" shimmer />
            <Skeleton className="h-12 w-full rounded-2xl" shimmer />
            <Skeleton className="h-12 w-full rounded-2xl" shimmer />
            <Skeleton className="h-12 w-full rounded-2xl" shimmer />
            <Skeleton className="h-12 w-24 rounded-2xl" shimmer />
          </div>
        </div>

        {/* Task lists grid */}
        <div className="grid gap-5 xl:grid-cols-2">
          {/* Pending Tasks Skeleton */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-4 w-28" shimmer />
              <Skeleton className="h-6 w-10 rounded-full" shimmer />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/70 dark:bg-[#181B26] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-4 w-3/4" shimmer />
                    <Skeleton className="h-5 w-14 rounded-full" shimmer />
                  </div>
                  <Skeleton className="h-3 w-full" shimmer />
                  <Skeleton className="h-3 w-1/2" shimmer />
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex justify-between">
                    <Skeleton className="h-6 w-16 rounded-full" shimmer />
                    <Skeleton className="h-6 w-6 rounded-full" shimmer />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Completed Tasks Skeleton */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-4 w-32" shimmer />
              <Skeleton className="h-6 w-10 rounded-full" shimmer />
            </div>

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-1/2" shimmer />
                    <Skeleton className="h-6 w-6 rounded-full" shimmer />
                  </div>
                  <Skeleton className="h-3 w-2/3" shimmer />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
