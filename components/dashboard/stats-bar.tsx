import Link from 'next/link'

type Props = {
  total: number
  replied: number
  weekStart: string
  activeFilter?: string
  team?: string
}

export function StatsBar({ total, replied, weekStart, activeFilter, team }: Props) {
  const pct = total > 0 ? Math.round((replied / total) * 100) : 0
  const pending = total - replied

  // Build base URL preserving team filter
  const base = `/dashboard?week=${weekStart}${team ? `&team=${team}` : ''}`

  const stats = [
    { label: 'Sent', value: total, filter: 'sent' },
    { label: 'Replied', value: replied, filter: 'replied' },
    { label: 'Pending', value: pending, filter: 'pending' },
    { label: 'Reply rate', value: `${pct}%`, filter: null },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ label, value, filter: f }): React.ReactNode => {
        const isActive = f && activeFilter === f
        const isClickable = f && ((f === 'replied' && replied > 0) || (f === 'pending' && pending > 0) || f === 'sent')

        // Toggle: clicking active filter clears it; clicking inactive sets it
        const href = isActive ? base : f ? `${base}&filter=${f}` : undefined

        const inner = (
          <>
            <p className="text-[11px] text-[#71717a] font-medium mb-1">{label}</p>
            <p className="text-2xl font-bold tracking-[-0.03em]">{value}</p>
          </>
        )

        if (isClickable && href) {
          return (
            <Link
              key={label}
              href={href}
              prefetch={true}
              className={`bg-surface border rounded-xl px-4 py-3.5 transition-colors cursor-pointer ${
                isActive
                  ? 'border-accent/40 bg-accent/[0.04]'
                  : 'border-white/[0.07] hover:border-white/[0.14]'
              }`}
            >
              {inner}
            </Link>
          )
        }

        return (
          <div key={label} className="bg-surface border border-white/[0.07] rounded-xl px-4 py-3.5">
            {inner}
          </div>
        )
      })}
    </div>
  )
}
