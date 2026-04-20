/**
 * PATCH /api/settings/delivery
 * Updates the org's default check-in delivery method ('email' or 'slack').
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export async function PATCH(req: Request) {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const { default_delivery } = await req.json()

  if (default_delivery !== 'email' && default_delivery !== 'slack') {
    return NextResponse.json({ error: 'Invalid delivery method' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('organizations')
    .update({ default_delivery })
    .eq('id', ctx.orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  auditLog({
    action: 'settings.update',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'organization',
    metadata: { field: 'default_delivery', value: default_delivery },
  })

  return NextResponse.json({ ok: true })
}
