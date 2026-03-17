export default function CampaignsLoading() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-7 w-20 bg-white/[0.07] rounded-md animate-pulse mb-1.5" />
          <div className="h-4 w-48 bg-white/[0.04] rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-white/[0.07] rounded-md animate-pulse" />
      </div>

      {/* Campaign cards */}
      <div className="flex flex-col gap-3">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="bg-surface border border-white/[0.07] rounded-xl px-6 py-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-white/[0.07] animate-pulse shrink-0" />
              <div>
                <div className="h-4 w-32 bg-white/[0.07] rounded animate-pulse mb-1.5" />
                <div className="h-3 w-48 bg-white/[0.04] rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-14 bg-white/[0.07] rounded-full animate-pulse" />
              <div className="h-7 w-10 bg-white/[0.06] rounded-md animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
