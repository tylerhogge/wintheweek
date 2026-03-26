import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export async function PUT(req: Request) {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const { priorities } = await req.json()

  // Validate shape
  if (priorities !== null && !Array.isArray(priorities)) {
    return NextResponse.json({ error: 'priorities must be an array or null' }, { status: 400 })
  }

  if (Array.isArray(priorities) && priorities.length > 7) {
    return NextResponse.json({ error: 'Maximum 7 priorities' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('organizations')
    .update({ priorities: priorities && priorities.length > 0 ? priorities : null })
    .eq('id', ctx.orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  auditLog({
    action: 'settings.priorities',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'settings',
    metadata: { count: priorities?.length ?? 0 },
  })

  return NextResponse.json({ ok: true })
}
