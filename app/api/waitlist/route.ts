import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { resend, buildWaitlistConfirmation } from '@/lib/resend'

export async function POST(req: Request) {
  const { email } = await req.json()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Insert (ignore duplicates gracefully)
  const { error } = await supabase
    .from('waitlist')
    .insert({ email })

  if (error && !error.message.includes('duplicate')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send confirmation email
  const { subject, html } = buildWaitlistConfirmation(email)
  await resend.emails.send({
    from: `Win the Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`,
    to: email,
    subject,
    html,
  })

  return NextResponse.json({ ok: true })
}
