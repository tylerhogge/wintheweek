/**
 * PATCH /api/settings/reply-notify
 *
 * Toggles the "notify me when each person replies" preference
 * on the user's organization.
 *
 * Body: { notify_on_reply: boolean }
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { notify_on_reply } = await req.json()
  if (typeof notify_on_reply !== 'boolean') {
    return NextResponse.json({ error: 'notify_on_reply must be a boolean' }, { status: 400 })
  }

  // Look up the user's org
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No org found' }, { status: 404 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('organizations')
    .update({ notify_on_reply })
    .eq('id', profile.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, notify_on_reply })
}
