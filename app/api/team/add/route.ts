import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getResend, buildWelcomeEmail } from '@/lib/resend'

export async function POST(req: Request) {
  const { name, email, team, function: fn, manager_of_teams } = await req.json()

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  // Get the authenticated user's org
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await userClient
    .from('profiles')
    .select('org_id, name')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }

  // Fetch org name for the welcome email
  const { data: org } = await userClient
    .from('organizations')
    .select('name')
    .eq('id', profile.org_id)
    .single()

  // Use service role to insert (bypasses RLS for INSERT)
  const supabase = createServiceClient()
  const { error } = await supabase.from('employees').insert({
    org_id: profile.org_id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    team: team?.trim() || null,
    function: fn?.trim() || null,
    active: true,
    manager_of_teams: Array.isArray(manager_of_teams) && manager_of_teams.length > 0 ? manager_of_teams : null,
  })

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return NextResponse.json({ error: 'This email is already on your team' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send welcome email (non-blocking — don't fail the request if email fails)
  try {
    const { subject, html, text } = buildWelcomeEmail({
      employeeName: name.trim(),
      adminName: profile.name ?? null,
      orgName: org?.name ?? 'Your team',
    })

    await getResend().emails.send({
      from: `${process.env.FROM_NAME ?? 'Win the Week'} <${process.env.FROM_EMAIL ?? 'updates@wintheweek.co'}>`,
      to: email.trim().toLowerCase(),
      subject,
      html,
      text,
    })
  } catch (emailErr) {
    console.error('Welcome email failed (non-fatal):', emailErr)
  }

  return NextResponse.json({ ok: true })
}
