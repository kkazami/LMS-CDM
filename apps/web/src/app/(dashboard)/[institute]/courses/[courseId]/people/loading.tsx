import Skeleton from "@/components/common/Skeleton";

export default function PeopleLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" shimmer />
        <Skeleton className="h-9 w-28" shimmer />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Heading row */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-200 bg-gray-50">
          <Skeleton className="h-4 w-12" shimmer />
          <Skeleton className="h-4 w-32 flex-1" shimmer />
          <Skeleton className="h-4 w-40" shimmer />
          <Skeleton className="h-4 w-20" shimmer />
        </div>

        {/* 6 data rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-b-0"
          >
            <Skeleton className="h-8 w-8 shrink-0" rounded shimmer />
            <Skeleton className="h-4 w-36 flex-1" shimmer />
            <Skeleton className="h-4 w-44" shimmer />
            <Skeleton className="h-5 w-16 rounded-full" shimmer />
          </div>
        ))}
      </div>
    </div>
  );
}
