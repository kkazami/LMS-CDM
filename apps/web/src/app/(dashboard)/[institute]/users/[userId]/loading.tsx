export default function PublicProfileLoading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      {/* Banner skeleton */}
      <div className="h-36 rounded-t-2xl bg-gray-200 sm:h-44" />

      <div className="relative px-6">
        {/* Avatar skeleton */}
        <div className="-mt-12 mb-4">
          <div className="h-20 w-20 rounded-full bg-gray-300 ring-4 ring-white" />
        </div>

        {/* Name skeleton */}
        <div className="h-7 w-48 rounded bg-gray-200" />
        <div className="mt-2 flex items-center gap-2">
          <div className="h-5 w-16 rounded-full bg-gray-200" />
          <div className="h-4 w-32 rounded bg-gray-200" />
        </div>
      </div>

      {/* About section skeleton */}
      <div className="mt-8 px-6">
        <div className="h-4 w-24 rounded bg-gray-200 mb-3" />
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="h-4 w-full rounded bg-gray-100" />
          <div className="h-4 w-3/4 rounded bg-gray-100" />
          <hr className="border-gray-100" />
          <div className="h-4 w-48 rounded bg-gray-100" />
          <div className="h-4 w-40 rounded bg-gray-100" />
        </div>
      </div>

      {/* Courses section skeleton */}
      <div className="mt-6 px-6 pb-8">
        <div className="h-4 w-28 rounded bg-gray-200 mb-3" />
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-32 rounded-full bg-gray-100" />
            <div className="h-8 w-40 rounded-full bg-gray-100" />
            <div className="h-8 w-36 rounded-full bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
