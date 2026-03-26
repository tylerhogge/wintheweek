/**
 * POST /api/send-test
 *
 * Sends a test email for a given campaign to a specified address.
 * If the recipient is a registered employee, creates a real submission
 * so that a reply will be tracked on the dashboard.
 * Requires admin role.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend, buildCampaignEmail } from '@/lib/resend'
import { getWeekStart, createInitialThreadIndex } from '@/lib/utils'
import { format } from 'date-fns'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { checkRateLimit, rateLimitKeyFromUser } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  // Rate limit: 20 test sends per minute
  const rl = checkRateLimit(rateLimitKeyFromUser(ctx.userId, 'send-test'), { limit: 20, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const { campaign_id, to_email, to_name } = await req.json()
  if (!campaign_id || !to_email) {
    return NextResponse.json({ error: 'Missing campaign_id or to_email' }, { status: 400 })
  }

  const serviceSupabase = createServiceClient()

  // Verify the campaign belongs to the user's org
  const { data: campaign } = await serviceSupabase
    .from('campaigns')
    .select('*')
    .eq('id', campaign_id)
    .eq('org_id', ctx.orgId)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const replyTo = process.env.REPLY_TO_EMAIL ?? 'updates@wintheweek.co'
  const weekStart = format(getWeekStart(), 'yyyy-MM-dd')

  // If the recipient is a registered employee, create a real submission
  const { data: employee } = await serviceSupabase
    .from('employees')
    .select('id')
    .eq('email', to_email)
    .eq('org_id', ctx.orgId)
    .eq('active', true)
    .single()

  if (employee) {
    // Only create a submission if one doesn't already exist for this
    // employee + campaign + week (avoids duplicate dashboard cards from
    // repeated test sends).
    const { data: existing } = await serviceSupabase
      .from('submissions')
      .select('id')
      .eq('campaign_id', campaign_id)
      .eq('employee_id', employee.id)
      .eq('week_start', weekStart)
      .limit(1)
      .maybeSingle()

    if (!existing) {
      await serviceSupabase.from('submissions').insert({
        campaign_id,
        employee_id: employee.id,
        week_start: weekStart,
        sent_at: new Date().toISOString(),
      })
    } else {
      // Submission already exists (repeated test send for same week).
      // Reset it so the employee can reply again without "Already recorded".
      // 1. Delete old response(s) for this submission
      await serviceSupabase
        .from('responses')
        .delete()
        .eq('submission_id', existing.id)
      // 2. Clear replied_at so inbound route finds an unreplied submission
      await serviceSupabase
        .from('submissions')
        .update({ replied_at: null, sent_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
  }

  const { subject, html, text } = buildCampaignEmail({
    employeeName: to_name || 'there',
    subject: `[TEST] ${campaign.subject}`,
    body: campaign.body,
    replyToAddress: replyTo,
  })

  const { error } = await getResend().emails.send({
    from: `${process.env.FROM_NAME ?? 'Win the Week'} <${process.env.FROM_EMAIL ?? 'updates@wintheweek.co'}>`,
    to: to_email,
    replyTo,
    subject,
    html,
    text,
    headers: {
      'Thread-Index': createInitialThreadIndex(),
      'Thread-Topic': campaign.subject,
    },
  })

  if (error) {
    console.error('Test email failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  auditLog({
    action: 'campaign.send_test',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'campaign',
    targetId: campaign_id,
    metadata: { to_email },
  })

  return NextResponse.json({ ok: true, trackedReply: !!employee })
}
