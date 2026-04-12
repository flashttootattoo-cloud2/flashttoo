export default function ArtistLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="flex flex-col md:flex-row gap-6 mb-10">
        <div className="w-28 h-28 rounded-full bg-zinc-800 animate-pulse shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-48 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="h-4 w-28 rounded bg-zinc-800 animate-pulse" />
          <div className="h-4 w-80 rounded bg-zinc-800 animate-pulse" />
          <div className="h-4 w-64 rounded bg-zinc-800 animate-pulse" />
          <div className="flex gap-3 mt-2">
            <div className="h-9 w-28 rounded-lg bg-zinc-800 animate-pulse" />
            <div className="h-9 w-28 rounded-lg bg-zinc-800 animate-pulse" />
          </div>
        </div>
      </div>
      {/* Gallery */}
      <div className="h-6 w-36 rounded-lg bg-zinc-800 animate-pulse mb-6" />
      <div className="masonry-grid">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="break-inside-avoid mb-4">
            <div
              className="w-full rounded-2xl bg-zinc-800 animate-pulse"
              style={{ height: `${220 + (i % 3) * 80}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
