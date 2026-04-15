'use client'

import { useState } from 'react'
import Link from 'next/link'

type GlobalStats = {
  totalOrgs: number
  totalEmployees: number
  totalCampaigns: number
  totalSubmissions: number
  totalReplies: number
  totalInsights: number
  totalWaitlist: number
  overallReplyRate: number
}

type OrgDetail = {
  id: string
  name: string
  slug: string
  plan: string | null
  plan_status: string | null
  onboarding_complete: boolean | null
  created_at: string
  trial_ends_at: string | null
  employeeCount: number
  campaignCount: number
  submissionCount: number
  replyCount: number
  insightCount: number
  replyRate: number
  profiles: { email: string; role: string; created_at: string }[]
  funnelStage: string
  lastActivity: string
}

type WaitlistEntry = {
  id: string
  email: string
  created_at: string
}

export function AdminDashboardClient({
  globalStats,
  orgs,
  waitlist,
}: {
  globalStats: GlobalStats
  orgs: OrgDetail[]
  waitlist: WaitlistEntry[]
}) {
  const [tab, setTab] = useState<'orgs' | 'waitlist' | 'funnel'>('orgs')
  const [search, setSearch] = useState('')

  const filteredOrgs = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.profiles.some((p) => p.email.toLowerCase().includes(search.toLowerCase())),
  )

  // Funnel data
  const funnelStages = [
    { label: 'Signed up', count: orgs.length, color: '#52525b' },
    { label: 'Team added', count: orgs.filter((o) => o.employeeCount > 0).length, color: '#71717a' },
    { label: 'Campaign created', count: orgs.filter((o) => o.campaignCount > 0).length, color: '#a78bfa' },
    { label: 'Emails sent', count: orgs.filter((o) => o.submissionCount > 0).length, color: '#f59e0b' },
    { label: 'Replies received', count: orgs.filter((o) => o.replyCount > 0).length, color: '#22c55e' },
    { label: 'Briefing generated', count: orgs.filter((o) => o.insightCount > 0).length, color: '#22c55e' },
  ]

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
        <p className="text-sm text-[#71717a]">Internal metrics and user management</p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 mb-8">
        {[
          { label: 'Orgs', value: globalStats.totalOrgs },
          { label: 'Employees', value: globalStats.totalEmployees },
          { label: 'Campaigns', value: globalStats.totalCampaigns },
          { label: 'Sent', value: globalStats.totalSubmissions },
          { label: 'Replies', value: globalStats.totalReplies },
          { label: 'Reply rate', value: `${globalStats.overallReplyRate}%` },
          { label: 'Briefings', value: globalStats.totalInsights },
          { label: 'Waitlist', value: globalStats.totalWaitlist },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[#18181b] border border-white/[0.07] rounded-lg p-3 text-center"
          >
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-[#71717a] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-white/[0.07] pb-px">
        {(['orgs', 'funnel', 'waitlist'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              tab === t
                ? 'text-white bg-white/[0.05] border-b-2 border-accent'
                : 'text-[#71717a] hover:text-white'
            }`}
          >
            {t === 'orgs' ? `Organizations (${orgs.length})` : t === 'waitlist' ? `Waitlist (${waitlist.length})` : 'Funnel'}
          </button>
        ))}
      </div>

      {/* ─── Orgs tab ─── */}
      {tab === 'orgs' && (
        <div>
          <input
            type="text"
            placeholder="Search orgs or emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm mb-4 px-3 py-2 bg-[#18181b] border border-white/[0.07] rounded-lg text-sm text-white placeholder:text-[#52525b] focus:outline-none focus:border-accent/50"
          />

          <div className="space-y-2">
            {filteredOrgs.map((org) => (
              <Link
                key={org.id}
                href={`/admin/org/${org.id}`}
                className="block bg-[#18181b] border border-white/[0.07] rounded-lg p-4 hover:border-white/[0.15] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-white truncate">{org.name}</h3>
                      <PlanBadge plan={org.plan} status={org.plan_status} />
                      <FunnelBadge stage={org.funnelStage} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#71717a]">
                      {org.profiles.slice(0, 2).map((p) => (
                        <span key={p.email}>{p.email}</span>
                      ))}
                      {org.profiles.length > 2 && <span>+{org.profiles.length - 2} more</span>}
                    </div>
                  </div>
                  <div className="flex gap-4 text-center shrink-0">
                    <MiniStat label="Team" value={org.employeeCount} />
                    <MiniStat label="Sent" value={org.submissionCount} />
                    <MiniStat label="Replied" value={org.replyCount} />
                    <MiniStat label="Rate" value={`${org.replyRate}%`} highlight={org.replyRate >= 70} />
                    <MiniStat label="Briefings" value={org.insightCount} />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-[#52525b]">
                  <span>Created {timeAgo(org.created_at)}</span>
                  <span>Last activity {timeAgo(org.lastActivity)}</span>
                  {org.trial_ends_at && (
                    <span>
                      Trial {new Date(org.trial_ends_at) > new Date() ? 'ends' : 'ended'}{' '}
                      {timeAgo(org.trial_ends_at)}
                    </span>
                  )}
                </div>
              </Link>
            ))}

            {filteredOrgs.length === 0 && (
              <p className="text-sm text-[#52525b] text-center py-8">No orgs found</p>
            )}
          </div>
        </div>
      )}

      {/* ─── Funnel tab ─── */}
      {tab === 'funnel' && (
        <div className="space-y-3">
          {funnelStages.map((stage, i) => {
            const pct = orgs.length > 0 ? Math.round((stage.count / orgs.length) * 100) : 0
            const convRate =
              i > 0 && funnelStages[i - 1].count > 0
                ? Math.round((stage.count / funnelStages[i - 1].count) * 100)
                : 100

            return (
              <div key={stage.label} className="bg-[#18181b] border border-white/[0.07] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">{stage.label}</span>
                    <span className="text-lg font-bold text-white">{stage.count}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-[#71717a]">{pct}% of total</span>
                    {i > 0 && (
                      <span className={convRate >= 70 ? 'text-green-400' : convRate >= 40 ? 'text-amber-400' : 'text-red-400'}>
                        {convRate}% from prev
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-[#27272a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: stage.color }}
                  />
                </div>
              </div>
            )
          })}

          {/* Orgs stuck at each stage */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-white mb-3">Where orgs are stuck</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {funnelStages.map((stage) => {
                const stuckOrgs = orgs.filter((o) => o.funnelStage === stage.label)
                if (stuckOrgs.length === 0) return null
                return (
                  <div key={stage.label} className="bg-[#18181b] border border-white/[0.07] rounded-lg p-3">
                    <p className="text-xs font-medium text-[#71717a] mb-2">{stage.label} ({stuckOrgs.length})</p>
                    {stuckOrgs.slice(0, 5).map((o) => (
                      <Link
                        key={o.id}
                        href={`/admin/org/${o.id}`}
                        className="block text-xs text-white hover:text-accent transition-colors py-0.5 truncate"
                      >
                        {o.name}
                      </Link>
                    ))}
                    {stuckOrgs.length > 5 && (
                      <p className="text-[10px] text-[#52525b] mt-1">+{stuckOrgs.length - 5} more</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── Waitlist tab ─── */}
      {tab === 'waitlist' && (
        <div className="space-y-1">
          {waitlist.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between bg-[#18181b] border border-white/[0.07] rounded-lg px-4 py-3"
            >
              <span className="text-sm text-white">{w.email}</span>
              <span className="text-xs text-[#52525b]">{timeAgo(w.created_at)}</span>
            </div>
          ))}
          {waitlist.length === 0 && (
            <p className="text-sm text-[#52525b] text-center py-8">No waitlist entries yet</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helper components ──────────────────────────────────────────────────────

function MiniStat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div>
      <p className={`text-sm font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</p>
      <p className="text-[9px] text-[#52525b]">{label}</p>
    </div>
  )
}

function PlanBadge({ plan, status }: { plan: string | null; status: string | null }) {
  const colors: Record<string, string> = {
    trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    starter: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    core: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    growth: 'bg-green-500/10 text-green-400 border-green-500/20',
    enterprise: 'bg-white/10 text-white border-white/20',
  }
  const c = colors[plan ?? 'trial'] ?? colors.trial
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${c}`}>
      {plan ?? 'trial'}{status === 'past_due' ? ' ⚠️' : ''}
    </span>
  )
}

function FunnelBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    'Signed up': 'text-[#52525b]',
    'Onboarding done': 'text-[#71717a]',
    'Team added': 'text-blue-400',
    'Campaign created': 'text-purple-400',
    'Emails sent': 'text-amber-400',
    'Replies received': 'text-green-400',
    'Briefing generated': 'text-green-400',
  }
  return (
    <span className={`text-[10px] font-medium ${colors[stage] ?? 'text-[#52525b]'}`}>
      {stage}
    </span>
  )
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
