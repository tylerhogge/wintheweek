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
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist'
import type { SubmissionWithDetails, Insight } from '@/types'

// Force dynamic rendering — skips static analysis overhead on every request
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ week?: string; team?: string; filter?: string }>
}

// ── Streaming data component ──────────────────────────────────────────────────
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
    .select(`id, week_start, sent_at, replied_at, nudged_at, email_status, hidden_at, employee:employees!inner(id, name, email, team), response:responses(id, body_clean, hidden_at, created_at, manager_replies(id, body_clean, sender_type, employee_name, created_at))`)
    .eq('week_start', weekStart)
    .eq('employees.org_id', orgId)
    .is('hidden_at', null)
    .order('replied_at', { ascending: false, nullsFirst: false })

  if (team) submissionsQuery = submissionsQuery.eq('employees.team', team)

  // Three core queries — the minimum needed for every dashboard render.
  // Onboarding checklist uses a single org column instead of 5 count queries.
  const [{ data: submissions }, { data: insight }, { data: orgRow }] = await Promise.all([
    submissionsQuery,
    supabase
      .from('insights')
      .select('id, org_id, week_start, summary, highlights, cross_functional_themes, risk_items, bottom_line, initiative_tracking, sentiment_score, sentiment_label, themes, generated_at')
      .eq('org_id', orgId)
      .eq('week_start', weekStart)
      .maybeSingle(),
    supabase
      .from('organizations')
      .select('shame_enabled, auto_nudge, onboarding_complete')
      .eq('id', orgId)
      .single(),
  ])

  // Extract unique teams from submissions already fetched (no extra query)
  const teamSet = new Set<string>()
  for (const s of (submissions ?? []) as any[]) {
    const t = s.employee?.team
    if (t) teamSet.add(t)
  }

  // If we don't have submissions for this week, also check for teams from employees
  // (only when needed — when there are no submissions to derive teams from)
  let uniqueTeams = [...teamSet].sort()
  if (uniqueTeams.length === 0) {
    const { data: teamRows } = await supabase
      .from('employees')
      .select('team')
      .eq('org_id', orgId)
      .eq('active', true)
      .not('team', 'is', null)
    uniqueTeams = [...new Set(teamRows?.map((t: { team: string | null }) => t.team).filter(Boolean))] as string[]
  }

  const onboardingComplete = (orgRow as any)?.onboarding_complete ?? false

  // Only run onboarding queries if not yet complete
  let hasTeam = true, hasCampaign = true, hasSentFirst = true, hasSlack = true, hasShame = true
  let allComplete = onboardingComplete

  if (!onboardingComplete) {
    const [{ count: employeeCount }, { count: campaignCount }, { count: sentCount }, { data: slackRow }] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('active', true),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('active', true),
      supabase.from('submissions').select('id, employees!inner(org_id)', { count: 'exact', head: true }).eq('employees.org_id', orgId).not('sent_at', 'is', null),
      supabase.from('slack_integrations').select('id').eq('org_id', orgId).maybeSingle(),
    ])

    hasTeam = (employeeCount ?? 0) > 0
    hasCampaign = (campaignCount ?? 0) > 0
    hasSentFirst = (sentCount ?? 0) > 0
    hasSlack = !!slackRow
    hasShame = !!(orgRow?.shame_enabled || orgRow?.auto_nudge)
    allComplete = hasTeam && hasCampaign && hasSentFirst && hasSlack && hasShame

    // Persist completion so future loads skip these queries entirely
    if (allComplete) {
      supabase.from('organizations').update({ onboarding_complete: true }).eq('id', orgId).then(() => {})
    }
  }

  // Treat hidden responses as if they don't exist — card shows "no reply yet"
  const typed = ((submissions ?? []) as unknown as SubmissionWithDetails[]).map((s) => {
    if (s.response && (s.response as any).hidden_at) {
      return { ...s, response: null }
    }
    return s
  })
  const actuallySent = typed.filter((s: SubmissionWithDetails) => !!(s as any).sent_at)
  const unsent = typed.filter((s: SubmissionWithDetails) => !(s as any).sent_at)
  const replied = typed.filter((s: SubmissionWithDetails) => s.response !== null)
  const pending = actuallySent.filter((s: SubmissionWithDetails) => s.response === null)

  // Apply status filter from stat card clicks
  const visible = filter === 'replied' ? replied
    : filter === 'pending' ? pending
    : filter === 'sent' ? actuallySent
    : typed // no filter = show all

  return (
    <div>
      {/* Onboarding checklist — shown until all setup steps are complete */}
      {!allComplete && (
        <div className="mb-5">
          <OnboardingChecklist
            hasTeam={hasTeam}
            hasCampaign={hasCampaign}
            hasSentFirst={hasSentFirst}
            hasSlack={hasSlack}
            hasShame={hasShame}
          />
        </div>
      )}

      <StatsBar total={actuallySent.length} replied={replied.length} weekStart={weekStart} activeFilter={filter} team={team} />

      {/* Email delivery breakdown — only show when there's data */}
      {actuallySent.length > 0 && (() => {
        const delivered = actuallySent.filter((s: any) => s.email_status === 'delivered' || s.email_status === 'opened').length
        const opened = actuallySent.filter((s: any) => s.email_status === 'opened').length
        const bounced = actuallySent.filter((s: any) => s.email_status === 'bounced' || s.email_status === 'complained').length
        if (delivered === 0 && opened === 0 && bounced === 0) return null
        return (
          <div className="flex items-center gap-4 mt-2 px-1">
            {delivered > 0 && (
              <span className="text-[11px] text-[#71717a]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent mr-1 align-middle" />
                {delivered} delivered
              </span>
            )}
            {opened > 0 && (
              <span className="text-[11px] text-[#71717a]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-1 align-middle" />
                {opened} opened
              </span>
            )}
            {bounced > 0 && (
              <span className="text-[11px] text-red-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1 align-middle" />
                {bounced} bounced
              </span>
            )}
          </div>
        )
      })()}

      {/* AI Briefing: show full briefing, generate button, or placeholder */}
      <div className="mt-5">
        {insight && replied.length > 0 ? (
          <AISummary insight={insight as Insight} weekStart={weekStart} />
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

      {/* Replies */}
      <ReplyList replied={replied} pending={pending} unsent={unsent} filter={filter} />
    </div>
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
