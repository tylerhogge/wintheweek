import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * PATCH /api/team/edit
 *
 * Body: { employee_id, name?, email?, team?, function?, manager_of_teams?, active? }
 *
 * Updates any editable fields on an employee record.
 * Only the org admin can do this.
 */
export async function PATCH(req: Request) {
  const body = await req.json()
  const { employee_id, ...fields } = body

  if (!employee_id) {
    return NextResponse.json({ error: 'employee_id is required' }, { status: 400 })
  }

  // Authenticate the caller
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await userClient
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }

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

  // Build update payload — only include fields that were provided
  const update: Record<string, any> = {}
  if (fields.name !== undefined) update.name = fields.name.trim()
  if (fields.email !== undefined) update.email = fields.email.trim().toLowerCase()
  if (fields.team !== undefined) update.team = fields.team.trim() || null
  if (fields.function !== undefined) update.function = fields.function.trim() || null
  if (fields.active !== undefined) update.active = fields.active
  if (fields.manager_of_teams !== undefined) {
    update.manager_of_teams = Array.isArray(fields.manager_of_teams) && fields.manager_of_teams.length > 0
      ? fields.manager_of_teams
      : null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await service
    .from('employees')
    .update(update)
    .eq('id', employee_id)

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return NextResponse.json({ error: 'This email is already on your team' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
