import Skeleton from "@/components/common/Skeleton";

export default function TodoLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <Skeleton className="h-8 w-24" shimmer />
        <Skeleton className="h-4 w-64 mt-2" shimmer />
      </div>

      {/* Filter Bar */}
      <div className="mb-6">
        <Skeleton className="h-10 w-52 rounded-full" shimmer />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {["This week", "Next week", "Later", "No due date"].map(
          (label, sectionIdx) => (
            <div key={label} className="mb-2">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-3">
                <Skeleton className="h-6 w-28" shimmer />
                <Skeleton className="h-5 w-6" shimmer />
              </div>

              {/* Item rows — only show 3 rows for the first section */}
              {sectionIdx === 0 && (
                <div className="space-y-0">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 py-4 px-4 sm:px-6"
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
