'use client'

import { useState } from 'react'
import { getInitials, avatarGradient } from '@/lib/utils'

type WeekData = { week: string; sent: number; replied: number; rate: number }
type EmployeeData = { name: string; team: string | null; sent: number; replied: number; rate: number; missed: number }
type TeamData = { team: string; sent: number; replied: number; rate: number }

type Props = {
  weeklyData: WeekData[]
  employeeList: EmployeeData[]
  teamList: TeamData[]
}

function formatWeekLabel(week: string) {
  const d = new Date(week + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function RateBar({ rate }: { rate: number }) {
  const color =
    rate >= 90 ? 'bg-accent' :
    rate >= 70 ? 'bg-yellow-500' :
    rate >= 50 ? 'bg-orange-500' :
    'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`text-xs font-medium tabular-nums w-10 text-right ${
        rate >= 90 ? 'text-accent' : rate >= 70 ? 'text-yellow-500' : rate >= 50 ? 'text-orange-500' : 'text-red-400'
      }`}>{rate}%</span>
    </div>
  )
}

export function TrendsClient({ weeklyData, employeeList, teamList }: Props) {
  const [tab, setTab] = useState<'people' | 'teams'>('people')

  // Chart: simple bar chart showing reply rate per week
  const maxRate = 100
  const chartHeight = 160

  return (
    <div className="space-y-6">

      {/* ── Reply Rate Over Time ──────────────────────────────────────────── */}
      <div className="bg-surface border border-white/[0.07] rounded-xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-semibold">Reply rate over time</p>
            <p className="text-xs text-[#71717a] mt-0.5">Last 12 weeks</p>
          </div>
          {weeklyData.length > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {weeklyData[weeklyData.length - 1].rate}%
              </p>
              <p className="text-[10px] text-[#71717a] uppercase tracking-wider">This week</p>
            </div>
          )}
        </div>

        {weeklyData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-[#52525b]">
            No data yet — reply rates will appear after your first campaign.
          </div>
        ) : (
          <div className="flex items-end gap-1 sm:gap-1.5" style={{ height: chartHeight }}>
            {weeklyData.map((w, i) => {
              const barH = Math.max(4, (w.rate / maxRate) * chartHeight)
              const color =
                w.rate >= 90 ? 'bg-accent' :
                w.rate >= 70 ? 'bg-yellow-500' :
                w.rate >= 50 ? 'bg-orange-500' :
                'bg-red-500'
              return (
                <div key={w.week} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-[#1c1c1f] border border-white/[0.1] rounded-lg px-3 py-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    <p className="font-medium text-white">{w.rate}% reply rate</p>
                    <p className="text-[#71717a]">{w.replied}/{w.sent} replied · {formatWeekLabel(w.week)}</p>
                  </div>
                  <div
                    className={`w-full rounded-t-sm ${color} transition-all hover:opacity-80`}
                    style={{ height: barH }}
                  />
                  {/* Week label — show every other on mobile, all on desktop */}
                  <span className={`text-[9px] text-[#52525b] tabular-nums ${i % 2 !== 0 ? 'hidden sm:block' : ''}`}>
                    {formatWeekLabel(w.week)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Summary Stats ─────────────────────────────────────────────────── */}
      {weeklyData.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(() => {
            const totalSent = weeklyData.reduce((a, w) => a + w.sent, 0)
            const totalReplied = weeklyData.reduce((a, w) => a + w.replied, 0)
            const avgRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0
            const streak = [...weeklyData].reverse().findIndex((w) => w.rate < 100)
            return (
              <>
                <div className="bg-surface border border-white/[0.07] rounded-xl px-4 py-3.5">
                  <p className="text-[11px] text-[#71717a] uppercase tracking-wider mb-1">Avg rate</p>
                  <p className="text-xl font-bold tabular-nums">{avgRate}%</p>
                </div>
                <div className="bg-surface border border-white/[0.07] rounded-xl px-4 py-3.5">
                  <p className="text-[11px] text-[#71717a] uppercase tracking-wider mb-1">Total replies</p>
                  <p className="text-xl font-bold tabular-nums">{totalReplied}</p>
                </div>
                <div className="bg-surface border border-white/[0.07] rounded-xl px-4 py-3.5">
                  <p className="text-[11px] text-[#71717a] uppercase tracking-wider mb-1">100% streak</p>
                  <p className="text-xl font-bold tabular-nums">{streak === -1 ? weeklyData.length : streak}w</p>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ── People vs Teams toggle ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-1 mb-4">
          <button
            onClick={() => setTab('people')}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
              tab === 'people'
                ? 'bg-white/[0.07] border-white/[0.12] text-white'
                : 'border-white/[0.07] text-[#71717a] hover:text-white'
            }`}
          >
            People
          </button>
          <button
            onClick={() => setTab('teams')}
            className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
              tab === 'teams'
                ? 'bg-white/[0.07] border-white/[0.12] text-white'
                : 'border-white/[0.07] text-[#71717a] hover:text-white'
            }`}
          >
            Teams
          </button>
          <span className="text-[11px] text-[#52525b] ml-2">Last 8 weeks</span>
        </div>

        {tab === 'people' ? (
          <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.07] grid grid-cols-[2fr_1fr_80px] sm:grid-cols-[2fr_1.2fr_1fr_100px] text-xs font-medium text-[#71717a] uppercase tracking-[0.06em]">
              <span>Name</span>
              <span className="hidden sm:block">Team</span>
              <span>Reply rate</span>
              <span className="text-right">Missed</span>
            </div>
            {employeeList.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#52525b]">No data yet</div>
            ) : (
              employeeList.map((emp, i) => (
                <div
                  key={emp.name + i}
                  className={`px-5 py-3 grid grid-cols-[2fr_1fr_80px] sm:grid-cols-[2fr_1.2fr_1fr_100px] items-center ${
                    i < employeeList.length - 1 ? 'border-b border-white/[0.05]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${avatarGradient(emp.name)} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}>
                      {getInitials(emp.name)}
                    </div>
                    <span className="text-[13px] font-medium truncate">{emp.name}</span>
                  </div>
                  <span className="hidden sm:block text-sm text-[#a1a1aa] truncate">{emp.team ?? '—'}</span>
                  <RateBar rate={emp.rate} />
                  <span className={`text-xs text-right tabular-nums ${emp.missed > 0 ? 'text-red-400' : 'text-[#52525b]'}`}>
                    {emp.missed > 0 ? emp.missed : '—'}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.07] grid grid-cols-[2fr_1fr_80px] text-xs font-medium text-[#71717a] uppercase tracking-[0.06em]">
              <span>Team</span>
              <span>Reply rate</span>
              <span className="text-right">Replies</span>
            </div>
            {teamList.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#52525b]">No data yet</div>
            ) : (
              teamList.map((t, i) => (
                <div
                  key={t.team}
                  className={`px-5 py-3.5 grid grid-cols-[2fr_1fr_80px] items-center ${
                    i < teamList.length - 1 ? 'border-b border-white/[0.05]' : ''
                  }`}
                >
                  <span className="text-[13px] font-medium">{t.team}</span>
                  <RateBar rate={t.rate} />
                  <span className="text-xs text-[#a1a1aa] text-right tabular-nums">{t.replied}/{t.sent}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
