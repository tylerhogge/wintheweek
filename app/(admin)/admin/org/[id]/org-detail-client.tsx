'use client'

import { useState } from 'react'
import Link from 'next/link'

type Org = {
  id: string
  name: string
  slug: string
  plan: string | null
  plan_status: string | null
  onboarding_complete: boolean | null
  created_at: string
  trial_ends_at: string | null
  shame_enabled: boolean | null
  digest_notify: boolean | null
}

type Employee = {
  id: string
  name: string
  email: string
  team: string | null
  function: string | null
  active: boolean
  slack_user_id: string | null
  created_at: string
  sent: number
  replied: number
  replyRate: number
}

type Campaign = {
  id: string
  name: string
  subject: string
  frequency: string
  send_day: number
  send_time: string
  timezone: string
  active: boolean
  target_teams: string[] | null
  created_at: string
}

type Profile = {
  id: string
  name: string | null
  email: string
  role: string
  created_at: string
}

type Insight = {
  id: string
  week_start: string
  sentiment_score: number | null
  sentiment_label: string | null
  themes: string[] | null
  bottom_line: string | null
  generated_at: string | null
}

type WeeklyStat = {
  week: string
  sent: number
  replied: number
  rate: number
}

type AuditLog = {
  id: string
  action: string
  actor_id: string | null
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const DAY_LABELS: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }

export function OrgDetailClient({
  org,
  employees,
  campaigns,
  profiles,
  insights,
  weeklyStats,
  slackConnected,
  slackTeamName,
  auditLogs,
  totalSubmissions,
  totalReplies,
}: {
  org: Org
  employees: Employee[]
  campaigns: Campaign[]
  profiles: Profile[]
  insights: Insight[]
  weeklyStats: WeeklyStat[]
  slackConnected: boolean
  slackTeamName: string | null
  auditLogs: AuditLog[]
  totalSubmissions: number
  totalReplies: number
}) {
  const [tab, setTab] = useState<'overview' | 'team' | 'activity' | 'audit'>('overview')
  const replyRate = totalSubmissions > 0 ? Math.round((totalReplies / totalSubmissions) * 100) : 0
  const activeEmps = employees.filter((e) => e.active)
  const inactiveEmps = employees.filter((e) => !e.active)

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Back link */}
      <Link href="/admin" className="text-xs text-[#71717a] hover:text-white transition-colors mb-4 inline-block">
        ← All organizations
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{org.name}</h1>
          <div className="flex items-center gap-3 text-xs text-[#71717a]">
            <span>{org.slug}</span>
            <span className="px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-medium">
              {org.plan ?? 'trial'} — {org.plan_status ?? 'trialing'}
            </span>
            {slackConnected && (
              <span className="px-1.5 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] font-medium">
                Slack: {slackTeamName}
              </span>
            )}
            {org.onboarding_complete && (
              <span className="text-green-400 text-[10px]">✓ Onboarding complete</span>
            )}
          </div>
        </div>
        <div className="text-right text-[11px] text-[#52525b]">
          <p>Created {new Date(org.created_at).toLocaleDateString()}</p>
          {org.trial_ends_at && (
            <p>Trial {new Date(org.trial_ends_at) > new Date() ? 'ends' : 'ended'} {new Date(org.trial_ends_at).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Team size', value: activeEmps.length },
          { label: 'Admins', value: profiles.length },
          { label: 'Campaigns', value: campaigns.filter((c) => c.active).length },
          { label: 'Sent', value: totalSubmissions },
          { label: 'Replies', value: totalReplies },
          { label: 'Reply rate', value: `${replyRate}%` },
          { label: 'Briefings', value: insights.length },
        ].map((s) => (
          <div key={s.label} className="bg-[#18181b] border border-white/[0.07] rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-[#71717a] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/[0.07] pb-px">
        {(['overview', 'team', 'activity', 'audit'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors capitalize ${
              tab === t ? 'text-white bg-white/[0.05] border-b-2 border-accent' : 'text-[#71717a] hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ─── Overview ─── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Admin users */}
          <Section title="Admin Users">
            {profiles.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-white">{p.name ?? p.email}</span>
                  <span className="text-xs text-[#52525b] ml-2">{p.email}</span>
                </div>
                <span className="text-[10px] text-[#52525b]">{p.role} · Joined {new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </Section>

          {/* Campaigns */}
          <Section title="Campaigns">
            {campaigns.length === 0 ? (
              <p className="text-sm text-[#52525b] py-2">No campaigns created</p>
            ) : (
              campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm text-white">{c.name}</span>
                    <span className="text-xs text-[#52525b] ml-2">
                      {c.frequency} · {DAY_LABELS[c.send_day] ?? c.send_day} {c.send_time} {c.timezone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.target_teams && <span className="text-[10px] text-[#52525b]">Teams: {c.target_teams.join(', ')}</span>}
                    <span className={`text-[10px] font-medium ${c.active ? 'text-green-400' : 'text-[#52525b]'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </Section>

          {/* Weekly reply rates */}
          <Section title="Weekly Reply Rates (last 12 weeks)">
            {weeklyStats.length === 0 ? (
              <p className="text-sm text-[#52525b] py-2">No submissions yet</p>
            ) : (
              <div className="space-y-1.5">
                {weeklyStats.map((w) => (
                  <div key={w.week} className="flex items-center gap-3">
                    <span className="text-xs text-[#71717a] w-20 shrink-0">{w.week}</span>
                    <div className="flex-1 h-4 bg-[#27272a] rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${w.rate}%`,
                          backgroundColor: w.rate >= 70 ? '#22c55e' : w.rate >= 40 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                    <span className="text-xs text-white w-16 text-right">{w.replied}/{w.sent} ({w.rate}%)</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Recent briefings */}
          <Section title="Recent Briefings">
            {insights.length === 0 ? (
              <p className="text-sm text-[#52525b] py-2">No briefings generated</p>
            ) : (
              insights.slice(0, 6).map((ins) => (
                <div key={ins.id} className="py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-white font-medium">{ins.week_start}</span>
                    {ins.sentiment_label && (
                      <span className={`text-[10px] font-medium ${ins.sentiment_score && ins.sentiment_score >= 7 ? 'text-green-400' : ins.sentiment_score && ins.sentiment_score >= 4 ? 'text-amber-400' : 'text-red-400'}`}>
                        {ins.sentiment_label} ({ins.sentiment_score}/10)
                      </span>
                    )}
                  </div>
                  {ins.bottom_line && (
                    <p className="text-xs text-[#a1a1aa] line-clamp-2">{ins.bottom_line}</p>
                  )}
                  {ins.themes && (ins.themes as string[]).length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(ins.themes as string[]).slice(0, 5).map((t) => (
                        <span key={t} className="text-[9px] bg-white/[0.05] text-[#71717a] px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </Section>

          {/* Features enabled */}
          <Section title="Features">
            <div className="flex flex-wrap gap-2 py-2">
              <FeatureChip label="Digest email" on={org.digest_notify ?? false} />
              <FeatureChip label="Wall of Shame" on={org.shame_enabled ?? false} />
              <FeatureChip label="Slack" on={slackConnected} />
              <FeatureChip label="Onboarding complete" on={org.onboarding_complete ?? false} />
            </div>
          </Section>
        </div>
      )}

      {/* ─── Team ─── */}
      {tab === 'team' && (
        <div>
          <p className="text-xs text-[#52525b] mb-3">{activeEmps.length} active · {inactiveEmps.length} inactive</p>
          <div className="space-y-1">
            {employees
              .sort((a, b) => b.replyRate - a.replyRate)
              .map((emp) => (
                <div
                  key={emp.id}
                  className={`flex items-center justify-between bg-[#18181b] border border-white/[0.07] rounded-lg px-4 py-2.5 ${!emp.active ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div>
                      <span className="text-sm text-white">{emp.name}</span>
                      <span className="text-xs text-[#52525b] ml-2">{emp.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {emp.team && <span className="text-[10px] text-[#52525b]">{emp.team}</span>}
                    {emp.function && <span className="text-[10px] text-[#52525b]">{emp.function}</span>}
                    {emp.slack_user_id && <span className="text-[10px] text-purple-400">Slack</span>}
                    <span className="text-xs text-[#71717a] w-20 text-right">{emp.replied}/{emp.sent}</span>
                    <span
                      className={`text-xs font-bold w-10 text-right ${
                        emp.replyRate >= 70 ? 'text-green-400' : emp.replyRate >= 40 ? 'text-amber-400' : 'text-red-400'
                      }`}
                    >
                      {emp.replyRate}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ─── Activity (weekly chart) ─── */}
      {tab === 'activity' && (
        <div className="space-y-6">
          <Section title="Weekly Activity">
            {weeklyStats.length === 0 ? (
              <p className="text-sm text-[#52525b] py-2">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {weeklyStats.map((w) => (
                  <div key={w.week} className="bg-[#18181b] border border-white/[0.07] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">Week of {w.week}</span>
                      <div className="flex gap-4 text-xs">
                        <span className="text-[#71717a]">{w.sent} sent</span>
                        <span className="text-green-400">{w.replied} replied</span>
                        <span className={`font-bold ${w.rate >= 70 ? 'text-green-400' : w.rate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                          {w.rate}%
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-[#27272a] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${w.rate}%`,
                          backgroundColor: w.rate >= 70 ? '#22c55e' : w.rate >= 40 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ─── Audit log ─── */}
      {tab === 'audit' && (
        <div className="space-y-1">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-[#52525b] text-center py-8">No audit logs</p>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between bg-[#18181b] border border-white/[0.07] rounded-lg px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-accent">{log.action}</span>
                  {log.target_type && (
                    <span className="text-[10px] text-[#52525b]">→ {log.target_type}</span>
                  )}
                </div>
                <span className="text-[10px] text-[#52525b]">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#18181b] border border-white/[0.07] rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      <div className="divide-y divide-white/[0.05]">{children}</div>
    </div>
  )
}

function FeatureChip({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      className={`text-[11px] font-medium px-2 py-1 rounded-md border ${
        on ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/[0.03] text-[#52525b] border-white/[0.07]'
      }`}
    >
      {on ? '✓' : '✗'} {label}
    </span>
  )
}
