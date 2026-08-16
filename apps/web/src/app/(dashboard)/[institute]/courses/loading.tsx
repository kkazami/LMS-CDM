import Skeleton from "@/components/common/Skeleton";

export default function CoursesLoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" shimmer />
        <Skeleton className="h-10 w-28 rounded-xl" shimmer />
      </div>

      {/* 6-card grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] overflow-hidden shadow-xs"
          >
            {/* Card header band */}
            <Skeleton className="h-28 w-full rounded-none" shimmer />
            {/* Card body */}
            <div className="px-5 py-4 space-y-3">
              <Skeleton className="h-4 w-3/4" shimmer />
              <Skeleton className="h-3 w-1/2" shimmer />
              <div className="pt-2 flex justify-between">
                <Skeleton className="h-3 w-16" shimmer />
                <Skeleton className="h-3 w-16" shimmer />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
