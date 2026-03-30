import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser, getProfile } from '@/lib/supabase/server'
import { getWeekStart } from '@/lib/utils'
import { WeekNav } from '@/components/dashboard/week-nav'
import { AISummary } from '@/components/dashboard/ai-summary'
import { StatsBar } from '@/components/dashboard/stats-bar'
import { ReplyList } from '@/components/dashboard/reply-list'
import { GenerateSummaryBtn } from '@/components/dashboard/generate-summary-btn'
import { BriefingPlaceholder } from '@/components/dashboard/briefing-placeholder'
import { SearchBar } from '@/components/dashboard/search-bar'
import type { SubmissionWithDetails, Insight } from '@/types'

// Force dynamic rendering — skips static analysis overhead on every request
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ week?: string; team?: string; filter?: string }>
}

// ── Streaming data component ──────────────────────────────────────────────────
// Runs on the server and streams HTML to the browser as soon as it resolves.
// The page shell (header + week nav) renders instantly without waiting for this.
async function DashboardContent({
  orgId,
  weekStart,
  team,
  filter,
}: {
  orgId: string
  weekStart: string
  team?: string
  filter?: string
}) {
  const supabase = await createClient()

  let submissionsQuery = supabase
    .from('submissions')
    .select(`id, week_start, sent_at, replied_at, email_status, hidden_at, employee:employees!inner(id, name, email, team), response:responses(id, body_clean, hidden_at, created_at, manager_replies(id, body_clean, sender_type, employee_name, created_at))`)
    .eq('week_start', weekStart)
    .eq('employees.org_id', orgId)
    .is('hidden_at', null)
    .order('replied_at', { ascending: false, nullsFirst: false })

  if (team) submissionsQuery = submissionsQuery.eq('employees.team', team)

  // Run all three queries in parallel — no sequential dependencies
  const [{ data: submissions }, { data: insight }, { data: teamRows }] = await Promise.all([
    submissionsQuery,
    supabase
      .from('insights')
      .select('id, org_id, week_start, summary, highlights, cross_functional_themes, risk_items, bottom_line, initiative_tracking, sentiment_score, sentiment_label, themes, generated_at')
      .eq('org_id', orgId)
      .eq('week_start', weekStart)
      .maybeSingle(),
    // Lightweight query: only the team column from active employees
    supabase
      .from('employees')
      .select('team')
      .eq('org_id', orgId)
      .eq('active', true)
      .not('team', 'is', null),
  ])

  const uniqueTeams = [
    ...new Set(teamRows?.map((t: { team: string | null }) => t.team).filter(Boolean)),
  ] as string[]

  // Treat hidden responses as if they don't exist — card shows "no reply yet"
  const typed = ((submissions ?? []) as unknown as SubmissionWithDetails[]).map((s) => {
    if (s.response && (s.response as any).hidden_at) {
      return { ...s, response: null }
    }
    return s
  })
  const replied = typed.filter((s: SubmissionWithDetails) => s.response !== null)
  const pending = typed.filter((s: SubmissionWithDetails) => s.response === null)

  // Apply status filter from stat card clicks
  const visible = filter === 'replied' ? replied
    : filter === 'pending' ? pending
    : typed // 'sent' or no filter = show all

  return (
    <>
      <StatsBar total={typed.length} replied={replied.length} weekStart={weekStart} activeFilter={filter} team={team} />

      {/* AI Briefing: show full briefing, generate button, or placeholder */}
      <div className="mt-5">
        {insight && replied.length > 0 ? (
          <AISummary insight={insight as Insight} />
        ) : replied.length >= Math.ceil(typed.length / 2) && typed.length > 0 ? (
          <GenerateSummaryBtn weekStart={weekStart} />
        ) : typed.length > 0 ? (
          <BriefingPlaceholder replied={replied.length} total={typed.length} />
        ) : null}
      </div>

      {/* Team filter chips */}
      <div className="flex items-center gap-2 mt-6 mb-4 flex-wrap">
        <Link
          href={`/dashboard?week=${weekStart}`}
          prefetch={true}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            !team
              ? 'bg-accent/10 border-accent/30 text-accent'
              : 'border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20'
          }`}
        >
          All teams
        </Link>
        {uniqueTeams.map((t: string) => (
          <Link
            key={t}
            href={`/dashboard?week=${weekStart}&team=${t}`}
            prefetch={true}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              team === t
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20'
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {/* Replies / Empty state */}
      {typed.length === 0 && !filter ? (
        <div className="mt-4 bg-surface border border-white/[0.07] rounded-xl p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-center mb-4 text-2xl">📬</div>
          <h3 className="text-[15px] font-semibold mb-1">No responses yet</h3>
          <p className="text-sm text-[#a1a1aa] mb-6 max-w-xs">Responses will appear here after you send your first campaign. Get set up in two steps:</p>
          <div className="w-full max-w-sm flex flex-col gap-2 text-left">
            <Link href="/team" className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.07] rounded-lg hover:bg-white/[0.06] transition-colors group">
              <span className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">1</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Add your team members</p>
                <p className="text-xs text-[#a1a1aa]">Import or add the people who'll receive check-ins</p>
              </div>
              <span className="text-[#52525b] group-hover:text-white transition-colors">→</span>
            </Link>
            <Link href="/campaigns" className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.07] rounded-lg hover:bg-white/[0.06] transition-colors group">
              <span className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">2</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Set up an email</p>
                <p className="text-xs text-[#a1a1aa]">Configure your weekly email and schedule it</p>
              </div>
              <span className="text-[#52525b] group-hover:text-white transition-colors">→</span>
            </Link>
          </div>
        </div>
      ) : (
        <ReplyList replied={replied} pending={pending} filter={filter} />
      )}
    </>
  )
}

// ── Skeleton shown while DashboardContent streams in ─────────────────────────
function DashboardContentSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5">
            <div className="h-3 w-12 bg-white/[0.06] rounded mb-2" />
            <div className="h-7 w-10 bg-white/[0.08] rounded" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-6 mb-4">
        <div className="h-7 w-20 bg-white/[0.04] border border-white/[0.06] rounded-full" />
        <div className="h-7 w-24 bg-white/[0.04] border border-white/[0.06] rounded-full" />
      </div>
      <div className="flex flex-col gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-surface border border-white/[0.07] rounded-xl px-5 py-4 flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-white/[0.06] shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col gap-2 pt-0.5">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-28 bg-white/[0.08] rounded" />
                <div className="h-3 w-14 bg-white/[0.04] rounded-full" />
              </div>
              <div className="h-3 w-full bg-white/[0.04] rounded" />
              <div className="h-3 w-3/4 bg-white/[0.04] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page shell — renders immediately, zero DB calls ───────────────────────────
export default async function DashboardPage({ searchParams }: Props) {
  const [{ week, team, filter }, user, profile] = await Promise.all([
    searchParams,
    getAuthUser(),
    getProfile(),
  ])

  if (!user) redirect('/auth/login')
  if (!profile?.org_id) redirect('/onboarding')

  const weekStart = week ?? format(getWeekStart(), 'yyyy-MM-dd')

  return (
    <div>
      {/* Renders immediately — no DB calls needed for this section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex flex-col items-start gap-2">
          <h1 className="text-[22px] font-bold tracking-[-0.04em]">Weekly Digest</h1>
          <WeekNav weekStart={weekStart} />
        </div>
        <SearchBar />
      </div>

      {/* Streams in as DB queries resolve — skeleton shows immediately */}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardContent orgId={profile.org_id} weekStart={weekStart} team={team} filter={filter} />
      </Suspense>
    </div>
  )
}
