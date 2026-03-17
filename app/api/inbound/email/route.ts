/**
 * POST /api/inbound/email
 *
 * Webhook endpoint called by Resend Inbound when an employee replies to their check-in email.
 *
 * Replies go to updates@wintheweek.co. We match the reply to the right submission
 * by looking up the sender's email address against active employees and finding
 * their most recent unsent/unreplied submission.
 *
 * Resend inbound docs: https://resend.com/docs/dashboard/receiving/introduction
 *
 * ⚠️  Payload notes:
 *   - `data.from` is a raw RFC-5322 string, e.g. "Tyler Hogge <tyler@pelionvp.com>"
 *   - `data.to` is an array of plain email strings, not objects
 *   - The webhook does NOT include the email body — you must call
 *     resend.emails.receiving.get(email_id) to retrieve text/html
 */

import { NextResponse } from 'next/server'
import { getResend, buildDigestEmail } from '@/lib/resend'
import { createServiceClient } from '@/lib/supabase/server'
import { cleanEmailBody, formatWeekRange } from '@/lib/utils'

// Actual Resend inbound webhook payload shape
type ResendInboundPayload = {
  type: string          // "email.received"
  created_at: string
  data: {
    email_id: string
    from: string        // "Display Name <email@domain.com>"  or just "email@domain.com"
    to: string[]        // ["updates@wintheweek.co"]
    subject: string
    created_at: string
  }
}

/** Extract the bare email address from an RFC-5322 From header value. */
function parseEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/)
  return match ? match[1].trim().toLowerCase() : raw.trim().toLowerCase()
}

/**
 * After a reply is stored, check if all submissions for the week are replied.
 * If so, and if the org has digest_notify enabled, send the weekly digest email.
 */
async function maybeFireDigest(orgId: string, weekStart: string) {
  const supabase = createServiceClient()

  // Count total vs replied for this week
  const { data: allSubs } = await supabase
    .from('submissions')
    .select('id, replied_at, campaigns!inner(org_id)')
    .eq('week_start', weekStart)
    .eq('campaigns.org_id', orgId)
    .not('sent_at', 'is', null)

  if (!allSubs || allSubs.length === 0) return
  const allReplied = allSubs.every((s: any) => s.replied_at !== null)
  if (!allReplied) return

  // Check if digest_notify is enabled and not already sent
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, digest_notify')
    .eq('id', orgId)
    .single()

  if (!org?.digest_notify) return

  // Check if digest was already sent for this week
  const { data: insight } = await supabase
    .from('insights')
    .select('id, summary, highlights, digest_sent_at')
    .eq('org_id', orgId)
    .eq('week_start', weekStart)
    .single()

  if ((insight as any)?.digest_sent_at) return // already sent

  // Fetch admin email (the profile in this org)
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('org_id', orgId)
    .limit(1)
    .single()

  if (!adminProfile?.email) return

  // Fetch all replies for the email body
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wintheweek.co'
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

  // Mark digest as sent
  await supabase
    .from('insights')
    .update({ digest_sent_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('week_start', weekStart)
}

export async function POST(req: Request) {
  let payload: ResendInboundPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only handle email.received events
  if (payload.type !== 'email.received') {
    return NextResponse.json({ ok: true, note: 'Ignored event type' })
  }

  // Extract sender email from the RFC-5322 From string
  const senderEmail = parseEmail(payload.data?.from ?? '')
  if (!senderEmail) {
    return NextResponse.json({ error: 'No sender found' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Find the employee by email
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id, org_id, name')
    .eq('email', senderEmail)
    .eq('active', true)
    .single()

  if (empErr || !employee) {
    // Sender is not a tracked employee — silently ignore
    console.log('Reply from unknown sender:', senderEmail)
    return NextResponse.json({ ok: true, note: 'Sender not found' })
  }

  // Find their most recent submission that hasn't been replied to yet
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
    console.log('No open submission for sender:', senderEmail)
    return NextResponse.json({ ok: true, note: 'No open submission' })
  }

  // Don't double-store if they reply twice
  const { data: existingResponse } = await supabase
    .from('responses')
    .select('id')
    .eq('submission_id', submission.id)
    .single()

  if (existingResponse) {
    return NextResponse.json({ ok: true, note: 'Already recorded' })
  }

  // Fetch the full email body via the Resend SDK (requires resend ^6.0.0).
  // The webhook payload only contains metadata — body must be fetched separately.
  const resend = getResend()
  const { data: receivedEmail, error: fetchErr } = await resend.emails.receiving.get(
    payload.data.email_id,
  )

  if (fetchErr || !receivedEmail) {
    console.error('Failed to fetch email body from Resend:', fetchErr)
    return NextResponse.json({ error: 'Could not retrieve email body', detail: fetchErr }, { status: 500 })
  }

  // Clean the email body — strip quoted text and signatures
  const rawBody = receivedEmail.text ?? ''
  const cleanBody = cleanEmailBody(rawBody)

  // Store the response
  const { error: insertErr } = await supabase.from('responses').insert({
    submission_id: submission.id,
    body_raw: rawBody,
    body_clean: cleanBody,
  })

  if (insertErr) {
    console.error('Failed to store response', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Mark the submission as replied
  await supabase
    .from('submissions')
    .update({ replied_at: new Date().toISOString() })
    .eq('id', submission.id)

  const orgId = employee.org_id
  const weekStart = submission.week_start

  if (orgId && weekStart) {
    // Fire AI insights and digest check in the background — don't block the webhook response
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/insights/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ org_id: orgId, week_start: weekStart }),
    }).catch(console.error)

    maybeFireDigest(orgId, weekStart).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
