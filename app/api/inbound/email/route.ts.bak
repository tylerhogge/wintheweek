/**
 * POST /api/inbound/email
 *
 * Webhook endpoint called by Resend Inbound when an employee replies to their check-in email.
 */

import { NextResponse } from 'next/server'
import { getResend, buildDigestEmail } from '@/lib/resend'
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

  const senderEmail = parseEmail(payload.data?.from ?? '')
  if (!senderEmail) {
    return NextResponse.json({ error: 'No sender found' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id, org_id, name')
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
    console.log('No open submission for sender:', senderEmail)
    return NextResponse.json({ ok: true, note: 'No open submission' })
  }

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

  const { error: insertErr } = await supabase.from('responses').insert({
    submission_id: submission.id,
    body_raw: rawBody,
    body_clean: cleanBody,
  })

  if (insertErr) {
    console.error('Failed to store response', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  await supabase
    .from('submissions')
    .update({ replied_at: new Date().toISOString() })
    .eq('id', submission.id)

  const orgId = employee.org_id
  const weekStart = submission.week_start

  if (orgId && weekStart) {
    // Generate insight and check digest in the background
    Promise.all([
      generateAndStoreInsight(orgId, weekStart),
      maybeFireDigest(orgId, weekStart),
    ]).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
