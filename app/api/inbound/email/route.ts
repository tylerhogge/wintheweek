/**
 * POST /api/inbound/email
 *
 * Webhook endpoint called by Resend Inbound for two scenarios:
 *  1. Employee reply  — to: updates@wintheweek.co
 *  2. Manager reply   — to: reply+{response_id}@inbound.wintheweek.co
 */

import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { getResend, buildDigestEmail, buildReplyNotification, buildManagerReplyEmail, buildNudgeEmail } from '@/lib/resend'
import { createServiceClient } from '@/lib/supabase/server'
import { cleanEmailBody, htmlToPlainText, formatWeekRange } from '@/lib/utils'
import { generateWeeklyInsight, generateQueryResponse, type PriorWeekContext } from '@/lib/anthropic'

type ResendInboundPayload = {
  type: string
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string      // Email subject line
    message_id: string   // Message-ID header of the incoming email
    created_at: string
  }
}

function parseEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/)
  return match ? match[1].trim().toLowerCase() : raw.trim().toLowerCase()
}

/**
 * Strip Exchange-added subject prefixes ([BULK], [EXTERNAL], [EXT], etc.)
 * so Thread-Topic matches the original outbound email's Thread-Topic.
 */
function stripExchangePrefixes(topic: string): string {
  return topic.replace(/^(\[(BULK|EXTERNAL|EXT|SPAM)\]\s*)+/gi, '').trim()
}

/**
 * Extend a Thread-Index value by appending 5 new bytes.
 * Exchange requires every message in a thread to have a unique Thread-Index
 * built by extending the parent's value — reusing the same value causes
 * Outlook to treat the message as a duplicate or separate conversation.
 */
function extendThreadIndex(base64Index: string): string {
  try {
    const buf = Buffer.from(base64Index, 'base64')
    const ext = Buffer.allocUnsafe(5)
    // 4-byte timestamp (centiseconds) + 1 random byte for uniqueness
    ext.writeUInt32BE(Math.floor(Date.now() / 10) & 0xffffffff, 0)
    ext[4] = Math.floor(Math.random() * 256)
    return Buffer.concat([buf, ext]).toString('base64')
  } catch {
    return base64Index
  }
}

/** Extract response ID from a tagged reply address: reply+{id}@* → id */
function extractResponseId(toAddresses: string[]): string | null {
  for (const addr of toAddresses) {
    const match = addr.match(/reply\+([a-f0-9-]+)@/i)
    if (match) return match[1]
  }
  return null
}

/**
 * Generate AI insight and store it. Called directly — no HTTP round-trip.
 * Only generates once at least 50% of submissions have replies,
 * then re-generates on every subsequent reply so the briefing stays fresh.
 */
async function generateAndStoreInsight(orgId: string, weekStart: string) {
  const supabase = createServiceClient()

  // Count total submissions and replied submissions for this week
  const { data: allSubs } = await supabase
    .from('submissions')
    .select('id, replied_at, campaigns!inner(org_id)')
    .eq('week_start', weekStart)
    .eq('campaigns.org_id', orgId)
    .is('hidden_at', null)

  const totalSubs = allSubs?.length ?? 0
  const repliedSubs = allSubs?.filter((s: any) => s.replied_at)?.length ?? 0

  // Don't generate until at least 50% of the team has replied
  if (totalSubs === 0 || repliedSubs < Math.ceil(totalSubs / 2)) return

  const { data: org } = await supabase
    .from('organizations')
    .select('name, priorities')
    .eq('id', orgId)
    .single()

  const { data: submissions } = await supabase
    .from('submissions')
    .select('employees(name, team), responses(body_clean, hidden_at)')
    .eq('week_start', weekStart)
    .eq('employees.org_id', orgId)
    .not('responses', 'is', null)

  const replies = ((submissions ?? []) as any[])
    .filter((s: any) => !s.responses?.hidden_at)
    .map((s: any) => ({
      name: s.employees?.name ?? 'Unknown',
      team: s.employees?.team ?? null,
      body: s.responses?.body_clean ?? '',
    }))
    .filter((r: any) => r.body.trim().length > 0)

  if (replies.length === 0) return

  // Fetch prior week's insight for week-over-week comparison
  const priorDate = new Date(weekStart + 'T00:00:00Z')
  priorDate.setUTCDate(priorDate.getUTCDate() - 7)
  const priorWeekStart = priorDate.toISOString().slice(0, 10)

  const { data: priorInsight } = await supabase
    .from('insights')
    .select('summary, highlights, sentiment_score, sentiment_label, themes, bottom_line')
    .eq('org_id', orgId)
    .eq('week_start', priorWeekStart)
    .single()

  const priorWeek: PriorWeekContext | null = priorInsight ? {
    ...priorInsight,
    week_label: formatWeekRange(priorWeekStart),
  } : null

  const weekLabel = formatWeekRange(weekStart)
  const insight = await generateWeeklyInsight(org?.name ?? 'the org', weekLabel, replies, org?.priorities, priorWeek)

  await supabase.from('insights').upsert(
    {
      org_id: orgId,
      week_start: weekStart,
      summary: insight.summary,
      highlights: insight.highlights,
      cross_functional_themes: insight.cross_functional_themes,
      risk_items: insight.risk_items,
      bottom_line: insight.bottom_line,
      initiative_tracking: insight.initiative_tracking,
      sentiment_score: insight.sentiment_score,
      sentiment_label: insight.sentiment_label,
      themes: insight.themes,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,week_start' },
  )
}

/** After all submissions replied: send the digest email to admin + manager digests. */
async function maybeFireDigest(orgId: string, weekStart: string) {
  const supabase = createServiceClient()

  const { data: allSubs } = await supabase
    .from('submissions')
    .select('id, replied_at, campaigns!inner(org_id)')
    .eq('week_start', weekStart)
    .eq('campaigns.org_id', orgId)
    .not('sent_at', 'is', null)

  if (!allSubs || allSubs.length === 0) return
  const allReplied = allSubs.every((s: any) => s.replied_at !== null)
  if (!allReplied) return

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, digest_notify')
    .eq('id', orgId)
    .single()

  if (!org?.digest_notify) return

  const { data: insight } = await supabase
    .from('insights')
    .select('id, summary, highlights, digest_sent_at')
    .eq('org_id', orgId)
    .eq('week_start', weekStart)
    .single()

  if ((insight as any)?.digest_sent_at) return

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('org_id', orgId)
    .limit(1)
    .single()

  if (!adminProfile?.email) return

  const { data: submissions } = await supabase
    .from('submissions')
    .select('employees(name, team), responses(body_clean, hidden_at)')
    .eq('week_start', weekStart)
    .eq('employees.org_id', orgId)
    .not('responses', 'is', null)

  const allReplies = ((submissions ?? []) as any[])
    .filter((s: any) => !s.responses?.hidden_at)
    .map((s: any) => ({
      name: s.employees?.name ?? 'Unknown',
      team: s.employees?.team ?? null,
      body: s.responses?.body_clean ?? '',
    }))
    .filter((r: any) => r.body.trim().length > 0)

  const appUrl = 'https://www.wintheweek.co'
  const weekLabel = formatWeekRange(weekStart)
  const resend = getResend()
  const fromAddress = `Win The Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`

  // ── Admin digest: all replies ───────────────────────────────────────────
  const adminEmail = buildDigestEmail({
    orgName: org.name,
    weekLabel,
    summary: insight?.summary ?? null,
    highlights: (insight?.highlights as string[] | null) ?? null,
    replies: allReplies,
    dashboardUrl: `${appUrl}/dashboard?week=${weekStart}`,
  })

  await resend.emails.send({
    from: fromAddress,
    to: adminProfile.email,
    subject: adminEmail.subject,
    html: adminEmail.html,
    text: adminEmail.text,
  })

  // ── Manager digests: filtered to their teams ────────────────────────────
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

      // Don't double-send if the manager happens to also be the admin
      if (manager.email === adminProfile.email) continue

      const teamReplies = allReplies.filter((r) => r.team && teams.includes(r.team))
      if (teamReplies.length === 0) continue

      const managerEmail = buildDigestEmail({
        orgName: org.name,
        weekLabel,
        summary: null,  // Managers get replies only, no AI summary (admin-only for now)
        highlights: null,
        replies: teamReplies,
        dashboardUrl: `${appUrl}/dashboard?week=${weekStart}`,
      })

      await resend.emails.send({
        from: fromAddress,
        to: manager.email,
        subject: `${org.name} — ${teams.join(', ')} Weekly Digest: ${weekLabel}`,
        html: managerEmail.html,
        text: managerEmail.text,
      })
    }
  }

  await supabase
    .from('insights')
    .update({ digest_sent_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('week_start', weekStart)
}

/**
 * Notify the admin that an employee replied.
 * Reply-To is a tagged address so their reply routes back through us.
 */
async function notifyAdmin({
  orgId,
  responseId,
  employeeName,
  employeeTeam,
  replyBody,
  weekStart,
  isFollowUp = false,
}: {
  orgId: string
  responseId: string
  employeeName: string
  employeeTeam: string | null
  replyBody: string
  weekStart: string
  isFollowUp?: boolean
}) {
  const supabase = createServiceClient()

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('org_id', orgId)
    .limit(1)
    .single()

  if (!adminProfile?.email) return

  // Fetch week reply counts for context line in notification email
  // Filter hidden submissions to match what the dashboard shows
  const { data: weekSubs } = await supabase
    .from('submissions')
    .select('replied_at, campaigns!inner(org_id)')
    .eq('week_start', weekStart)
    .eq('campaigns.org_id', orgId)
    .not('sent_at', 'is', null)
    .is('hidden_at', null)

  const weekTotal = weekSubs?.length ?? 0
  const weekReplied = weekSubs?.filter((s: any) => s.replied_at !== null).length ?? 0

  const inboundDomain = process.env.INBOUND_DOMAIN ?? 'wintheweek.co'
  const taggedReplyTo = `${employeeName} <reply+${responseId}@${inboundDomain}>`
  const appUrl = 'https://www.wintheweek.co'

  const emailContent = buildReplyNotification({
    adminName: adminProfile.name ?? adminProfile.email.split('@')[0],
    employeeName,
    employeeTeam,
    replyBody,
    replyToAddress: taggedReplyTo,
    dashboardUrl: `${appUrl}/dashboard?week=${weekStart}`,
    weekReplied,
    weekTotal,
  })

  // Threading: use a deterministic Message-ID based on the response ID so that
  // follow-up notifications (and the CEO's own replies) all reference the same
  // anchor and Gmail groups them into one thread.
  const anchorMessageId = `<notify-${responseId}@wintheweek.co>`
  const headers: Record<string, string> = {}

  if (isFollowUp) {
    // Follow-up: thread onto the original notification
    headers['In-Reply-To'] = anchorMessageId
    headers['References'] = anchorMessageId
  } else {
    // First notification: set the anchor Message-ID
    headers['Message-ID'] = anchorMessageId
  }

  const resend = getResend()
  await resend.emails.send({
    from: `Win The Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`,
    to: adminProfile.email,
    replyTo: taggedReplyTo,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    headers,
  })
}

/**
 * Notify any managers whose teams include this employee's team.
 * Each manager gets the same reply-notification email the admin gets.
 */
async function notifyManagers({
  orgId,
  responseId,
  employeeName,
  employeeTeam,
  replyBody,
  weekStart,
}: {
  orgId: string
  responseId: string
  employeeName: string
  employeeTeam: string | null
  replyBody: string
  weekStart: string
}) {
  if (!employeeTeam) return // No team → no manager to notify

  const supabase = createServiceClient()

  // Find managers whose manager_of_teams array contains this team
  const { data: managers } = await supabase
    .from('employees')
    .select('email, name')
    .eq('org_id', orgId)
    .eq('active', true)
    .not('manager_of_teams', 'is', null)
    .contains('manager_of_teams', [employeeTeam])

  if (!managers || managers.length === 0) return

  // Get all admin email addresses to avoid double-notifying.
  // The admin may use different emails in their auth profile vs employee record,
  // so we collect all known admin emails for dedup.
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('email')
    .eq('org_id', orgId)

  const adminEmails = new Set<string>()
  for (const p of adminProfiles ?? []) {
    if (p.email) adminEmails.add(p.email.toLowerCase())
  }

  // Week reply counts for context (exclude hidden to match dashboard)
  const { data: weekSubs } = await supabase
    .from('submissions')
    .select('replied_at, campaigns!inner(org_id)')
    .eq('week_start', weekStart)
    .eq('campaigns.org_id', orgId)
    .not('sent_at', 'is', null)
    .is('hidden_at', null)

  const weekTotal = weekSubs?.length ?? 0
  const weekReplied = weekSubs?.filter((s: any) => s.replied_at !== null).length ?? 0

  const inboundDomain = process.env.INBOUND_DOMAIN ?? 'wintheweek.co'
  const taggedReplyTo = `${employeeName} <reply+${responseId}@${inboundDomain}>`
  const appUrl = 'https://www.wintheweek.co'
  const resend = getResend()
  const fromAddress = `Win The Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`

  for (const manager of managers) {
    // Skip if manager is the admin (they already got notified via notifyAdmin)
    if (adminEmails.has(manager.email.toLowerCase())) continue

    const emailContent = buildReplyNotification({
      adminName: manager.name?.split(' ')[0] ?? 'Manager',
      employeeName,
      employeeTeam,
      replyBody,
      replyToAddress: taggedReplyTo,
      dashboardUrl: `${appUrl}/dashboard?week=${weekStart}`,
      weekReplied,
      weekTotal,
    })

    await resend.emails.send({
      from: fromAddress,
      to: manager.email,
      replyTo: taggedReplyTo,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })
  }
}

/**
 * Handle a manager reply: save it and forward to the employee.
 */
async function handleManagerReply(responseId: string, rawBody: string) {
  const supabase = createServiceClient()

  const { data: response } = await supabase
    .from('responses')
    .select('id, submission_id, thread_message_id, thread_headers, submissions(id, employee_id, week_start, employees(name, email, org_id, team), campaigns(subject))')
    .eq('id', responseId)
    .single()

  if (!response) {
    console.error('Manager reply: response not found', responseId)
    return
  }

  const submission = (response as any).submissions
  const employee = submission?.employees

  if (!employee?.email || !employee?.org_id) {
    console.error('Manager reply: employee not found for response', responseId)
    return
  }

  const cleanBody = cleanEmailBody(rawBody)

  await supabase.from('manager_replies').insert({
    response_id: responseId,
    body_clean: cleanBody,
  })

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('name, email')
    .eq('org_id', employee.org_id)
    .limit(1)
    .single()

  const adminDisplayName = adminProfile?.name ?? 'Your manager'
  const fromAddress = process.env.FROM_EMAIL ?? 'hello@wintheweek.co'
  const replyToAddress = process.env.REPLY_TO_EMAIL ?? 'updates@wintheweek.co'

  // Thread the reply back into the employee's original check-in conversation.
  // thread_message_id = the original check-in's Message-ID (extracted from the
  //   employee's In-Reply-To header) — this email lives in the Outlook inbox.
  // thread_headers = Thread-Topic + Thread-Index from the employee's reply,
  //   which Outlook Exchange uses for conversation grouping.
  const threadMessageId = (response as any).thread_message_id as string | null
  const storedThreadHeaders = ((response as any).thread_headers ?? {}) as Record<string, string>
  const campaignSubject = (response as any).submissions?.campaigns?.subject
  // Sophos (and similar gateways) prepend [BULK] to ALL inbound external email subjects.
  // Exchange computes ConversationTopic by stripping Re:/FW: from the START of the subject.
  // But Sophos puts [BULK] before Re:, so "Re:" never gets stripped from manager replies,
  // giving them a different ConversationTopic than the original check-in.
  //
  // Fix: omit "Re:" entirely. Both the original check-in and the manager reply will have
  // [BULK] prepended by Sophos, so Exchange will compute matching ConversationTopics and
  // group them in the same conversation.
  //
  // The stored thread-topic already has [BULK] stripped (so we don't double-up), and it
  // exactly matches the base ConversationTopic Exchange stored for the original check-in.
  const storedThreadTopic = storedThreadHeaders['thread-topic']
  const threadSubject = storedThreadTopic
    ? storedThreadTopic
    : (campaignSubject ? `Re: ${campaignSubject}` : 'Re: Your weekly update')

  const outboundHeaders: Record<string, string> = {}
  if (threadMessageId) {
    outboundHeaders['In-Reply-To'] = threadMessageId
    outboundHeaders['References'] = threadMessageId
  }
  if (storedThreadHeaders['thread-topic']) outboundHeaders['Thread-Topic'] = storedThreadHeaders['thread-topic']
  if (storedThreadHeaders['thread-index']) outboundHeaders['Thread-Index'] = extendThreadIndex(storedThreadHeaders['thread-index'])
  console.log('[manager reply] thread_message_id from DB:', threadMessageId ?? '(null)')
  console.log('[manager reply] outbound headers keys:', Object.keys(outboundHeaders))

  const emailContent = buildManagerReplyEmail({
    employeeFirstName: employee.name?.split(' ')[0] ?? 'there',
    managerReplyBody: cleanBody,
  })

  const resend = getResend()
  await resend.emails.send({
    from: `${adminDisplayName} <${fromAddress}>`,
    to: employee.email,
    replyTo: replyToAddress,
    subject: threadSubject,
    html: emailContent.html,
    text: emailContent.text,
    ...(Object.keys(outboundHeaders).length > 0 && { headers: outboundHeaders }),
  })
}

/**
 * Handle a manager emailing a free-form question to updates@wintheweek.co.
 * Pulls recent check-in data, asks Claude, and emails the answer back.
 */
async function handleManagerQuery({
  senderEmail,
  senderName,
  emailId,
  orgId,
  incomingSubject,
}: {
  senderEmail: string
  senderName: string | null
  emailId: string
  orgId: string
  incomingSubject: string
}) {
  const supabase = createServiceClient()
  const resend = getResend()

  // Fetch the email body
  const { data: receivedEmail, error: fetchErr } = await resend.emails.receiving.get(emailId)
  if (fetchErr || !receivedEmail) {
    console.error('Manager query: failed to fetch email body', fetchErr)
    return
  }

  const question = cleanEmailBody(receivedEmail.text ?? '').trim()
  if (!question) return

  // Org name for context
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  // All employees in the org
  const { data: employeeRows } = await supabase
    .from('employees')
    .select('name, team, active')
    .eq('org_id', orgId)
    .order('name')

  // Last 8 weeks of submissions + responses, via employee org_id
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 56)
  const weekStartCutoff = cutoff.toISOString().split('T')[0]

  const { data: submissionRows } = await supabase
    .from('submissions')
    .select('week_start, replied_at, sent_at, employees!inner(name, team, org_id), responses(body_clean, hidden_at)')
    .eq('employees.org_id', orgId)
    .gte('week_start', weekStartCutoff)
    .not('sent_at', 'is', null)
    .order('week_start', { ascending: false })
    .limit(300)

  const employees = (employeeRows ?? []).map((e: any) => ({
    name: e.name,
    team: e.team ?? null,
    active: e.active,
  }))

  const submissions = ((submissionRows ?? []) as any[]).map((s: any) => ({
    weekStart: s.week_start as string,
    sentAt: s.sent_at ?? null,
    employeeName: s.employees?.name ?? 'Unknown',
    employeeTeam: s.employees?.team ?? null,
    responded: s.replied_at !== null,
    body: s.responses?.hidden_at ? null : (s.responses?.body_clean ?? null),
  }))

  // Generate the AI answer
  const answer = await generateQueryResponse(org?.name ?? 'your org', question, {
    employees,
    submissions,
  })

  const replySubject = incomingSubject.startsWith('Re:')
    ? incomingSubject
    : `Re: ${incomingSubject}`

  const fromAddress = process.env.FROM_EMAIL ?? 'hello@wintheweek.co'
  const displayName = senderName ? `Hi ${senderName.split(' ')[0]},\n\n` : ''

  await resend.emails.send({
    from: `Win The Week <${fromAddress}>`,
    to: senderEmail,
    subject: replySubject,
    text: `${displayName}${answer}\n\n—\nWin The Week`,
    html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#111;max-width:600px">${displayName.replace('\n\n', '<br><br>')}${answer.replace(/\n/g, '<br>')}<br><br>—<br>Win The Week</div>`,
  })

  console.log('[manager query] answered and sent to', senderEmail)
}

export async function POST(req: Request) {
  // ── Verify Resend webhook signature (Svix) ────────────────────────────
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('RESEND_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing webhook signature headers' }, { status: 401 })
  }

  let payload: ResendInboundPayload
  const body = await req.text()
  try {
    const wh = new Webhook(webhookSecret)
    payload = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendInboundPayload
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  if (payload.type !== 'email.received') {
    return NextResponse.json({ ok: true, note: 'Ignored event type' })
  }

  const toAddresses = payload.data?.to ?? []
  const senderEmail = parseEmail(payload.data?.from ?? '')

  // ── Branch 1: Manager reply (tagged address) ──────────────────────────────
  const responseId = extractResponseId(toAddresses)
  if (responseId) {
    const resend = getResend()
    const { data: receivedEmail, error: fetchErr } = await resend.emails.receiving.get(
      payload.data.email_id,
    )
    if (fetchErr || !receivedEmail) {
      console.error('Manager reply: failed to fetch email body', fetchErr)
      return NextResponse.json({ error: 'Could not retrieve email body' }, { status: 500 })
    }

    let rawBody = receivedEmail.text ?? ''
    const htmlBody = (receivedEmail as any).html ?? ''
    if (htmlBody && rawBody.split('\n').filter((l: string) => l.trim()).length <= 2) {
      rawBody = htmlToPlainText(htmlBody)
    }
    await handleManagerReply(responseId, rawBody).catch(console.error)
    return NextResponse.json({ ok: true, note: 'Manager reply processed' })
  }

  // ── Branch 2: Manager query (sender is a known admin profile) ───────────────
  if (!senderEmail) {
    return NextResponse.json({ error: 'No sender found' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('id, org_id, name')
    .eq('email', senderEmail)
    .single()

  if (senderProfile?.org_id) {
    const incomingSubject = payload.data?.subject ?? 'Your team check-ins'
    await handleManagerQuery({
      senderEmail,
      senderName: senderProfile.name ?? null,
      emailId: payload.data.email_id,
      orgId: senderProfile.org_id,
      incomingSubject,
    }).catch(console.error)
    return NextResponse.json({ ok: true, note: 'Manager query processed' })
  }

  // ── Branch 3: Employee reply ──────────────────────────────────────────────
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id, org_id, name, team')
    .eq('email', senderEmail)
    .eq('active', true)
    .single()

  if (empErr || !employee) {
    console.log('Reply from unknown sender:', senderEmail)
    return NextResponse.json({ ok: true, note: 'Sender not found' })
  }

  const { data: submission, error: subErr } = await supabase
    .from('submissions')
    .select('*, campaigns(org_id)')
    .eq('employee_id', employee.id)
    .is('replied_at', null)
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(1)
    .single()

  if (subErr || !submission) {
    // No unreplied submission — could be a thread continuation after admin replied back.
    // Look for the most recent submission that already has a response.
    const { data: priorSubmission } = await supabase
      .from('submissions')
      .select('id, week_start, campaigns(org_id)')
      .eq('employee_id', employee.id)
      .not('replied_at', 'is', null)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single()

    if (!priorSubmission) {
      console.log('No submission found for sender:', senderEmail)
      return NextResponse.json({ ok: true, note: 'No submission found' })
    }

    const { data: priorResponse } = await supabase
      .from('responses')
      .select('id')
      .eq('submission_id', priorSubmission.id)
      .single()

    if (!priorResponse) {
      return NextResponse.json({ ok: true, note: 'No prior response to thread onto' })
    }

    // Fetch and forward this follow-up to the admin using the existing response ID
    const resendClient = getResend()
    const { data: followUpEmail, error: followUpErr } = await resendClient.emails.receiving.get(
      payload.data.email_id,
    )
    if (followUpErr || !followUpEmail) {
      return NextResponse.json({ error: 'Could not retrieve email body' }, { status: 500 })
    }

    const followUpBody = cleanEmailBody(followUpEmail.text ?? '')
    const orgId = employee.org_id
    const weekStart = (priorSubmission as any).week_start

    // Store the employee follow-up in the conversation thread
    await supabase.from('manager_replies').insert({
      response_id: priorResponse.id,
      body_clean: followUpBody,
      sender_type: 'employee',
      employee_name: employee.name,
    })

    if (orgId && weekStart) {
      // Check if the org wants individual reply notifications
      const { data: orgSettingsThread } = await supabase
        .from('organizations')
        .select('notify_on_reply')
        .eq('id', orgId)
        .single()

      if (orgSettingsThread?.notify_on_reply ?? true) {
        await notifyAdmin({
          orgId,
          responseId: priorResponse.id,
          employeeName: employee.name,
          employeeTeam: (employee as any).team ?? null,
          replyBody: followUpBody,
          weekStart,
          isFollowUp: true,
        }).catch((err) => console.error('[notifyAdmin thread]', err))
      }
    }

    return NextResponse.json({ ok: true, note: 'Thread continuation forwarded to admin' })
  }

  // Check for duplicate — same submission already has a response saved
  const { data: existingResponse } = await supabase
    .from('responses')
    .select('id')
    .eq('submission_id', submission.id)
    .single()

  if (existingResponse) {
    return NextResponse.json({ ok: true, note: 'Already recorded' })
  }

  const resend = getResend()
  const { data: receivedEmail, error: fetchErr } = await resend.emails.receiving.get(
    payload.data.email_id,
  )

  if (fetchErr || !receivedEmail) {
    console.error('Failed to fetch email body from Resend:', fetchErr)
    return NextResponse.json({ error: 'Could not retrieve email body', detail: fetchErr }, { status: 500 })
  }

  // Prefer plain text, but fall back to HTML→text if the text version looks
  // truncated (Outlook mobile sometimes sends a minimal .text alternative).
  let rawBody = receivedEmail.text ?? ''
  const htmlBody = (receivedEmail as any).html ?? ''

  console.log('[inbound] text length:', rawBody.length, 'html length:', htmlBody.length)
  console.log('[inbound] text preview:', JSON.stringify(rawBody.slice(0, 300)))

  if (htmlBody && rawBody.split('\n').filter((l: string) => l.trim()).length <= 2) {
    // Text version has 2 or fewer non-blank lines but HTML exists — extract from HTML
    const fromHtml = htmlToPlainText(htmlBody)
    console.log('[inbound] text was short, extracted from HTML:', JSON.stringify(fromHtml.slice(0, 300)))
    rawBody = fromHtml
  }

  const cleanBody = cleanEmailBody(rawBody)

  // Extract threading headers from the employee's reply.
  // thread_message_id = their In-Reply-To = the original check-in's Message-ID (lives in Outlook inbox).
  // thread_headers = Outlook-specific Thread-Topic / Thread-Index for conversation grouping.
  const h = (receivedEmail as any).headers ?? {}
  console.log('[threading] raw headers keys:', Object.keys(h))
  console.log('[threading] in-reply-to:', h['in-reply-to'])
  console.log('[threading] thread-topic:', h['thread-topic'])
  console.log('[threading] thread-index:', h['thread-index'] ? '(present)' : '(absent)')
  const threadMessageId = h['in-reply-to'] || payload.data.message_id || null
  console.log('[threading] storing thread_message_id:', threadMessageId)
  const threadHeaders: Record<string, string> = {}
  if (h['thread-topic']) threadHeaders['thread-topic'] = stripExchangePrefixes(h['thread-topic'])
  if (h['thread-index']) threadHeaders['thread-index'] = h['thread-index']

  const { data: savedResponse, error: insertErr } = await supabase
    .from('responses')
    .insert({
      submission_id: submission.id,
      body_raw: rawBody,
      body_clean: cleanBody,
      thread_message_id: threadMessageId,
      thread_headers: Object.keys(threadHeaders).length > 0 ? threadHeaders : null,
    })
    .select('id')
    .single()

  if (insertErr || !savedResponse) {
    console.error('Failed to store response', insertErr)
    return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  await supabase
    .from('submissions')
    .update({ replied_at: new Date().toISOString() })
    .eq('id', submission.id)

  const orgId = employee.org_id
  const weekStart = submission.week_start

  // Await notification so it completes before the function returns —
  // Vercel can kill un-awaited background promises after the response is sent.
  if (orgId && weekStart) {
    // Check if the org wants individual reply notifications
    const { data: orgSettings } = await supabase
      .from('organizations')
      .select('notify_on_reply')
      .eq('id', orgId)
      .single()

    const shouldNotify = orgSettings?.notify_on_reply ?? true

    if (shouldNotify) {
      await notifyAdmin({
        orgId,
        responseId: savedResponse.id,
        employeeName: employee.name,
        employeeTeam: (employee as any).team ?? null,
        replyBody: cleanBody,
        weekStart,
      }).catch((err) => console.error('[notifyAdmin]', err))

      // Notify managers of this employee's team
      await notifyManagers({
        orgId,
        responseId: savedResponse.id,
        employeeName: employee.name,
        employeeTeam: (employee as any).team ?? null,
        replyBody: cleanBody,
        weekStart,
      }).catch((err) => console.error('[notifyManagers]', err))
    }

    // These are slower and optional — keep them as background work
    Promise.all([
      generateAndStoreInsight(orgId, weekStart),
      maybeFireDigest(orgId, weekStart),
    ]).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
