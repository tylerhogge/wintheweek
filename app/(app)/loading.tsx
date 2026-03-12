export default function Loading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 bg-white/[0.06] rounded-md" />
          <div className="h-4 w-32 bg-white/[0.04] rounded-md" />
        </div>
        <div className="h-8 w-24 bg-white/[0.04] rounded-md" />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-4 gap-4 mb-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[88px] bg-white/[0.04] rounded-xl border border-white/[0.06]" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="flex flex-col gap-3 mt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white/[0.04] rounded-xl border border-white/[0.06]" />
        ))}
      </div>
    </div>
  )
}
