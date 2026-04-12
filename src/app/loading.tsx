export default function HomeLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Style filter skeleton */}
      <div className="flex gap-2 overflow-x-hidden pb-2 mb-6">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="shrink-0 h-8 w-24 rounded-full bg-zinc-800 animate-pulse" />
        ))}
      </div>
      {/* Masonry skeleton */}
      <div className="masonry-grid">
        {Array(12).fill(0).map((_, i) => (
          <div key={i} className="break-inside-avoid mb-4">
            <div
              className="w-full rounded-2xl bg-zinc-800 animate-pulse"
              style={{ height: `${220 + (i % 3) * 80}px` }}
            />
            <div className="flex items-center gap-2 mt-2 px-1">
              <div className="w-6 h-6 rounded-full bg-zinc-800 animate-pulse" />
              <div className="h-3 w-28 rounded bg-zinc-800 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
