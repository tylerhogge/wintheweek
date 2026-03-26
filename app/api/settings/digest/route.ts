/**
 * PATCH /api/settings/digest
 *
 * Toggles the "email me the digest when all replies are in" preference.
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

  const { digest_notify } = await req.json()
  if (typeof digest_notify !== 'boolean') {
    return NextResponse.json({ error: 'digest_notify must be a boolean' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('organizations')
    .update({ digest_notify })
    .eq('id', ctx.orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  auditLog({
    action: 'settings.update',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'settings',
    metadata: { digest_notify },
  })

  return NextResponse.json({ ok: true, digest_notify })
}
