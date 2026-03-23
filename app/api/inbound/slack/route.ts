/**
 * POST /api/inbound/slack
 *
 * Handles Slack Events API webhooks.
 * Two event types:
 *  1. url_verification  — Slack's initial challenge/response handshake
 *  2. event_callback    — message.im (employee replies to the bot in DM)
 *
 * When an employee replies via Slack DM, we run the exact same pipeline
 * as email replies: save the response, update the submission, notify the admin.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifySlackSignature } from '@/lib/slack'
import { getResend, buildReplyNotification, buildDigestEmail } from '@/lib/resend'
import { cleanEmailBody, formatWeekRange, getWeekStart } from '@/lib/utils'
import { generateWeeklyInsight } from '@/lib/anthropic'
import { format } from 'date-fns'

// ── Shared response-processing helpers (mirrored from inbound/email) ──────────

async function generateAndStoreInsight(orgId: string, weekStart: string) {
  const supabase = createServiceClient()
  const { data: org } = await supabase.from('organizations').select('name').eq('id', orgId).single()
  const { data: submissions } = await supabase
    .from('submissions')
    .select('employees(name, team), responses(body_clean)')
    .eq('week_start', weekStart)
    .eq('employees.org_id', orgId)
    .not('responses', 'is', null)

  const replies = ((submissions ?? []) as any[])
    .map((s: any) => ({ name: s.employees?.name ?? 'Unknown', team: s.employees?.team ?? null, body: s.responses?.body_clean ?? '' }))
    .filter((r: any) => r.body.trim().length > 0)

  if (replies.length === 0) return
  const weekLabel = formatWeekRange(weekStart)
  const insight = await generateWeeklyInsight(org?.name ?? 'the org', weekLabel, replies)
  await supabase.from('insights').upsert(
    { org_id: orgId, week_start: weekStart, summary: insight.summary, highlights: insight.highlights, generated_at: new Date().toISOString() },
    { onConflict: 'org_id,week_start' },
  )
}

async function maybeFireDigest(orgId: string, weekStart: string) {
  const supabase = createServiceClient()
  const { data: allSubs } = await supabase
    .from('submissions')
    .select('id, replied_at, campaigns!inner(org_id)')
    .eq('week_start', weekStart)
    .eq('campaigns.org_id', orgId)
    .not('sent_at', 'is', null)

  if (!allSubs || allSubs.length === 0) return
  if (!allSubs.every((s: any) => s.replied_at !== null)) return

  const { data: org } = await supabase.from('organizations').select('id, name, digest_notify').eq('id', orgId).single()
  if (!org?.digest_notify) return

  const { data: insight } = await supabase.from('insights').select('id, summary, highlights, digest_sent_at').eq('org_id', orgId).eq('week_start', weekStart).single()
  if ((insight as any)?.digest_sent_at) return

  const { data: adminProfile } = await supabase.from('profiles').select('email').eq('org_id', orgId).limit(1).single()
  if (!adminProfile?.email) return

  const { data: submissions } = await supabase
    .from('submissions')
    .select('employees(name, team), responses(body_clean)')
    .eq('week_start', weekStart)
    .eq('employees.org_id', orgId)
    .not('responses', 'is', null)

  const allReplies = ((submissions ?? []) as any[])
    .map((s: any) => ({ name: s.employees?.name ?? 'Unknown', team: s.employees?.team ?? null, body: s.responses?.body_clean ?? '' }))
    .filter((r: any) => r.body.trim().length > 0)

  const appUrl = 'https://www.wintheweek.co'
  const weekLabel = formatWeekRange(weekStart)
  const resend = getResend()
  const fromAddress = `Win the Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`

  // Admin digest: all replies
  const adminEmail = buildDigestEmail({ orgName: org.name, weekLabel, summary: insight?.summary ?? null, highlights: (insight?.highlights as string[] | null) ?? null, replies: allReplies, dashboardUrl: `${appUrl}/dashboard?week=${weekStart}` })
  await resend.emails.send({ from: fromAddress, to: adminProfile.email, subject: adminEmail.subject, html: adminEmail.html, text: adminEmail.text })

  // Manager digests: filtered to their teams
  const { data: managers } = await supabase
    .from('employees')
    .select('email, name, manager_of_teams')
    .eq('org_id', orgId)
    .eq('active', true)
    .not('manager_of_teams', 'is', null)

  if (managers && managers.length > 0) {
    for (const manager of managers) {
      const teams = (manager.manager_of_teams as string[]) ?? []
      if (teams.length === 0) continue
      if (manager.email === adminProfile.email) continue

      const teamReplies = allReplies.filter((r) => r.team && teams.includes(r.team))
      if (teamReplies.length === 0) continue

      const managerEmail = buildDigestEmail({ orgName: org.name, weekLabel, summary: null, highlights: null, replies: teamReplies, dashboardUrl: `${appUrl}/dashboard?week=${weekStart}` })
      await resend.emails.send({ from: fromAddress, to: manager.email, subject: `${org.name} — ${teams.join(', ')} Weekly Digest: ${weekLabel}`, html: managerEmail.html, text: managerEmail.text })
    }
  }

  await supabase.from('insights').update({ digest_sent_at: new Date().toISOString() }).eq('org_id', orgId).eq('week_start', weekStart)
}

async function notifyAdmin({ orgId, responseId, employeeName, employeeTeam, replyBody, weekStart }: { orgId: string; responseId: string; employeeName: string; employeeTeam: string | null; replyBody: string; weekStart: string }) {
  const supabase = createServiceClient()
  const { data: adminProfile } = await supabase.from('profiles').select('email, name').eq('org_id', orgId).limit(1).single()
  if (!adminProfile?.email) return

  const { data: weekSubs } = await supabase
    .from('submissions')
    .select('replied_at, campaigns!inner(org_id)')
    .eq('week_start', weekStart)
    .eq('campaigns.org_id', orgId)
    .not('sent_at', 'is', null)

  const weekTotal = weekSubs?.length ?? 0
  const weekReplied = weekSubs?.filter((s: any) => s.replied_at !== null).length ?? 0

  const inboundDomain = process.env.INBOUND_DOMAIN ?? 'inbound.wintheweek.co'
  const taggedReplyTo = `${employeeName} <reply+${responseId}@${inboundDomain}>`
  const appUrl = 'https://www.wintheweek.co'
  const emailContent = buildReplyNotification({ adminName: adminProfile.name ?? adminProfile.email.split('@')[0], employeeName, employeeTeam, replyBody, replyToAddress: taggedReplyTo, dashboardUrl: `${appUrl}/dashboard?week=${weekStart}`, weekReplied, weekTotal })
  await getResend().emails.send({ from: `Win the Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`, to: adminProfile.email, replyTo: taggedReplyTo, subject: emailContent.subject, html: emailContent.html, text: emailContent.text })
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Read raw body for signature verification
  const rawBody = await req.text()
  const timestamp = req.headers.get('x-slack-request-timestamp') ?? ''
  const signature = req.headers.get('x-slack-signature') ?? ''

  // Verify signature (skip in dev if signing secret not set)
  if (process.env.SLACK_SIGNING_SECRET) {
    if (!verifySlackSignature(rawBody, timestamp, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  // Ignore Slack retries (we already processed the event)
  if (req.headers.get('x-slack-retry-num')) {
    return NextResponse.json({ ok: true, note: 'Retry ignored' })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── Slack URL verification challenge ──
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge })
  }

  if (payload.type !== 'event_callback') {
    return NextResponse.json({ ok: true, note: 'Ignored event type' })
  }

  const event = payload.event
  if (!event || event.type !== 'message') {
    return NextResponse.json({ ok: true, note: 'Not a message event' })
  }

  // Filter: ignore bot messages, edited messages, and subtypes (joins, etc.)
  if (event.subtype || event.bot_id) {
    return NextResponse.json({ ok: true, note: 'Bot/system message ignored' })
  }

  const slackUserId: string = event.user
  const messageText: string = event.text ?? ''

  if (!slackUserId || !messageText.trim()) {
    return NextResponse.json({ ok: true, note: 'Empty or missing user/text' })
  }

  const supabase = createServiceClient()

  // Look up employee by slack_user_id
  const { data: employee } = await supabase
    .from('employees')
    .select('id, org_id, name, team, email')
    .eq('slack_user_id', slackUserId)
    .eq('active', true)
    .single()

  if (!employee) {
    console.log('[Slack inbound] No employee found for Slack user:', slackUserId)
    return NextResponse.json({ ok: true, note: 'Employee not found' })
  }

  // Also verify the bot that received this message belongs to this employee's org
  // (prevents cross-org confusion if somehow user IDs collide)
  const { data: integration } = await supabase
    .from('slack_integrations')
    .select('bot_user_id')
    .eq('org_id', employee.org_id)
    .single()

  if (!integration) {
    return NextResponse.json({ ok: true, note: 'No integration for org' })
  }

  // Find the most recent open submission for this employee
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, week_start, campaign_id')
    .eq('employee_id', employee.id)
    .is('replied_at', null)
    .not('sent_at', 'is', null)
    .order('week_start', { ascending: false })
    .limit(1)
    .single()

  if (!submission) {
    console.log('[Slack inbound] No open submission for employee:', employee.email)
    return NextResponse.json({ ok: true, note: 'No open submission' })
  }

  // Idempotency check
  const { data: existingResponse } = await supabase
    .from('responses')
    .select('id')
    .eq('submission_id', submission.id)
    .single()

  if (existingResponse) {
    return NextResponse.json({ ok: true, note: 'Already recorded' })
  }

  // Clean and store the response
  const cleanBody = cleanEmailBody(messageText)
  const { data: savedResponse, error: insertErr } = await supabase
    .from('responses')
    .insert({
      submission_id: submission.id,
      body_raw: messageText,
      body_clean: cleanBody,
    })
    .select('id')
    .single()

  if (insertErr || !savedResponse) {
    console.error('[Slack inbound] Failed to store response:', insertErr)
    return NextResponse.json({ error: 'Failed to store response' }, { status: 500 })
  }

  await supabase
    .from('submissions')
    .update({ replied_at: new Date().toISOString() })
    .eq('id', submission.id)

  const orgId = employee.org_id
  const weekStart = submission.week_start

  // Notify admin + trigger insight/digest (same as email pipeline)
  await notifyAdmin({
    orgId,
    responseId: savedResponse.id,
    employeeName: employee.name,
    employeeTeam: employee.team ?? null,
    replyBody: cleanBody,
    weekStart,
  }).catch((err) => console.error('[Slack inbound] notifyAdmin failed:', err))

  Promise.all([
    generateAndStoreInsight(orgId, weekStart),
    maybeFireDigest(orgId, weekStart),
  ]).catch(console.error)

  return NextResponse.json({ ok: true })
}
