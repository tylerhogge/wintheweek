import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend, buildWaitlistConfirmation } from '@/lib/resend'
import { checkRateLimit, rateLimitKeyFromRequest } from '@/lib/rate-limit'

export async function POST(req: Request) {
  // Rate limit: 5 signups per minute per IP
  const rl = checkRateLimit(rateLimitKeyFromRequest(req, 'waitlist'), { limit: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

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

  // Send confirmation email to the user
  const fromAddr = `Win the Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`
  const { subject, html } = buildWaitlistConfirmation(email)
  await getResend().emails.send({
    from: fromAddr,
    to: email,
    subject,
    html,
  })

  // Notify the founder
  const notifyEmail = process.env.WAITLIST_NOTIFY_EMAIL
  if (notifyEmail) {
    await getResend().emails.send({
      from: fromAddr,
      to: notifyEmail,
      subject: `New waitlist signup: ${email}`,
      html: `<p style="font-family:sans-serif;font-size:14px;color:#333;"><strong>${email}</strong> just joined the Win the Week waitlist.</p>`,
    }).catch(() => {}) // Don't fail the signup if notification fails
  }

  return NextResponse.json({ ok: true })
}
