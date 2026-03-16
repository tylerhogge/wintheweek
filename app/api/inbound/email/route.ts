/**
 * POST /api/inbound/email
 *
 * Webhook endpoint called by Resend Inbound when an employee replies to their check-in email.
 *
 * Replies go to updates@wintheweek.co. We match the reply to the right submission
 * by looking up the sender's email address against active employees and finding
 * their most recent unsent/unreplied submission.
 *
 * Resend inbound docs: https://resend.com/docs/dashboard/emails/inbound-emails
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cleanEmailBody } from '@/lib/utils'

// Resend inbound webhook payload (simplified — see Resend docs for full schema)
type ResendInboundPayload = {
  to:      Array<{ email: string }>
  from:    Array<{ email: string; name?: string }>
  subject: string
  text?:   string
  html?:   string
}

export async function POST(req: Request) {
  let payload: ResendInboundPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Get the sender's email address
  const senderEmail = payload.from?.[0]?.email
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

  // Clean the email body — strip quoted text and signatures
  const rawBody = payload.text ?? ''
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

  // Trigger AI insight generation in the background
  const orgId = employee.org_id
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
