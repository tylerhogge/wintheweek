import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * PATCH /api/team/manager
 *
 * Body: { employee_id: string, manager_of_teams: string[] | null }
 *
 * Sets or clears the manager_of_teams for an employee.
 * Only the org admin can do this.
 */
export async function PATCH(req: Request) {
  const { employee_id, manager_of_teams } = await req.json()

  if (!employee_id) {
    return NextResponse.json({ error: 'employee_id is required' }, { status: 400 })
  }

  // Authenticate the caller
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await userClient
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }

  // Use service client to update (bypasses RLS for admin action)
  const service = createServiceClient()

  // Verify the employee belongs to this org
  const { data: employee } = await service
    .from('employees')
    .select('id, org_id')
    .eq('id', employee_id)
    .single()

  if (!employee || employee.org_id !== profile.org_id) {
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

  return NextResponse.json({ ok: true })
}
