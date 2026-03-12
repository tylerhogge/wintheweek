import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { name, email, team, function: fn } = await req.json()

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  // Get the authenticated user's org
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await userClient
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }

  // Use service role to insert (bypasses RLS for INSERT)
  const supabase = createServiceClient()
  const { error } = await supabase.from('employees').insert({
    org_id: profile.org_id,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    team: team?.trim() || null,
    function: fn?.trim() || null,
    active: true,
  })

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return NextResponse.json({ error: 'This email is already on your team' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
