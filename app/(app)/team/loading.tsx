export default function TeamLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-16 bg-white/[0.07] rounded-md animate-pulse mb-1.5" />
          <div className="h-4 w-32 bg-white/[0.04] rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-white/[0.07] rounded-md animate-pulse" />
          <div className="h-9 w-28 bg-white/[0.07] rounded-md animate-pulse" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-4 px-5 py-3 border-b border-white/[0.07] bg-white/[0.02]">
          {['NAME', 'TEAM', 'FUNCTION', 'STATUS'].map((col) => (
            <div key={col} className="h-3 w-14 bg-white/[0.06] rounded animate-pulse" />
          ))}
        </div>
        {/* Rows */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="grid grid-cols-4 px-5 py-4 border-b border-white/[0.04] last:border-0 items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/[0.07] animate-pulse shrink-0" />
              <div>
                <div className="h-3.5 w-24 bg-white/[0.07] rounded animate-pulse mb-1.5" />
                <div className="h-2.5 w-32 bg-white/[0.04] rounded animate-pulse" />
              </div>
            </div>
            <div className="h-3.5 w-20 bg-white/[0.06] rounded animate-pulse" />
            <div className="h-3.5 w-16 bg-white/[0.06] rounded animate-pulse" />
            <div className="h-5 w-14 bg-white/[0.06] rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
