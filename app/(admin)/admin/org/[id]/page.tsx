import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OrgDetailClient } from './org-detail-client'

export const dynamic = 'force-dynamic'

export default async function AdminOrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = createServiceClient()

  // Fetch org
  const { data: org, error } = await sb
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()

  if (!org || error) notFound()

  // Fetch everything in parallel
  const [
    { data: employees },
    { data: campaigns },
    { data: profiles },
    { data: insights },
    { data: slackIntegration },
    { data: auditLogs },
  ] = await Promise.all([
    sb.from('employees').select('id, name, email, team, function, active, slack_user_id, created_at').eq('org_id', id).order('name'),
    sb.from('campaigns').select('id, name, subject, frequency, send_day, send_time, timezone, active, target_teams, created_at').eq('org_id', id).order('created_at', { ascending: false }),
    sb.from('profiles').select('id, name, email, role, created_at').eq('org_id', id),
    sb.from('insights').select('id, week_start, sentiment_score, sentiment_label, themes, bottom_line, generated_at').eq('org_id', id).order('week_start', { ascending: false }).limit(12),
    sb.from('slack_integrations').select('id, team_name, created_at').eq('org_id', id).maybeSingle(),
    sb.from('audit_logs').select('id, action, actor_id, target_type, target_id, metadata, created_at').eq('org_id', id).order('created_at', { ascending: false }).limit(30),
  ])

  // Fetch submissions for the org's campaigns
  const campaignIds = (campaigns ?? []).map((c) => c.id)
  let submissions: any[] = []
  if (campaignIds.length > 0) {
    const { data } = await sb
      .from('submissions')
      .select('id, campaign_id, employee_id, week_start, sent_at, replied_at, email_status')
      .in('campaign_id', campaignIds)
      .order('sent_at', { ascending: false })
      .limit(500)
    submissions = data ?? []
  }

  // Calculate per-week stats
  const weekMap = new Map<string, { sent: number; replied: number }>()
  for (const s of submissions) {
    const w = s.week_start
    const entry = weekMap.get(w) ?? { sent: 0, replied: 0 }
    entry.sent++
    if (s.replied_at) entry.replied++
    weekMap.set(w, entry)
  }
  const weeklyStats = Array.from(weekMap.entries())
    .map(([week, stats]) => ({ week, ...stats, rate: stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : 0 }))
    .sort((a, b) => b.week.localeCompare(a.week))
    .slice(0, 12)

  // Per-employee stats
  const empStats = new Map<string, { sent: number; replied: number }>()
  for (const s of submissions) {
    const entry = empStats.get(s.employee_id) ?? { sent: 0, replied: 0 }
    entry.sent++
    if (s.replied_at) entry.replied++
    empStats.set(s.employee_id, entry)
  }

  const employeesWithStats = (employees ?? []).map((emp) => {
    const stats = empStats.get(emp.id) ?? { sent: 0, replied: 0 }
    return {
      ...emp,
      sent: stats.sent,
      replied: stats.replied,
      replyRate: stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : 0,
    }
  })

  return (
    <OrgDetailClient
      org={org}
      employees={employeesWithStats}
      campaigns={campaigns ?? []}
      profiles={profiles ?? []}
      insights={insights ?? []}
      weeklyStats={weeklyStats}
      slackConnected={!!slackIntegration}
      slackTeamName={slackIntegration?.team_name ?? null}
      auditLogs={auditLogs ?? []}
      totalSubmissions={submissions.length}
      totalReplies={submissions.filter((s) => s.replied_at).length}
    />
  )
}
