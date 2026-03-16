'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { getWeekStart, prevWeekStart, nextWeekStart } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = { weekStart: string }

export function WeekNav({ weekStart }: Props) {
  const currentWeek = format(getWeekStart(), 'yyyy-MM-dd')
  const isCurrentWeek = weekStart === currentWeek

  const prev = prevWeekStart(weekStart)
  const next = nextWeekStart(weekStart)

  return (
    <div className="flex items-center gap-1">
      {/* Previous week — always prefetched on hover */}
      <Link
        href={`/dashboard?week=${prev}`}
        prefetch={true}
        className="w-8 h-8 flex items-center justify-center border border-white/10 rounded-md hover:bg-white/[0.05] transition-colors text-[#71717a] hover:text-white"
      >
        <ChevronLeft className="w-4 h-4" />
      </Link>

      {/* "This week" shortcut — shown when viewing a past week */}
      {!isCurrentWeek && (
        <Link
          href={`/dashboard?week=${currentWeek}`}
          prefetch={true}
          className="text-xs text-[#71717a] hover:text-white border border-white/10 px-3 h-8 flex items-center rounded-md transition-colors"
        >
          This week
        </Link>
      )}

      {/* Next week — disabled when already on current week */}
      {isCurrentWeek ? (
        <span className="w-8 h-8 flex items-center justify-center border border-white/10 rounded-md opacity-30 cursor-not-allowed text-[#71717a]">
          <ChevronRight className="w-4 h-4" />
        </span>
      ) : (
        <Link
          href={`/dashboard?week=${next}`}
          prefetch={true}
          className="w-8 h-8 flex items-center justify-center border border-white/10 rounded-md hover:bg-white/[0.05] transition-colors text-[#71717a] hover:text-white"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  )
}
