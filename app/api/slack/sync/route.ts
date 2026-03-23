/**
 * POST /api/slack/sync
 * Matches all active employees in an org to their Slack user IDs by email.
 * Called automatically after OAuth, and available as a manual re-sync.
 *
 * Body: { org_id: string }
 * Auth: Bearer CRON_SECRET
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { lookupSlackUserByEmail } from '@/lib/slack'
import { verifyCronSecret } from '@/lib/auth'

export async function POST(req: Request) {
  const authErr = verifyCronSecret(req)
  if (authErr) return authErr

  const { org_id } = await req.json()
  if (!org_id) return NextResponse.json({ error: 'org_id required' }, { status: 400 })

  const supabase = createServiceClient()

  // Fetch the Slack integration for this org
  const { data: integration } = await supabase
    .from('slack_integrations')
    .select('access_token')
    .eq('org_id', org_id)
    .single()

  if (!integration?.access_token) {
    return NextResponse.json({ error: 'No Slack integration found for org' }, { status: 404 })
  }

  // Fetch all active employees
  const { data: employees } = await supabase
    .from('employees')
    .select('id, email, slack_user_id')
    .eq('org_id', org_id)
    .eq('active', true)

  if (!employees || employees.length === 0) {
    return NextResponse.json({ ok: true, matched: 0, unmatched: 0, total: 0 })
  }

  let matched = 0
  let unmatched = 0

  for (const employee of employees) {
    const slackUserId = await lookupSlackUserByEmail(
      integration.access_token,
      employee.email,
    )

    if (slackUserId && slackUserId !== employee.slack_user_id) {
      await supabase
        .from('employees')
        .update({ slack_user_id: slackUserId })
        .eq('id', employee.id)
      matched++
    } else if (slackUserId) {
      matched++ // already matched
    } else {
      unmatched++
    }
  }

  console.log(`[Slack Sync] org=${org_id} matched=${matched} unmatched=${unmatched}`)
  return NextResponse.json({ ok: true, matched, unmatched, total: employees.length })
}
