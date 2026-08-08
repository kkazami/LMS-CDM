import Skeleton from "@/components/common/Skeleton";

export default function TeacherDashboardLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner Skeleton */}
      <div className="rounded-2xl p-6 sm:p-8 overflow-hidden">
        <Skeleton className="h-28 w-full rounded-2xl" shimmer />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: My Courses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9" rounded shimmer />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-36" shimmer />
                <Skeleton className="h-3 w-56" shimmer />
              </div>
            </div>
            <Skeleton className="h-7 w-24 rounded-full" shimmer />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                <Skeleton className="h-28 w-full rounded-none" shimmer />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" shimmer />
                  <Skeleton className="h-3 w-1/2" shimmer />
                  <div className="pt-3 border-t border-gray-100 mt-3 flex justify-between">
                    <div className="flex gap-3">
                      <Skeleton className="h-3 w-16" shimmer />
                      <Skeleton className="h-3 w-16" shimmer />
                    </div>
                    <Skeleton className="h-3 w-20" shimmer />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Pending Requests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-9 w-9" rounded shimmer />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-36" shimmer />
                <Skeleton className="h-3 w-48" shimmer />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100"
              >
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" shimmer />
                  <Skeleton className="h-3 w-24" shimmer />
                </div>
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8" rounded shimmer />
                  <Skeleton className="h-8 w-8" rounded shimmer />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
