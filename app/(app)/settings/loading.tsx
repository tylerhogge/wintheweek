export default function SettingsLoading() {
  return (
    <div className="max-w-[640px]">
      {/* Header */}
      <div className="mb-8">
        <div className="h-7 w-20 bg-white/[0.07] rounded-md animate-pulse mb-1.5" />
        <div className="h-4 w-48 bg-white/[0.04] rounded animate-pulse" />
      </div>

      {/* Section */}
      {[...Array(3)].map((_, s) => (
        <section key={s} className="mb-8">
          <div className="h-3 w-24 bg-white/[0.06] rounded animate-pulse mb-4" />
          <div className="bg-surface border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
            {[...Array(2)].map((_, r) => (
              <div key={r} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="h-3.5 w-32 bg-white/[0.07] rounded animate-pulse mb-1.5" />
                  <div className="h-3 w-40 bg-white/[0.04] rounded animate-pulse" />
                </div>
                <div className="h-7 w-12 bg-white/[0.06] rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
