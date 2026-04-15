import { createServiceClient } from '@/lib/supabase/server'
import { AdminDashboardClient } from './admin-dashboard-client'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const sb = createServiceClient()

  // ─── Global counts (all in parallel) ──────────────────────────────────────
  const [
    { count: totalOrgs },
    { count: totalEmployees },
    { count: totalCampaigns },
    { count: totalSubmissions },
    { count: totalReplies },
    { count: totalInsights },
    { count: totalWaitlist },
    { data: orgs },
    { data: waitlistEntries },
  ] = await Promise.all([
    sb.from('organizations').select('*', { count: 'exact', head: true }),
    sb.from('employees').select('*', { count: 'exact', head: true }).eq('active', true),
    sb.from('campaigns').select('*', { count: 'exact', head: true }).eq('active', true),
    sb.from('submissions').select('*', { count: 'exact', head: true }),
    sb.from('submissions').select('*', { count: 'exact', head: true }).not('replied_at', 'is', null),
    sb.from('insights').select('*', { count: 'exact', head: true }),
    sb.from('waitlist').select('*', { count: 'exact', head: true }),
    sb.from('organizations')
      .select('id, name, slug, plan, plan_status, onboarding_complete, created_at, trial_ends_at')
      .order('created_at', { ascending: false }),
    sb.from('waitlist')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  // ─── Per-org detail: employees, campaigns, submissions, replies, insights, profiles
  // Fetch all needed data in bulk, then group by org_id in memory
  const [
    { data: allEmployees },
    { data: allCampaigns },
    { data: allProfiles },
    { data: allInsightsRaw },
  ] = await Promise.all([
    sb.from('employees').select('id, org_id').eq('active', true),
    sb.from('campaigns').select('id, org_id').eq('active', true),
    sb.from('profiles').select('id, org_id, email, role, created_at'),
    sb.from('insights').select('id, org_id'),
  ])

  // Get campaign IDs per org
  const campaignsByOrg = new Map<string, string[]>()
  for (const c of allCampaigns ?? []) {
    const arr = campaignsByOrg.get(c.org_id) ?? []
    arr.push(c.id)
    campaignsByOrg.set(c.org_id, arr)
  }

  // Fetch all submissions with campaign_id to map back to orgs
  const { data: allSubmissions } = await sb
    .from('submissions')
    .select('id, campaign_id, sent_at, replied_at')

  // Group submissions by org
  const campaignToOrg = new Map<string, string>()
  for (const c of allCampaigns ?? []) {
    campaignToOrg.set(c.id, c.org_id)
  }

  const subsByOrg = new Map<string, { total: number; replied: number; lastSent: string | null }>()
  for (const s of allSubmissions ?? []) {
    const orgId = campaignToOrg.get(s.campaign_id)
    if (!orgId) continue
    const entry = subsByOrg.get(orgId) ?? { total: 0, replied: 0, lastSent: null }
    entry.total++
    if (s.replied_at) entry.replied++
    if (!entry.lastSent || s.sent_at > entry.lastSent) entry.lastSent = s.sent_at
    subsByOrg.set(orgId, entry)
  }

  // Group employees, insights, profiles by org
  const empsByOrg = new Map<string, number>()
  for (const e of allEmployees ?? []) {
    empsByOrg.set(e.org_id, (empsByOrg.get(e.org_id) ?? 0) + 1)
  }

  const insightsByOrg = new Map<string, number>()
  for (const i of allInsightsRaw ?? []) {
    insightsByOrg.set(i.org_id, (insightsByOrg.get(i.org_id) ?? 0) + 1)
  }

  const profilesByOrg = new Map<string, { email: string; role: string; created_at: string }[]>()
  for (const p of allProfiles ?? []) {
    const arr = profilesByOrg.get(p.org_id) ?? []
    arr.push({ email: p.email, role: p.role, created_at: p.created_at })
    profilesByOrg.set(p.org_id, arr)
  }

  // ─── Build org details ────────────────────────────────────────────────────
  const orgDetails = (orgs ?? []).map((org) => {
    const subs = subsByOrg.get(org.id)
    const empCount = empsByOrg.get(org.id) ?? 0
    const campCount = (campaignsByOrg.get(org.id) ?? []).length
    const insightCount = insightsByOrg.get(org.id) ?? 0
    const profiles = profilesByOrg.get(org.id) ?? []
    const subTotal = subs?.total ?? 0
    const subReplied = subs?.replied ?? 0

    // Funnel stages
    const hasSignup = true
    const hasOrg = true
    const hasEmployees = empCount > 0
    const hasCampaign = campCount > 0
    const hasSent = subTotal > 0
    const hasReply = subReplied > 0
    const hasBriefing = insightCount > 0

    let funnelStage = 'Signed up'
    if (hasBriefing) funnelStage = 'Briefing generated'
    else if (hasReply) funnelStage = 'Replies received'
    else if (hasSent) funnelStage = 'Emails sent'
    else if (hasCampaign) funnelStage = 'Campaign created'
    else if (hasEmployees) funnelStage = 'Team added'
    else if (org.onboarding_complete) funnelStage = 'Onboarding done'

    return {
      ...org,
      employeeCount: empCount,
      campaignCount: campCount,
      submissionCount: subTotal,
      replyCount: subReplied,
      insightCount,
      replyRate: subTotal > 0 ? Math.round((subReplied / subTotal) * 100) : 0,
      profiles,
      funnelStage,
      lastActivity: subs?.lastSent ?? org.created_at,
    }
  })

  const globalStats = {
    totalOrgs: totalOrgs ?? 0,
    totalEmployees: totalEmployees ?? 0,
    totalCampaigns: totalCampaigns ?? 0,
    totalSubmissions: totalSubmissions ?? 0,
    totalReplies: totalReplies ?? 0,
    totalInsights: totalInsights ?? 0,
    totalWaitlist: totalWaitlist ?? 0,
    overallReplyRate: totalSubmissions && totalSubmissions > 0
      ? Math.round(((totalReplies ?? 0) / totalSubmissions) * 100)
      : 0,
  }

  return (
    <AdminDashboardClient
      globalStats={globalStats}
      orgs={orgDetails}
      waitlist={waitlistEntries ?? []}
    />
  )
}
