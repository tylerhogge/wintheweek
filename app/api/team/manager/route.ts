import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

/**
 * PATCH /api/team/manager
 *
 * Body: { employee_id: string, manager_of_teams: string[] | null }
 * Requires admin role.
 */
export async function PATCH(req: Request) {
  const { employee_id, manager_of_teams } = await req.json()

  if (!employee_id) {
    return NextResponse.json({ error: 'employee_id is required' }, { status: 400 })
  }

  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const service = createServiceClient()

  // Verify the employee belongs to this org
  const { data: employee } = await service
    .from('employees')
    .select('id, org_id')
    .eq('id', employee_id)
    .single()

  if (!employee || employee.org_id !== ctx.orgId) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  const { error } = await service
    .from('employees')
    .update({ manager_of_teams: manager_of_teams ?? null })
    .eq('id', employee_id)

  if (error) {
    console.error('Failed to update manager_of_teams', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  auditLog({
    action: 'employee.update',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'employee',
    targetId: employee_id,
    metadata: { manager_of_teams },
  })

  return NextResponse.json({ ok: true })
}
