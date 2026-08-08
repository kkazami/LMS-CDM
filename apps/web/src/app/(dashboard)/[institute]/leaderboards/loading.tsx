import Skeleton from "@/components/common/Skeleton";

export default function LeaderboardsLoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="mb-4">
        <Skeleton className="h-8 w-40" shimmer />
        <Skeleton className="h-4 w-56 mt-2" shimmer />
      </div>

      {/* 5 rank-row skeletons */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 last:border-b-0"
          >
            {/* Rank number */}
            <Skeleton className="h-8 w-8 shrink-0" rounded shimmer />
            {/* Avatar */}
            <Skeleton className="h-10 w-10 shrink-0" rounded shimmer />
            {/* Name */}
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" shimmer />
              <Skeleton className="h-3 w-20" shimmer />
            </div>
            {/* Score bar */}
            <Skeleton className="h-6 w-24 rounded-full" shimmer />
          </div>
        ))}
      </div>
    </div>
  );
}
