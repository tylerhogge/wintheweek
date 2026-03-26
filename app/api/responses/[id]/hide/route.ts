import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

/**
 * PATCH /api/responses/:id/hide
 *
 * Soft-deletes a response by setting hidden_at. The response is excluded
 * from the dashboard and AI insight generation but stays in the database.
 * Requires admin role.
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [auth, { id }] = await Promise.all([requireRole('admin'), params])
  if ('error' in auth) return auth.error
  const { ctx } = auth

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
  if (orgId !== ctx.orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Soft-delete the response
  const { error } = await supabase
    .from('responses')
    .update({ hidden_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[hide response] update failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Clear replied_at on the submission so stats show "pending" and nudge works
  await supabase
    .from('submissions')
    .update({ replied_at: null })
    .eq('id', response.submission_id)

  auditLog({
    action: 'response.hide',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'response',
    targetId: id,
    metadata: { submission_id: response.submission_id },
  })

  return NextResponse.json({ ok: true })
}
