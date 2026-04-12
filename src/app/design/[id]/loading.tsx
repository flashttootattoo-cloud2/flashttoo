export default function DesignLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="h-5 w-32 rounded bg-zinc-800 animate-pulse mb-6" />
      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div className="rounded-2xl bg-zinc-800 animate-pulse h-[60vh]" />
        {/* Details */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="h-6 w-20 rounded-full bg-zinc-800 animate-pulse" />
            <div className="h-6 w-20 rounded-full bg-zinc-800 animate-pulse" />
          </div>
          <div className="h-7 w-64 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-zinc-800 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-zinc-800 animate-pulse" />
          </div>
          <div className="h-8 w-32 rounded bg-zinc-800 animate-pulse" />
          <div className="h-12 w-full rounded-xl bg-zinc-800 animate-pulse" />
          {/* Artist card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="h-3 w-20 rounded bg-zinc-700 animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-zinc-700 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-zinc-700 animate-pulse" />
                <div className="h-3 w-24 rounded bg-zinc-700 animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-9 rounded-lg bg-zinc-700 animate-pulse" />
              <div className="h-9 rounded-lg bg-zinc-700 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
