import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { members } = await req.json()

  if (!Array.isArray(members) || members.length === 0) {
    return NextResponse.json({ error: 'No members provided' }, { status: 400 })
  }

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

  const supabase = createServiceClient()

  const rows = members
    .filter((m: any) => m.name?.trim() && m.email?.trim())
    .map((m: any) => ({
      org_id: profile.org_id,
      name: m.name.trim(),
      email: m.email.trim().toLowerCase(),
      team: m.team?.trim() || null,
      function: m.function?.trim() || null,
      active: true,
    }))

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid rows found (name and email required)' }, { status: 400 })
  }

  // upsert — skip duplicates by email within the org
  const { error } = await supabase
    .from('employees')
    .upsert(rows, { onConflict: 'org_id,email', ignoreDuplicates: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, imported: rows.length })
}
