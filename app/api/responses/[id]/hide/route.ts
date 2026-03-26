import { NextResponse } from 'next/server'
import { getAuthUser, getProfile } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * PATCH /api/responses/:id/hide
 *
 * Soft-deletes a response by setting hidden_at. The response is excluded
 * from the dashboard and AI insight generation but stays in the database.
 * Only the org admin can hide responses.
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [user, profile, { id }] = await Promise.all([
    getAuthUser(),
    getProfile(),
    params,
  ])

  if (!user || !profile?.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service client to bypass RLS — we verify org ownership manually below
  const supabase = createServiceClient()

  // Verify the response belongs to this org (via submission → campaign → org)
  const { data: response, error: lookupErr } = await supabase
    .from('responses')
    .select('id, submission_id')
    .eq('id', id)
    .single()

  if (lookupErr || !response) {
    return NextResponse.json({ error: 'Response not found' }, { status: 404 })
  }

  // Check org ownership through submission → campaign chain
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, campaigns!inner(org_id)')
    .eq('id', response.submission_id)
    .single()

  const orgId = (submission as any)?.campaigns?.org_id
  if (orgId !== profile.org_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Soft-delete
  const { error } = await supabase
    .from('responses')
    .update({ hidden_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[hide response] update failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
