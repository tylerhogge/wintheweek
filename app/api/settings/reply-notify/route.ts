/**
 * PATCH /api/settings/reply-notify
 *
 * Toggles the "notify me when each person replies" preference.
 * Requires admin role.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export async function PATCH(req: Request) {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const { notify_on_reply } = await req.json()
  if (typeof notify_on_reply !== 'boolean') {
    return NextResponse.json({ error: 'notify_on_reply must be a boolean' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('organizations')
    .update({ notify_on_reply })
    .eq('id', ctx.orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  auditLog({
    action: 'settings.update',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'settings',
    metadata: { notify_on_reply },
  })

  return NextResponse.json({ ok: true, notify_on_reply })
}
