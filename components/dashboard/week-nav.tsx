'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { getWeekStart, prevWeekStart, nextWeekStart, formatWeekRange } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = { weekStart: string }

export function WeekNav({ weekStart }: Props) {
  const currentWeek = format(getWeekStart(), 'yyyy-MM-dd')
  const isCurrentWeek = weekStart === currentWeek

  const prev = prevWeekStart(weekStart)
  const next = nextWeekStart(weekStart)

  return (
    <div className="flex items-center gap-1">
      {/* Previous week */}
      <Link
        href={`/dashboard?week=${prev}`}
        prefetch={true}
        className="w-7 h-7 flex items-center justify-center border border-white/10 rounded-md hover:bg-white/[0.05] transition-colors text-[#71717a] hover:text-white"
        aria-label="Previous week"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </Link>

      {/* Date range — inline between arrows */}
      <span className="text-[13px] font-medium text-[#a1a1aa] px-1.5 select-none tabular-nums">
        {formatWeekRange(weekStart)}
      </span>

      {/* Next week */}
      {isCurrentWeek ? (
        <span
          className="w-7 h-7 flex items-center justify-center border border-white/[0.06] rounded-md opacity-25 cursor-not-allowed text-[#71717a]"
          aria-disabled="true"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      ) : (
        <Link
          href={`/dashboard?week=${next}`}
          prefetch={true}
          className="w-7 h-7 flex items-center justify-center border border-white/10 rounded-md hover:bg-white/[0.05] transition-colors text-[#71717a] hover:text-white"
          aria-label="Next week"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}

      {/* "This week" shortcut — shown when viewing a past week */}
      {!isCurrentWeek && (
        <Link
          href={`/dashboard?week=${currentWeek}`}
          prefetch={true}
          className="ml-1 text-[11px] text-[#71717a] hover:text-white border border-white/10 px-2.5 h-7 flex items-center rounded-md transition-colors"
        >
          Today
        </Link>
      )}
    </div>
  )
}
