/**
 * POST /api/send-weekly
 *
 * Called by Vercel Cron (see vercel.json) every hour.
 * For each active campaign, checks if the current hour in the campaign's
 * timezone matches the configured send_time and send_day. Only sends when
 * both the day and hour align.
 *
 * Also callable manually for testing — just POST with the cron secret.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend, buildCampaignEmail } from '@/lib/resend'
import { sendSlackDM, buildCheckinBlocks } from '@/lib/slack'
import { getWeekStart, createInitialThreadIndex } from '@/lib/utils'
import { verifyCronSecret } from '@/lib/auth'
import { format } from 'date-fns'

/** Get the current day-of-week (1=Mon..7=Sun) and hour (0-23) in a given timezone. */
function getLocalDayAndHour(tz: string): { dayOfWeek: number; hour: number } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0'

  const dayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return { dayOfWeek: dayMap[weekdayStr] ?? 1, hour: parseInt(hourStr, 10) }
}

export async function POST(req: Request) {
  const authErr = verifyCronSecret(req)
  if (authErr) return authErr

  const supabase = createServiceClient()
  const weekStart = format(getWeekStart(), 'yyyy-MM-dd')

  // Fetch ALL active campaigns — we'll filter by day/time per-campaign timezone
  const { data: campaigns, error: campaignErr } = await supabase
    .from('campaigns')
    .select('*, organizations(name)')
    .eq('active', true)

  if (campaignErr) {
    console.error('Failed to fetch campaigns', campaignErr)
    return NextResponse.json({ error: campaignErr.message }, { status: 500 })
  }

  const results = { sent: 0, failed: 0, skipped: 0 }

  // Cache Slack integrations per org to avoid N+1 queries
  const slackTokenCache = new Map<string, string | null>()

  async function getSlackToken(orgId: string): Promise<string | null> {
    if (slackTokenCache.has(orgId)) return slackTokenCache.get(orgId)!
    const { data } = await supabase
      .from('slack_integrations')
      .select('access_token')
      .eq('org_id', orgId)
      .single()
    const token = data?.access_token ?? null
    slackTokenCache.set(orgId, token)
    return token
  }

  for (const campaign of campaigns ?? []) {
    // ── Timezone-aware day/time gate ───────────────────────────────────────
    const tz = campaign.timezone || 'America/New_York'
    const { dayOfWeek, hour } = getLocalDayAndHour(tz)
    const configuredHour = parseInt(campaign.send_time?.split(':')[0] ?? '9', 10)

    if (dayOfWeek !== campaign.send_day || hour !== configuredHour) {
      // Not the right day or hour for this campaign — skip
      continue
    }

    console.log(
      `[send-weekly] Campaign "${campaign.subject}" (tz=${tz}) matches day=${dayOfWeek} hour=${hour}. Sending...`
    )

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

    if (!employees || employees.length === 0) continue

    // Batch idempotency check: fetch all existing submissions for this campaign + week in one query
    const employeeIds = employees.map((e) => e.id)
    const { data: existingSubmissions } = await supabase
      .from('submissions')
      .select('employee_id, sent_at, id')
      .eq('campaign_id', campaign.id)
      .eq('week_start', weekStart)
      .in('employee_id', employeeIds)

    // Only skip employees whose email was actually sent (sent_at is set)
    const alreadySent = new Set(
      (existingSubmissions ?? []).filter((s) => s.sent_at !== null).map((s) => s.employee_id)
    )
    // Track unsent submissions that need retry (row exists but sent_at is null)
    const unsentSubmissions = new Map(
      (existingSubmissions ?? []).filter((s) => s.sent_at === null).map((s) => [s.employee_id, s.id])
    )

    // Helper function: process a single employee
    async function processEmployee(employee: NonNullable<typeof employees>[number]) {
      // Skip if already sent this week (idempotency)
      if (alreadySent.has(employee.id)) {
        results.skipped++
        return
      }

      // Reuse existing submission row if it exists (retry), otherwise create new
      let submissionId: string
      if (unsentSubmissions.has(employee.id)) {
        submissionId = unsentSubmissions.get(employee.id)!
      } else {
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
          return
        }
        submissionId = submission.id
      }

      let sendError: string | null = null
      let resendEmailId: string | null = null

      if (employee.slack_user_id) {
        // ── Slack delivery ──────────────────────────────────────────────────
        const token = await getSlackToken(campaign.org_id)

        if (token) {
          const { blocks, fallbackText } = buildCheckinBlocks(employee.name, campaign.body)
          const slackResult = await sendSlackDM(token, employee.slack_user_id, blocks, fallbackText)
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
          const { data: sendResult, error: emailErr } = await getResend().emails.send({
            from: `${process.env.FROM_NAME ?? 'Win The Week'} <${process.env.FROM_EMAIL ?? 'updates@wintheweek.co'}>`,
            to: employee.email,
            replyTo,
            subject,
            html,
            text,
            headers: {
              'Thread-Index': createInitialThreadIndex(),
              'Thread-Topic': campaign.subject,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...({ tracking: { open: true, click: false } } as any),
          })
          if (emailErr) sendError = emailErr.message
          else resendEmailId = sendResult?.id ?? null
        }
      } else {
        // ── Email delivery (default) ────────────────────────────────────────
        const replyTo = process.env.REPLY_TO_EMAIL ?? 'updates@wintheweek.co'
        const { subject, html, text } = buildCampaignEmail({ employeeName: employee.name, subject: campaign.subject, body: campaign.body, replyToAddress: replyTo })
        const { data: sendResult, error: emailErr } = await getResend().emails.send({
          from: `${process.env.FROM_NAME ?? 'Win The Week'} <${process.env.FROM_EMAIL ?? 'updates@wintheweek.co'}>`,
          to: employee.email,
          replyTo,
          subject,
          html,
          text,
          headers: {
            'Thread-Index': createInitialThreadIndex(),
            'Thread-Topic': campaign.subject,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...({ tracking: { open: true, click: false } } as any),
        })
        if (emailErr) sendError = emailErr.message
        else resendEmailId = sendResult?.id ?? null
      }

      if (sendError) {
        console.error(`[send-weekly] Failed to send to ${employee.email}:`, sendError)
        results.failed++
      } else {
        await supabase
          .from('submissions')
          .update({
            sent_at: new Date().toISOString(),
            email_status: 'sent',
            ...(resendEmailId && { resend_email_id: resendEmailId }),
          })
          .eq('id', submissionId)
        results.sent++
      }
    }

    // Process employees sequentially to stay within Resend rate limits
    for (const employee of employees) {
      await processEmployee(employee)
    }
  }

  console.log(`Weekly send complete: ${JSON.stringify(results)}`)
  return NextResponse.json({ ok: true, weekStart, ...results })
}

// Allow Vercel cron to call via GET too
export { POST as GET }
