import Skeleton from "@/components/common/Skeleton";

export default function TodoLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <Skeleton className="h-8 w-28" shimmer />
        <Skeleton className="h-4 w-64 mt-2" shimmer />
      </div>

      {/* Filter Bar */}
      <div>
        <Skeleton className="h-10 w-52 rounded-xl" shimmer />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {["This week", "Next week", "Later", "No due date"].map(
          (label, sectionIdx) => (
            <div key={label} className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3 mb-3">
                <Skeleton className="h-5 w-28" shimmer />
                <Skeleton className="h-4 w-6" shimmer />
              </div>

              {/* Item rows — only show 3 rows for the first section */}
              {sectionIdx === 0 && (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 py-3 px-2 rounded-xl"
                    >
                      <Skeleton className="h-10 w-10 shrink-0" rounded shimmer />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/5" shimmer />
                        <Skeleton className="h-3 w-2/5" shimmer />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" shimmer />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
