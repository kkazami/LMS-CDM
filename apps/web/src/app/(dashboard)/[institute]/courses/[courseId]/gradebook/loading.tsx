import Skeleton from "@/components/common/Skeleton";

export default function GradebookLoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" shimmer />
        <Skeleton className="h-9 w-28" shimmer />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-200 bg-gray-50">
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
            className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-b-0"
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
