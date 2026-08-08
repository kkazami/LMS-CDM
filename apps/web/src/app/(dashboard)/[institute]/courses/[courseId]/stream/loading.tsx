import Skeleton from "@/components/common/Skeleton";

export default function StreamLoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner skeleton */}
      <Skeleton className="h-40 w-full rounded-2xl" shimmer />

      {/* 3 post-card skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-5 space-y-3"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0" rounded shimmer />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" shimmer />
                <Skeleton className="h-3 w-16" shimmer />
              </div>
              <Skeleton className="h-4 w-full" shimmer />
              <Skeleton className="h-4 w-3/4" shimmer />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
