import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export async function PATCH(req: Request) {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const body = await req.json()
  const { name } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('organizations')
    .update({ name: name.trim() })
    .eq('id', ctx.orgId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  auditLog({
    action: 'settings.org_rename',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'organization',
    metadata: { new_name: name.trim() },
  })

  return NextResponse.json({ ok: true })
}
