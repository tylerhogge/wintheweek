/**
 * GET /api/admin/export
 *
 * GDPR-compliant data export. Returns all organization data as JSON.
 * Requires admin role.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { checkRateLimit, rateLimitKeyFromUser } from '@/lib/rate-limit'

export async function GET() {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error

  const { ctx } = auth

  // Rate limit: 5 exports per hour per user
  const rl = checkRateLimit(rateLimitKeyFromUser(ctx.userId, 'export'), { limit: 5, windowSeconds: 3600 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 })
  }

  const supabase = createServiceClient()
  const orgId = ctx.orgId

  // Fetch all org data in parallel
  const [org, employees, campaigns, submissions, insights] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('employees').select('id, name, email, team, function, active, created_at').eq('org_id', orgId),
    supabase.from('campaigns').select('id, name, subject, body, frequency, send_day, send_time, timezone, active, target_teams, created_at').eq('org_id', orgId),
    supabase
      .from('submissions')
      .select('id, campaign_id, employee_id, week_start, sent_at, replied_at, responses(id, body_clean, created_at, manager_replies(id, body_clean, sender_type, created_at))')
      .in('campaign_id', (await supabase.from('campaigns').select('id').eq('org_id', orgId)).data?.map((c: any) => c.id) ?? []),
    supabase.from('insights').select('*').eq('org_id', orgId),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    organization: org.data,
    employees: employees.data ?? [],
    campaigns: campaigns.data ?? [],
    submissions: submissions.data ?? [],
    insights: insights.data ?? [],
  }

  // Audit the export
  auditLog({
    action: 'data.export',
    actorId: ctx.userId,
    orgId,
    metadata: { employee_count: employees.data?.length ?? 0 },
  })

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="wintheweek-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
