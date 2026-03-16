export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-44 bg-white/[0.06] rounded-md" />
          <div className="h-4 w-36 bg-white/[0.04] rounded-md" />
        </div>
        {/* WeekNav skeleton */}
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 bg-white/[0.04] border border-white/[0.06] rounded-md" />
          <div className="w-8 h-8 bg-white/[0.04] border border-white/[0.06] rounded-md" />
        </div>
      </div>

      {/* Stats bar skeleton */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5">
            <div className="h-3 w-12 bg-white/[0.06] rounded mb-2" />
            <div className="h-7 w-10 bg-white/[0.08] rounded" />
          </div>
        ))}
      </div>

      {/* Team filter chips skeleton */}
      <div className="flex items-center gap-2 mt-6 mb-4">
        <div className="h-7 w-20 bg-white/[0.04] border border-white/[0.06] rounded-full" />
        <div className="h-7 w-24 bg-white/[0.04] border border-white/[0.06] rounded-full" />
        <div className="h-7 w-16 bg-white/[0.04] border border-white/[0.06] rounded-full" />
      </div>

      {/* Reply cards skeleton */}
      <div className="flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-surface border border-white/[0.07] rounded-xl px-5 py-4 flex items-start gap-4">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-white/[0.06] shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col gap-2 pt-0.5">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-28 bg-white/[0.08] rounded" />
                <div className="h-3 w-14 bg-white/[0.04] rounded-full" />
              </div>
              <div className="h-3 w-full bg-white/[0.04] rounded" />
              <div className="h-3 w-3/4 bg-white/[0.04] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
