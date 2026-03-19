/**
 * POST /api/inbound/email
 *
 * Webhook endpoint called by Resend Inbound for two scenarios:
 *  1. Employee reply  — to: updates@wintheweek.co
 *  2. Manager reply   — to: reply+{response_id}@inbound.wintheweek.co
 */

import { NextResponse } from 'next/server'
import { getResend, buildDigestEmail, buildReplyNotification, buildManagerReplyEmail, buildNudgeEmail } from '@/lib/resend'
import { createServiceClient } from '@/lib/supabase/server'
import { cleanEmailBody, formatWeekRange } from '@/lib/utils'
import { generateWeeklyInsight } from '@/lib/anthropic'

type ResendInboundPayload = {
  type: string
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    created_at: string
  }
}

function parseEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/)
  return match ? match[1].trim().toLowerCase() : raw.trim().toLowerCase()
}

/** Extract response ID from a tagged reply address: reply+{id}@* → id */
function extractResponseId(toAddresses: string[]): string | null {
  for (const addr of toAddresses) {
    const match = addr.match(/reply\+([a-f0-9-]+)@/i)
    if (match) return match[1]
  }
  return null
}

/** Generate AI insight and store it. Called directly — no HTTP round-trip. */
async function generateAndStoreInsight(orgId: string, weekStart: string) {
  const supabase = createServiceClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  const { data: submissions } = await supabase
    .from('submissions')
    .select('employees(name, team), responses(body_clean)')
    .eq('week_start', weekStart)
    .eq('employees.org_id', orgId)
    .not('responses', 'is', null)

  const replies = ((submissions ?? []) as any[])
    .map((s: any) => ({
      name: s.employees?.name ?? 'Unknown',
      team: s.employees?.team ?? null,
      body: s.responses?.body_clean ?? '',
    }))
    .filter((r: any) => r.body.trim().length > 0)

  if (replies.length === 0) return

  const weekLabel = formatWeekRange(weekStart)
  const insight = await generateWeeklyInsight(org?.name ?? 'the org', weekLabel, replies)

  await supabase.from('insights').upsert(
    {
      org_id: orgId,
      week_start: weekStart,
      summary: insight.summary,
      highlights: insight.highlights,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,week_start' },
  )
}

/** After all submissions replied: send the digest email if digest_notify is on. */
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
    .select('employees(name, team), responses(body_clean)')
    .eq('week_start', weekStart)
    .eq('employees.org_id', orgId)
    .not('responses', 'is', null)

  const replies = ((submissions ?? []) as any[])
    .map((s: any) => ({
      name: s.employees?.name ?? 'Unknown',
      team: s.employees?.team ?? null,
      body: s.responses?.body_clean ?? '',
    }))
    .filter((r: any) => r.body.trim().length > 0)

  const appUrl = 'https://www.wintheweek.co'
  const weekLabel = formatWeekRange(weekStart)

  const emailContent = buildDigestEmail({
    orgName: org.name,
    weekLabel,
    summary: insight?.summary ?? null,
    highlights: (insight?.highlights as string[] | null) ?? null,
    replies,
    dashboardUrl: `${appUrl}/dashboard?week=${weekStart}`,
  })

  const resend = getResend()
  await resend.emails.send({
    from: `Win the Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`,
    to: adminProfile.email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  })

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
}: {
  orgId: string
  responseId: string
  employeeName: string
  employeeTeam: string | null
  replyBody: string
  weekStart: string
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
  const { data: weekSubs } = await supabase
    .from('submissions')
    .select('replied_at, campaigns!inner(org_id)')
    .eq('week_start', weekStart)
    .eq('campaigns.org_id', orgId)
    .not('sent_at', 'is', null)

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

  const resend = getResend()
  await resend.emails.send({
    from: `Win the Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`,
    to: adminProfile.email,
    replyTo: taggedReplyTo,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  })
}

/**
 * Handle a manager reply: save it and forward to the employee.
 */
async function handleManagerReply(responseId: string, rawBody: string) {
  const supabase = createServiceClient()

  const { data: response } = await supabase
    .from('responses')
    .select('id, submission_id, submissions(employee_id, week_start, employees(name, email, org_id, team))')
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

  const emailContent = buildManagerReplyEmail({
    employeeFirstName: employee.name?.split(' ')[0] ?? 'there',
    managerReplyBody: cleanBody,
  })

  const resend = getResend()
  await resend.emails.send({
    from: `${adminDisplayName} <${fromAddress}>`,
    to: employee.email,
    replyTo: replyToAddress,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  })
}

export async function POST(req: Request) {
  let payload: ResendInboundPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
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

    const rawBody = receivedEmail.text ?? ''
    await handleManagerReply(responseId, rawBody).catch(console.error)
    return NextResponse.json({ ok: true, note: 'Manager reply processed' })
  }

  // ── Branch 2: Employee reply ──────────────────────────────────────────────
  if (!senderEmail) {
    return NextResponse.json({ error: 'No sender found' }, { status: 400 })
  }

  const supabase = createServiceClient()

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
    .order('week_start', { ascending: false })
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
      .order('week_start', { ascending: false })
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

    if (orgId && weekStart) {
      await notifyAdmin({
        orgId,
        responseId: priorResponse.id,
        employeeName: employee.name,
        employeeTeam: (employee as any).team ?? null,
        replyBody: followUpBody,
        weekStart,
      }).catch((err) => console.error('[notifyAdmin thread]', err))
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

  const rawBody = receivedEmail.text ?? ''
  const cleanBody = cleanEmailBody(rawBody)

  const { data: savedResponse, error: insertErr } = await supabase
    .from('responses')
    .insert({
      submission_id: submission.id,
      body_raw: rawBody,
      body_clean: cleanBody,
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
    await notifyAdmin({
      orgId,
      responseId: savedResponse.id,
      employeeName: employee.name,
      employeeTeam: (employee as any).team ?? null,
      replyBody: cleanBody,
      weekStart,
    }).catch((err) => console.error('[notifyAdmin]', err))

    // These are slower and optional — keep them as background work
    Promise.all([
      generateAndStoreInsight(orgId, weekStart),
      maybeFireDigest(orgId, weekStart),
    ]).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
