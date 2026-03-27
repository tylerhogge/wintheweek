'use client'

import { Sparkles } from 'lucide-react'
import Link from 'next/link'

type Props = {
  replied: number
  total: number
}

export function BriefingPlaceholder({ replied, total }: Props) {
  const threshold = Math.ceil(total / 2)
  const remaining = Math.max(0, threshold - replied)
  const pct = total > 0 ? Math.round((replied / threshold) * 100) : 0
  const progressPct = Math.min(pct, 100)

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-accent/50" />
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-accent/50">
          AI CEO Briefing
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/[0.06] rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-accent/40 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <p className="text-[13px] text-[#a1a1aa] leading-relaxed">
        {remaining > 0 ? (
          <>
            Your AI-generated CEO briefing will appear here once at least half of your team has replied.{' '}
            <span className="text-[#d4d4d8] font-medium">{remaining} more {remaining === 1 ? 'reply' : 'replies'} needed.</span>
            {' '}The briefing updates with each new reply and finalizes when everyone has responded.
          </>
        ) : (
          <>
            Enough replies are in to generate your briefing.
            {' '}It will update as more replies come in.
          </>
        )}
      </p>

      <p className="text-[11.5px] text-[#71717a] mt-2">
        You can also receive this as an email — configure that in{' '}
        <Link href="/settings" className="text-accent/70 hover:text-accent transition-colors">Settings</Link>.
      </p>
    </div>
  )
}
