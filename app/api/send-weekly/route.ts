/**
 * POST /api/send-weekly
 *
 * Called by Vercel Cron (see vercel.json) every Friday at 9am UTC.
 * Sends campaign emails to all active employees, creates submission records,
 * and sets the unique reply-to address for inbound tracking.
 *
 * Also callable manually for testing — just POST with the cron secret.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend, buildCampaignEmail } from '@/lib/resend'
import { sendSlackDM, buildCheckinBlocks } from '@/lib/slack'
import { getWeekStart } from '@/lib/utils'
import { format } from 'date-fns'

export async function POST(req: Request) {
  // Authenticate the cron call
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const weekStart = format(getWeekStart(), 'yyyy-MM-dd')
  const today = new Date().getDay() // 0 = Sunday, 5 = Friday

  // Find all active campaigns due to send today
  const { data: campaigns, error: campaignErr } = await supabase
    .from('campaigns')
    .select('*, organizations(name)')
    .eq('active', true)
    .eq('send_day', today === 0 ? 7 : today) // normalise Sunday

  if (campaignErr) {
    console.error('Failed to fetch campaigns', campaignErr)
    return NextResponse.json({ error: campaignErr.message }, { status: 500 })
  }

  const results = { sent: 0, failed: 0, skipped: 0 }

  for (const campaign of campaigns ?? []) {
    // Fetch active employees — filtered by target_teams if set, otherwise all
    const employeeQuery = supabase
      .from('employees')
      .select('*')
      .eq('org_id', campaign.org_id)
      .eq('active', true)

    if (campaign.target_teams && campaign.target_teams.length > 0) {
      employeeQuery.in('team', campaign.target_teams)
    }

    const { data: employees } = await employeeQuery

    for (const employee of employees ?? []) {
      // Check if already sent this week (idempotency)
      const { data: existing } = await supabase
        .from('submissions')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('employee_id', employee.id)
        .eq('week_start', weekStart)
        .single()

      if (existing) {
        results.skipped++
        continue
      }

      // Create the submission record
      const { data: submission, error: subErr } = await supabase
        .from('submissions')
        .insert({
          campaign_id: campaign.id,
          employee_id: employee.id,
          week_start: weekStart,
        })
        .select('id')
        .single()

      if (subErr || !submission) {
        console.error('Failed to create submission', subErr)
        results.failed++
        continue
      }

      let sendError: string | null = null

      if (employee.slack_user_id) {
        // ── Slack delivery ──────────────────────────────────────────────────
        const { data: integration } = await supabase
          .from('slack_integrations')
          .select('access_token')
          .eq('org_id', campaign.org_id)
          .single()

        if (integration?.access_token) {
          const { blocks, fallbackText } = buildCheckinBlocks(employee.name, campaign.body)
          const slackResult = await sendSlackDM(integration.access_token, employee.slack_user_id, blocks, fallbackText)
          if (!slackResult.ok) {
            console.error(`[send-weekly] Slack DM failed for ${employee.email}:`, slackResult.error)
            sendError = slackResult.error
          }
        } else {
          sendError = 'No Slack token found — falling back to email'
        }

        // Fallback to email if Slack failed
        if (sendError) {
          sendError = null
          const replyTo = process.env.REPLY_TO_EMAIL ?? 'updates@wintheweek.co'
          const { subject, html, text } = buildCampaignEmail({ employeeName: employee.name, subject: campaign.subject, body: campaign.body, replyToAddress: replyTo })
          const { error: emailErr } = await getResend().emails.send({
            from: `${process.env.FROM_NAME ?? 'Win the Week'} <${process.env.FROM_EMAIL ?? 'updates@wintheweek.co'}>`,
            to: employee.email,
            replyTo,
            subject,
            html,
            text,
            headers: { 'Message-ID': `<checkin-${submission.id}@wintheweek.co>` },
          })
          if (emailErr) sendError = emailErr.message
        }
      } else {
        // ── Email delivery (default) ────────────────────────────────────────
        const replyTo = process.env.REPLY_TO_EMAIL ?? 'updates@wintheweek.co'
        const { subject, html, text } = buildCampaignEmail({ employeeName: employee.name, subject: campaign.subject, body: campaign.body, replyToAddress: replyTo })
        const { error: emailErr } = await getResend().emails.send({
          from: `${process.env.FROM_NAME ?? 'Win the Week'} <${process.env.FROM_EMAIL ?? 'updates@wintheweek.co'}>`,
          to: employee.email,
          replyTo,
          subject,
          html,
          text,
          headers: { 'Message-ID': `<checkin-${submission.id}@wintheweek.co>` },
        })
        if (emailErr) sendError = emailErr.message
      }

      if (sendError) {
        console.error(`[send-weekly] Failed to send to ${employee.email}:`, sendError)
        results.failed++
      } else {
        await supabase
          .from('submissions')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', submission.id)
        results.sent++
      }
    }
  }

  console.log(`Weekly send complete: ${JSON.stringify(results)}`)
  return NextResponse.json({ ok: true, weekStart, ...results })
}

// Allow Vercel cron to call via GET too
export { POST as GET }
