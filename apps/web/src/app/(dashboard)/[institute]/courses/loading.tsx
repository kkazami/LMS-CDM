import Skeleton from "@/components/common/Skeleton";

export default function CoursesLoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" shimmer />
        <Skeleton className="h-10 w-28" shimmer />
      </div>

      {/* 6-card grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 overflow-hidden"
          >
            {/* Card header band */}
            <Skeleton className="h-24 w-full rounded-none" shimmer />
            {/* Card body */}
            <div className="px-5 py-4 space-y-2">
              <Skeleton className="h-4 w-3/4" shimmer />
              <Skeleton className="h-3 w-1/2" shimmer />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
