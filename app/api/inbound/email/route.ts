/**
 * POST /api/inbound/email
 *
 * Webhook endpoint called by Resend Inbound when an employee replies to their check-in email.
 *
 * Resend sends a POST with a JSON payload. The "to" address is the unique reply-to address
 * we embedded in the outgoing email: reply+{submissionId}@inbound.wintheweek.co
 *
 * We extract the submission ID, clean the email body, store the response,
 * then trigger AI insight generation for that org/week.
 *
 * Resend inbound docs: https://resend.com/docs/dashboard/emails/inbound-emails
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { parseSubmissionId, cleanEmailBody } from '@/lib/utils'

// Resend inbound webhook payload (simplified — see Resend docs for full schema)
type ResendInboundPayload = {
  to:      Array<{ email: string }>
  from:    Array<{ email: string; name?: string }>
  subject: string
  text?:   string
  html?:   string
}

export async function POST(req: Request) {
  // Optional: verify Resend webhook signature
  // const signature = req.headers.get('svix-signature')
  // ... verify with RESEND_WEBHOOK_SECRET

  let payload: ResendInboundPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Find the reply-to address in the "to" list
  const toAddress = payload.to?.find((t) => t.email.includes('reply+'))?.email
  if (!toAddress) {
    // Not a tracked reply — ignore
    return NextResponse.json({ ok: true, note: 'No submission token found' })
  }

  const submissionId = parseSubmissionId(toAddress)
  if (!submissionId) {
    return NextResponse.json({ error: 'Could not parse submission ID' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Look up the submission
  const { data: submission, error: subErr } = await supabase
    .from('submissions')
    .select('*, employees(org_id, name, team), campaigns(org_id)')
    .eq('id', submissionId)
    .single()

  if (subErr || !submission) {
    console.error('Submission not found', submissionId, subErr)
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  // Don't double-store if they reply twice
  const { data: existingResponse } = await supabase
    .from('responses')
    .select('id')
    .eq('submission_id', submissionId)
    .single()

  if (existingResponse) {
    return NextResponse.json({ ok: true, note: 'Already recorded' })
  }

  // Clean the email body — strip quoted text and signatures
  const rawBody = payload.text ?? ''
  const cleanBody = cleanEmailBody(rawBody)

  // Store the response
  const { error: insertErr } = await supabase.from('responses').insert({
    submission_id: submissionId,
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
    .eq('id', submissionId)

  // Trigger AI insight generation in the background
  const orgId = submission.employees?.org_id ?? submission.campaigns?.org_id
  const weekStart = submission.week_start

  if (orgId && weekStart) {
    // Fire and forget — don't block the webhook response
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/insights/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ org_id: orgId, week_start: weekStart }),
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
