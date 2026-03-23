/**
 * POST /api/responses/[id]/like
 *
 * Toggles the like on a response. If already liked, removes it. If not liked, sets liked_at.
 * Auth: must be an authenticated user in the same org as the submission.
 */

import { NextResponse } from 'next/server'
import { createClient, getProfile } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  // Auth check
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Org ownership check — RLS covers this too, but explicit check gives a clear 404
  const profile = await getProfile()
  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 403 })

  // Fetch response and verify it belongs to this org via submission → campaign chain
  const { data: response, error: fetchErr } = await supabase
    .from('responses')
    .select('id, liked_at, submission:submissions!inner(campaign:campaigns!inner(org_id))')
    .eq('id', id)
    .single()

  if (fetchErr || !response) {
    return NextResponse.json({ error: 'Response not found' }, { status: 404 })
  }

  // Explicit org check (belt + suspenders with RLS)
  const orgId = (response as any).submission?.campaign?.org_id
  if (orgId !== profile.org_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const newLikedAt = response.liked_at ? null : new Date().toISOString()

  const { error: updateErr } = await supabase
    .from('responses')
    .update({ liked_at: newLikedAt })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ liked: newLikedAt !== null, liked_at: newLikedAt })
}
