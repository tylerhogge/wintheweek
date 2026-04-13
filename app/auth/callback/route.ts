import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getResend } from '@/lib/resend'
import { NextResponse } from 'next/server'

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? ''

// Supabase redirects here after magic-link / OAuth sign-in
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Fire-and-forget: notify admin on first-ever login
      notifyIfFirstLogin(supabase).catch(console.error)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}

/** Send the admin an email the first time a new user signs in */
async function notifyIfFirstLogin(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return

    // Check if this user has a profile with first_login_notified flag
    const service = createServiceClient()
    const { data: profile } = await service
      .from('profiles')
      .select('id, first_login_notified')
      .eq('id', user.id)
      .single()

    if (!profile || profile.first_login_notified) return

    // Mark as notified so we don't email again
    await service
      .from('profiles')
      .update({ first_login_notified: true })
      .eq('id', user.id)

    // Skip if no admin email configured or if it's the admin's own login
    if (!ADMIN_EMAIL) return
    if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return

    await getResend().emails.send({
      from: 'Win The Week <notifications@wintheweek.co>',
      to: ADMIN_EMAIL,
      subject: `🆕 New login: ${user.email}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px;">
          <p style="font-size: 15px; color: #333;">A new user just signed in for the first time:</p>
          <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>Email:</strong> ${user.email}</p>
            <p style="margin: 8px 0 0; font-size: 14px;"><strong>Provider:</strong> ${user.app_metadata?.provider ?? 'unknown'}</p>
            <p style="margin: 8px 0 0; font-size: 14px;"><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Denver' })}</p>
          </div>
          <p style="font-size: 13px; color: #71717a;">Check <a href="https://wintheweek.co/settings" style="color: #22c55e;">your dashboard</a> for details.</p>
        </div>
      `,
    })
  } catch (err) {
    console.error('[auth] First-login notification failed:', err)
  }
}
