export default function ExploreLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="h-9 w-72 rounded-lg bg-zinc-800 animate-pulse mb-2" />
        <div className="h-4 w-48 rounded bg-zinc-800 animate-pulse" />
      </div>
      {/* Search bar */}
      <div className="h-12 rounded-xl bg-zinc-800 animate-pulse mb-4" />
      {/* City chips */}
      <div className="flex gap-2 flex-wrap mb-8">
        {Array(9).fill(0).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-zinc-800 animate-pulse" />
        ))}
      </div>
      {/* Artist cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="h-32 bg-zinc-800 animate-pulse" />
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-700 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-28 rounded bg-zinc-700 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-zinc-700 animate-pulse" />
                </div>
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-24 rounded bg-zinc-700 animate-pulse" />
                <div className="h-3 w-16 rounded bg-zinc-700 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
