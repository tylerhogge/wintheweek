/**
 * POST /api/send-test
 *
 * Sends a one-off test email for a given campaign to a specified address.
 * Does not create a submission record — purely for previewing the email.
 * Requires an authenticated session.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getResend, buildCampaignEmail } from '@/lib/resend'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { campaign_id, to_email, to_name } = await req.json()
  if (!campaign_id || !to_email) {
    return NextResponse.json({ error: 'Missing campaign_id or to_email' }, { status: 400 })
  }

  // Verify the campaign belongs to the user's org
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaign_id)
    .eq('org_id', profile?.org_id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const replyTo = process.env.REPLY_TO_EMAIL ?? 'updates@wintheweek.co'

  const { subject, html, text } = buildCampaignEmail({
    employeeName: to_name || 'there',
    subject: `[TEST] ${campaign.subject}`,
    body: campaign.body,
    replyToAddress: replyTo,
  })

  const { error } = await getResend().emails.send({
    from: `${process.env.FROM_NAME ?? 'Win the Week'} <${process.env.FROM_EMAIL ?? 'updates@wintheweek.co'}>`,
    to: to_email,
    replyTo,
    subject,
    html,
    text,
  })

  if (error) {
    console.error('Test email failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
