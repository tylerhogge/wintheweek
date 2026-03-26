import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export async function PATCH(req: Request) {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const body = await req.json()
  const { shame_enabled, shame_channel_id, shame_channel_name, shame_email_enabled, auto_nudge } = body

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('organizations')
    .update({
      shame_enabled: shame_enabled ?? false,
      shame_channel_id: shame_channel_id ?? null,
      shame_channel_name: shame_channel_name ?? null,
      shame_email_enabled: shame_email_enabled ?? false,
      auto_nudge: auto_nudge ?? false,
    })
    .eq('id', ctx.orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  auditLog({
    action: 'settings.update',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'settings',
    metadata: { shame_enabled, auto_nudge },
  })

  return NextResponse.json({ ok: true })
}
