import { Suspense } from 'react'
import { createClient, getAuthUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getWeekStart } from '@/lib/utils'
import { format, subWeeks, startOfWeek } from 'date-fns'
import { TrendsClient } from './trends-client'

// ── Data fetcher — streams in via Suspense ────────────────────────────────
async function TrendsContent({ orgId }: { orgId: string }) {
  const supabase = await createClient()

  // Fetch last 12 weeks of submissions
  const now = new Date()
  const twelveWeeksAgo = format(startOfWeek(subWeeks(now, 12), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const [{ data: submissions }, { data: employees }] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, week_start, replied_at, sent_at, employee_id, employees!inner(name, team, org_id)')
      .eq('employees.org_id', orgId)
      .gte('week_start', twelveWeeksAgo)
      .not('sent_at', 'is', null)
      .order('week_start', { ascending: true }),
    supabase
      .from('employees')
      .select('id, name, team, active')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('name'),
  ])

  // Group by week for chart data
  const weekMap = new Map<string, { sent: number; replied: number }>()
  for (const sub of submissions ?? []) {
    const week = sub.week_start
    const entry = weekMap.get(week) ?? { sent: 0, replied: 0 }
    entry.sent++
    if (sub.replied_at) entry.replied++
    weekMap.set(week, entry)
  }

  const weeklyData = Array.from(weekMap.entries())
    .map(([week, { sent, replied }]) => ({
      week,
      sent,
      replied,
      rate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))

  // Per-employee stats (last 8 weeks for relevance)
  const eightWeeksAgo = format(startOfWeek(subWeeks(now, 8), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const recentSubs = (submissions ?? []).filter((s) => s.week_start >= eightWeeksAgo)

  const employeeStats = new Map<string, { name: string; team: string | null; sent: number; replied: number }>()
  for (const sub of recentSubs) {
    const emp = (sub as any).employees
    const id = sub.employee_id
    const entry = employeeStats.get(id) ?? { name: emp?.name ?? 'Unknown', team: emp?.team ?? null, sent: 0, replied: 0 }
    entry.sent++
    if (sub.replied_at) entry.replied++
    employeeStats.set(id, entry)
  }

  const employeeList = Array.from(employeeStats.values())
    .map((e) => ({
      ...e,
      rate: e.sent > 0 ? Math.round((e.replied / e.sent) * 100) : 0,
      missed: e.sent - e.replied,
    }))
    .sort((a, b) => a.rate - b.rate) // Least responsive first

  // Team stats
  const teamStats = new Map<string, { sent: number; replied: number }>()
  for (const sub of recentSubs) {
    const team = (sub as any).employees?.team ?? 'No team'
    const entry = teamStats.get(team) ?? { sent: 0, replied: 0 }
    entry.sent++
    if (sub.replied_at) entry.replied++
    teamStats.set(team, entry)
  }

  const teamList = Array.from(teamStats.entries())
    .map(([team, { sent, replied }]) => ({
      team,
      sent,
      replied,
      rate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
    }))
    .sort((a, b) => a.rate - b.rate)

  return (
    <TrendsClient
      weeklyData={weeklyData}
      employeeList={employeeList}
      teamList={teamList}
    />
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────
function TrendsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-6 w-32 bg-white/[0.08] rounded" />
      <div className="bg-surface border border-white/[0.07] rounded-xl p-6">
        <div className="h-48 bg-white/[0.04] rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5 h-64" />
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5 h-64" />
      </div>
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────
export default async function TrendsPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user) redirect('/auth/login')
  if (!profile?.org_id) redirect('/onboarding')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.04em] mb-0.5">Trends</h1>
        <p className="text-sm text-[#71717a]">Reply rates and engagement over time</p>
      </div>
      <Suspense fallback={<TrendsSkeleton />}>
        <TrendsContent orgId={profile.org_id} />
      </Suspense>
    </div>
  )
}
