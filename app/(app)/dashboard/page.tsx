import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { getWeekStart, formatWeekRange } from '@/lib/utils'
import { WeekNav } from '@/components/dashboard/week-nav'
import { AISummary } from '@/components/dashboard/ai-summary'
import { StatsBar } from '@/components/dashboard/stats-bar'
import { ReplyCard } from '@/components/dashboard/reply-card'
import type { SubmissionWithDetails, Insight } from '@/types'

interface Props {
  searchParams: Promise<{ week?: string; team?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { week, team } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get the user's org
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) redirect('/onboarding')

  // Resolve week
  const weekStart = week ?? format(getWeekStart(), 'yyyy-MM-dd')

  // Fetch submissions with employee + response for this week
  let query = supabase
    .from('submissions')
    .select(`
      *,
      employee:employees(*),
      response:responses(*)
    `)
    .eq('week_start', weekStart)
    .eq('employees.org_id', profile.org_id)
    .order('replied_at', { ascending: false, nullsFirst: false })

  if (team) {
    query = query.eq('employees.team', team)
  }

  const { data: submissions } = await query

  // Fetch AI insight for this week
  const { data: insight } = await supabase
    .from('insights')
    .select('*')
    .eq('org_id', profile.org_id)
    .eq('week_start', weekStart)
    .single()

  // Fetch distinct teams for filter chips
  const { data: teams } = await supabase
    .from('employees')
    .select('team')
    .eq('org_id', profile.org_id)
    .eq('active', true)
    .not('team', 'is', null)

  const uniqueTeams = [...new Set(teams?.map((t) => t.team).filter(Boolean))] as string[]

  const typed = (submissions ?? []) as SubmissionWithDetails[]
  const replied = typed.filter((s) => s.response !== null)

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] mb-0.5">Weekly Digest</h1>
          <p className="text-sm text-[#71717a]">{formatWeekRange(weekStart)}</p>
        </div>
        <WeekNav weekStart={weekStart} />
      </div>

      {/* Stats row */}
      <StatsBar total={typed.length} replied={replied.length} weekStart={weekStart} />

      {/* AI Summary */}
      {insight && <AISummary insight={insight as Insight} className="mt-5" />}

      {/* Team filter chips */}
      <div className="flex items-center gap-2 mt-6 mb-4 flex-wrap">
        <a
          href={`/dashboard?week=${weekStart}`}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            !team
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20'
          }`}
        >
          All teams
        </a>
        {uniqueTeams.map((t) => (
          <a
            key={t}
            href={`/dashboard?week=${weekStart}&team=${t}`}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              team === t
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20'
            }`}
          >
            {t}
          </a>
        ))}
      </div>

      {/* Replies */}
      {typed.length === 0 ? (
        <div className="text-center py-20 text-[#52525b] text-sm">
          No emails sent for this week yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {typed.map((submission) => (
            <ReplyCard key={submission.id} submission={submission} />
          ))}
        </div>
      )}
    </div>
  )
}
