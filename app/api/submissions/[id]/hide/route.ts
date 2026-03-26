import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

/**
 * PATCH /api/submissions/:id/hide
 *
 * Soft-deletes an entire submission (whether or not it has a response).
 * Sets hidden_at on the submission itself. Dashboard filters these out.
 * Requires admin role.
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [auth, { id }] = await Promise.all([requireRole('admin'), params])
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const supabase = createServiceClient()

  // Verify the submission belongs to this org (via campaign → org)
  const { data: submission, error: lookupErr } = await supabase
    .from('submissions')
    .select('id, campaign_id, campaigns!inner(org_id)')
    .eq('id', id)
    .single()

  if (lookupErr || !submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  const orgId = (submission as any)?.campaigns?.org_id
  if (orgId !== ctx.orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Soft-delete the submission
  const { error } = await supabase
    .from('submissions')
    .update({ hidden_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[hide submission] update failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  auditLog({
    action: 'response.hide',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'submission',
    targetId: id,
  })

  return NextResponse.json({ ok: true })
}
