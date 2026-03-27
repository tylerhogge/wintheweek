/**
 * POST /api/webhooks/resend-delivery
 *
 * Webhook endpoint for Resend email delivery events.
 * Updates submission email_status based on delivery lifecycle:
 *   sent → delivered → opened (or bounced / complained)
 *
 * Configure in Resend dashboard → Webhooks → add this URL
 * with events: email.delivered, email.opened, email.bounced, email.complained
 */

import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createServiceClient } from '@/lib/supabase/server'

type ResendDeliveryPayload = {
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

// Map Resend event types to our status values.
// Only "upgrade" status — never downgrade (e.g. opened should not go back to delivered).
const STATUS_PRIORITY: Record<string, number> = {
  sent: 0,
  delivered: 1,
  opened: 2,
  bounced: 3,   // terminal — overrides everything
  complained: 3,
}

const EVENT_TO_STATUS: Record<string, string> = {
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
}

export async function POST(req: Request) {
  // ── Verify Resend webhook signature (Svix) ────────────────────────────
  const webhookSecret = process.env.RESEND_DELIVERY_WEBHOOK_SECRET ?? process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('No delivery webhook secret configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 })
  }

  let payload: ResendDeliveryPayload
  const body = await req.text()
  try {
    const wh = new Webhook(webhookSecret)
    payload = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendDeliveryPayload
  } catch (err) {
    console.error('Delivery webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const newStatus = EVENT_TO_STATUS[payload.type]
  if (!newStatus) {
    // Event type we don't care about (e.g. email.sent, email.clicked)
    return NextResponse.json({ ok: true, note: 'Ignored event type' })
  }

  const emailId = payload.data?.email_id
  if (!emailId) {
    return NextResponse.json({ ok: true, note: 'No email_id in payload' })
  }

  const supabase = createServiceClient()

  // Find the submission by Resend email ID
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, email_status')
    .eq('resend_email_id', emailId)
    .limit(1)
    .maybeSingle()

  if (!submission) {
    // Could be a notification or other non-submission email — ignore
    return NextResponse.json({ ok: true, note: 'No matching submission' })
  }

  // Only upgrade status, never downgrade (unless bounce/complaint which overrides)
  const currentPriority = STATUS_PRIORITY[submission.email_status] ?? 0
  const newPriority = STATUS_PRIORITY[newStatus] ?? 0

  if (newPriority > currentPriority) {
    await supabase
      .from('submissions')
      .update({ email_status: newStatus })
      .eq('id', submission.id)
  }

  return NextResponse.json({ ok: true, status: newStatus })
}
