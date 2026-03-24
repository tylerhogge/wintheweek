import { NextResponse } from 'next/server'
import { createClient, getProfile } from '@/lib/supabase/server'

export async function PUT(req: Request) {
  const profile = await getProfile()
  if (!profile?.org_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { priorities } = await req.json()

  // Validate shape
  if (priorities !== null && !Array.isArray(priorities)) {
    return NextResponse.json({ error: 'priorities must be an array or null' }, { status: 400 })
  }

  if (Array.isArray(priorities) && priorities.length > 7) {
    return NextResponse.json({ error: 'Maximum 7 priorities' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('organizations')
    .update({ priorities: priorities && priorities.length > 0 ? priorities : null })
    .eq('id', profile.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
