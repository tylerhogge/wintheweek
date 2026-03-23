import { NextResponse } from 'next/server'
import { getProfile, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const profile = await getProfile()
  if (!profile?.org_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { shame_enabled, shame_channel_id, shame_channel_name, shame_email_enabled, auto_nudge } = body

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('organizations')
    .update({
      shame_enabled: shame_enabled ?? false,
      shame_channel_id: shame_channel_id ?? null,
      shame_channel_name: shame_channel_name ?? null,
      shame_email_enabled: shame_email_enabled ?? false,
      auto_nudge: auto_nudge ?? false,
    })
    .eq('id', profile.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
