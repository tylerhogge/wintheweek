'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { getWeekStart, prevWeekStart, nextWeekStart } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = { weekStart: string }

export function WeekNav({ weekStart }: Props) {
  const router = useRouter()
  const currentWeek = format(getWeekStart(), 'yyyy-MM-dd')
  const isCurrentWeek = weekStart === currentWeek

  function go(week: string) {
    router.push(`/dashboard?week=${week}`)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => go(prevWeekStart(weekStart))}
        className="w-8 h-8 flex items-center justify-center border border-white/10 rounded-md hover:bg-white/[0.05] transition-colors text-[#71717a] hover:text-white"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {!isCurrentWeek && (
        <button
          onClick={() => go(currentWeek)}
          className="text-xs text-[#71717a] hover:text-white border border-white/10 px-3 h-8 rounded-md transition-colors"
        >
          This week
        </button>
      )}

      <button
        onClick={() => go(nextWeekStart(weekStart))}
        disabled={isCurrentWeek}
        className="w-8 h-8 flex items-center justify-center border border-white/10 rounded-md hover:bg-white/[0.05] transition-colors text-[#71717a] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
