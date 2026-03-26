/**
 * DELETE /api/admin/delete-employee
 *
 * GDPR "right to erasure" — permanently deletes an employee and all
 * associated data (submissions, responses, manager replies) via CASCADE.
 *
 * Body: { employee_id: string }
 * Requires admin role.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export async function DELETE(req: Request) {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error

  const { ctx } = auth
  const { employee_id } = await req.json()

  if (!employee_id) {
    return NextResponse.json({ error: 'employee_id required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify the employee belongs to this org
  const { data: employee } = await supabase
    .from('employees')
    .select('id, org_id, name, email')
    .eq('id', employee_id)
    .single()

  if (!employee || employee.org_id !== ctx.orgId) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  // Delete — CASCADE handles submissions, responses, manager_replies
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', employee_id)

  if (error) {
    console.error('[GDPR delete] Failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit the deletion (capture metadata since the record is gone)
  auditLog({
    action: 'data.delete',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'employee',
    targetId: employee_id,
    metadata: { deleted_name: employee.name, deleted_email: employee.email },
  })

  return NextResponse.json({ ok: true, deleted: employee_id })
}
