import { cn } from '@/lib/utils'
import type { Insight } from '@/types'

type Props = { insight: Insight; className?: string }

export function AISummary({ insight, className }: Props) {
  if (!insight.summary) return null

  return (
    <div className={cn(
      'bg-accent/[0.06] border border-accent/[0.18] rounded-xl px-5 py-4',
      className,
    )}>
      <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-accent mb-2.5 flex items-center gap-1.5">
        <span>✦</span> AI Summary
      </p>
      <p className="text-sm text-[#a1a1aa] leading-relaxed mb-3">{insight.summary}</p>

      {insight.highlights && insight.highlights.length > 0 && (
        <ul className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-white/[0.06]">
          {insight.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#a1a1aa]">
              <span className="text-accent font-bold text-xs mt-0.5 shrink-0">→</span>
              {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
