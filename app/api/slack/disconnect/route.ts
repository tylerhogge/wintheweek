/**
 * POST /api/slack/disconnect
 * Removes the Slack integration for the current user's org,
 * and clears all employee slack_user_id values.
 * Requires admin role.
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export async function POST() {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const supabase = createServiceClient()

  // Delete the integration
  await supabase.from('slack_integrations').delete().eq('org_id', ctx.orgId)

  // Clear Slack user IDs from all employees in the org
  await supabase
    .from('employees')
    .update({ slack_user_id: null })
    .eq('org_id', ctx.orgId)

  auditLog({
    action: 'slack.disconnect',
    actorId: ctx.userId,
    orgId: ctx.orgId,
  })

  return NextResponse.json({ ok: true })
}
