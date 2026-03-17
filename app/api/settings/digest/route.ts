/**
 * PATCH /api/settings/digest
 *
 * Toggles the "email me the digest when all replies are in" preference
 * on the user's organization.
 *
 * Body: { digest_notify: boolean }
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { digest_notify } = await req.json()
  if (typeof digest_notify !== 'boolean') {
    return NextResponse.json({ error: 'digest_notify must be a boolean' }, { status: 400 })
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
    .update({ digest_notify })
    .eq('id', profile.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, digest_notify })
}
