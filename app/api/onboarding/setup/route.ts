import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function POST(req: Request) {
  const { company, yourName } = await req.json()

  if (!company?.trim()) {
    return NextResponse.json({ error: 'Company name required' }, { status: 400 })
  }

  // Verify the user is authenticated
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check they don't already have an org
  const { data: existing } = await userClient
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (existing?.org_id) {
    return NextResponse.json({ error: 'Already has an organization' }, { status: 400 })
  }

  // Use service role to bypass RLS for org creation
  const supabase = createServiceClient()

  // Generate a unique slug
  const baseSlug = slugify(company.trim())
  let slug = baseSlug
  let attempt = 0

  while (true) {
    const { data: conflict } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()
    if (!conflict) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  // Create the organization
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: company.trim(), slug })
    .select()
    .single()

  if (orgErr || !org) {
    return NextResponse.json({ error: orgErr?.message ?? 'Failed to create org' }, { status: 500 })
  }

  // Update the profile
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({
      org_id: org.id,
      name: yourName?.trim() || null,
    })
    .eq('id', user.id)

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, orgId: org.id })
}
