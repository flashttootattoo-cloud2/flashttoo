export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="h-4 w-32 rounded bg-zinc-800 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="h-9 w-32 rounded-lg bg-zinc-800 animate-pulse" />
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="w-5 h-5 rounded bg-zinc-700 animate-pulse" />
            <div className="h-7 w-16 rounded bg-zinc-700 animate-pulse" />
            <div className="h-3 w-28 rounded bg-zinc-700 animate-pulse" />
          </div>
        ))}
      </div>
      {/* Designs grid */}
      <div className="h-5 w-28 rounded bg-zinc-800 animate-pulse mb-4" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-8">
        {Array(12).fill(0).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-zinc-800 animate-pulse" />
        ))}
      </div>
      {/* Reservations */}
      <div className="h-5 w-36 rounded bg-zinc-800 animate-pulse mb-4" />
      <div className="space-y-3">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-zinc-700 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-zinc-700 animate-pulse" />
              <div className="h-3 w-28 rounded bg-zinc-700 animate-pulse" />
            </div>
            <div className="h-6 w-24 rounded-full bg-zinc-700 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
