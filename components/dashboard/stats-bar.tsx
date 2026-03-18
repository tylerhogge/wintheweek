type Props = { total: number; replied: number; weekStart: string }

export function StatsBar({ total, replied }: Props) {
  const pct = total > 0 ? Math.round((replied / total) * 100) : 0

  const stats = [
    { label: 'Sent', value: total },
    { label: 'Replied', value: replied },
    { label: 'Pending', value: total - replied },
    { label: 'Reply rate', value: `${pct}%` },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ label, value }: { label: string; value: number | string }): React.ReactNode => (
        <div key={label} className="bg-surface border border-white/[0.07] rounded-xl px-4 py-3.5">
          <p className="text-[11px] text-[#71717a] font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold tracking-[-0.03em]">{value}</p>
        </div>
      ))}
    </div>
  )
}
