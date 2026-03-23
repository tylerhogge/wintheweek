/**
 * POST /api/wall-of-shame
 *
 * Called by Vercel Cron every Monday at 2 PM UTC (9 AM EST / 7 AM MST).
 * For each org that has the feature enabled, posts a list of non-respondents
 * to their configured Slack channel and/or emails the admin.
 *
 * Also manually callable: POST with Authorization: Bearer {CRON_SECRET}
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { postToSlackChannel, buildWallOfShameBlocks } from '@/lib/slack'
import { getResend } from '@/lib/resend'
import { formatWeekRange } from '@/lib/utils'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const results: { org: string; status: string }[] = []

  // Load all orgs that have at least one notification method enabled
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, shame_enabled, shame_channel_id, shame_channel_name, shame_email_enabled, shame_last_posted_week')
    .or('shame_enabled.eq.true,shame_email_enabled.eq.true')

  for (const org of orgs ?? []) {
    try {
      // ── Find the most recent week with sent check-ins for this org ──────────
      const { data: latestSub } = await supabase
        .from('submissions')
        .select('week_start, employees!inner(org_id)')
        .eq('employees.org_id', org.id)
        .not('sent_at', 'is', null)
        .order('week_start', { ascending: false })
        .limit(1)
        .single()

      if (!latestSub) {
        results.push({ org: org.name, status: 'skipped — no submissions found' })
        continue
      }

      const weekStart = (latestSub as any).week_start as string

      // Prevent double-posting for the same week
      if (org.shame_last_posted_week === weekStart) {
        results.push({ org: org.name, status: `skipped — already posted for ${weekStart}` })
        continue
      }

      // ── Fetch all submissions for this week ─────────────────────────────────
      const { data: weekSubs } = await supabase
        .from('submissions')
        .select('replied_at, employees!inner(name, org_id)')
        .eq('employees.org_id', org.id)
        .eq('week_start', weekStart)
        .not('sent_at', 'is', null)

      const allSubs = (weekSubs ?? []) as any[]
      const totalSent = allSubs.length
      const nonRespondents = allSubs
        .filter((s) => s.replied_at === null)
        .map((s) => s.employees?.name ?? 'Unknown')
        .sort()

      const weekLabel = formatWeekRange(weekStart)

      // ── Slack channel post ──────────────────────────────────────────────────
      if (org.shame_enabled && org.shame_channel_id) {
        const { data: integration } = await supabase
          .from('slack_integrations')
          .select('access_token')
          .eq('org_id', org.id)
          .single()

        if (integration?.access_token) {
          const { blocks, fallbackText } = buildWallOfShameBlocks(nonRespondents, totalSent, weekLabel)
          const result = await postToSlackChannel(
            integration.access_token,
            org.shame_channel_id,
            blocks,
            fallbackText,
          )
          if (!result.ok) {
            console.error(`[wall-of-shame] Slack post failed for ${org.name}:`, result.error)
            results.push({ org: org.name, status: `slack failed: ${result.error}` })
          } else {
            results.push({ org: org.name, status: `slack posted — ${nonRespondents.length} non-respondents` })
          }
        } else {
          results.push({ org: org.name, status: 'slack skipped — no token' })
        }
      }

      // ── Admin email ─────────────────────────────────────────────────────────
      if (org.shame_email_enabled) {
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('email, name')
          .eq('org_id', org.id)
          .limit(1)
          .single()

        if (adminProfile?.email) {
          const fromAddress = process.env.FROM_EMAIL ?? 'hello@wintheweek.co'
          const resend = getResend()

          const subject =
            nonRespondents.length === 0
              ? `✅ Everyone replied this week — ${weekLabel}`
              : `🚨 ${nonRespondents.length} non-respondent${nonRespondents.length === 1 ? '' : 's'} — ${weekLabel}`

          const adminFirstName = adminProfile.name?.split(' ')[0] ?? 'there'

          const bodyLines =
            nonRespondents.length === 0
              ? [`All ${totalSent} team members submitted their update this week. Great work.`]
              : [
                  `${nonRespondents.length} of ${totalSent} team members haven't replied to this week's check-in yet:`,
                  '',
                  ...nonRespondents.map((n) => `  • ${n}`),
                  '',
                  'You can send individual nudges from the dashboard.',
                ]

          const text = `Hi ${adminFirstName},\n\n${bodyLines.join('\n')}\n\n—\nWin the Week`
          const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#111;max-width:600px">
            <p>Hi ${adminFirstName},</p>
            ${bodyLines.map((l) => l === '' ? '<br>' : `<p style="margin:2px 0">${l}</p>`).join('')}
            <p>—<br>Win the Week</p>
          </div>`

          await resend.emails.send({
            from: `Win the Week <${fromAddress}>`,
            to: adminProfile.email,
            subject,
            text,
            html,
          })

          results.push({ org: org.name, status: `email sent to ${adminProfile.email}` })
        }
      }

      // ── Mark this week as posted ────────────────────────────────────────────
      await supabase
        .from('organizations')
        .update({ shame_last_posted_week: weekStart })
        .eq('id', org.id)

    } catch (err) {
      console.error(`[wall-of-shame] Error for org ${org.name}:`, err)
      results.push({ org: org.name, status: `error: ${String(err)}` })
    }
  }

  console.log('[wall-of-shame] complete:', results)
  return NextResponse.json({ ok: true, results })
}

// Allow Vercel cron to call via GET too
export { POST as GET }
