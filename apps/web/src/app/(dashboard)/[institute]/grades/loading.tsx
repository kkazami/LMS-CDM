import Skeleton from "@/components/common/Skeleton";

export default function GradesLoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="mb-7">
        <Skeleton className="h-8 w-20" shimmer />
        <Skeleton className="h-4 w-72 mt-2" shimmer />
      </div>

      {/* Tab bar */}
      <div className="flex items-end gap-0 border-b border-gray-200 mb-8">
        {[180, 170, 200].map((w, i) => (
          <div key={i} className="px-5 py-3">
            <Skeleton className={`h-5 w-[${w}px]`} shimmer />
          </div>
        ))}
      </div>

      {/* Filter + summary bar */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-10 w-52 rounded-full" shimmer />
        <div className="flex gap-6">
          <Skeleton className="h-10 w-16" shimmer />
          <Skeleton className="h-10 w-16" shimmer />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Header row */}
        <div className="flex items-center gap-4 bg-gray-50 px-4 py-3 border-b border-gray-100">
          {[200, 80, 120, 60, 60, 60, 100].map((w, i) => (
            <Skeleton key={i} className={`h-3.5 w-[${w}px]`} shimmer />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-50 bg-white"
          >
            <div className="flex items-center gap-2.5">
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
