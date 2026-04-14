import Link from 'next/link'

const DAY_LABEL: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday',
}

const TZ_LABELS: Record<string, string> = {
  'America/Denver': 'MT', 'America/Chicago': 'CT', 'America/New_York': 'ET',
  'America/Los_Angeles': 'PT', 'America/Phoenix': 'AZ', 'UTC': 'UTC',
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

type ScheduledInfo = {
  employeeCount: number
  campaignId: string
  sendDay: number
  sendTime: string
  timezone: string
} | null

type Props = {
  total: number
  replied: number
  weekStart: string
  activeFilter?: string
  team?: string
  scheduled?: ScheduledInfo
}

export function StatsBar({ total, replied, weekStart, activeFilter, team, scheduled }: Props) {
  const pct = total > 0 ? Math.round((replied / total) * 100) : 0
  const pending = total - replied

  // Build base URL preserving team filter
  const base = `/dashboard?week=${weekStart}${team ? `&team=${team}` : ''}`

  const showQueued = scheduled && scheduled.employeeCount > 0 && total === 0

  const stats = [
    { label: 'Sent', value: total, filter: 'sent' as const },
    { label: 'Replied', value: replied, filter: 'replied' as const },
    { label: 'Pending', value: pending, filter: 'pending' as const },
    { label: 'Reply rate', value: `${pct}%`, filter: null },
  ]

  const cols = showQueued ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'

  return (
    <div className={`grid ${cols} gap-3`}>
      {/* Queued card with schedule details */}
      {showQueued && scheduled && (
        <Link
          key="queued"
          href={`/campaigns/${scheduled.campaignId}`}
          prefetch={true}
          className="bg-surface border border-accent/20 bg-accent/[0.03] hover:border-accent/40 rounded-xl px-4 py-3.5 transition-colors cursor-pointer"
        >
          <p className="text-[11px] text-[#71717a] font-medium mb-1">Queued</p>
          <p className="text-2xl font-bold tracking-[-0.03em]">{scheduled.employeeCount}</p>
          <p className="text-[10px] text-[#71717a] mt-1.5">
            {DAY_LABEL[scheduled.sendDay]} {formatTime(scheduled.sendTime)} {TZ_LABELS[scheduled.timezone] ?? scheduled.timezone}
          </p>
          <p className="text-[10px] font-medium text-accent mt-1">Edit campaign →</p>
        </Link>
      )}

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
