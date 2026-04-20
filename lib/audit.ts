/**
 * Audit logging for security-sensitive operations.
 *
 * Writes to the `audit_logs` table via the service client.
 * Non-blocking — failures are logged to console but never break the request.
 */

import { createServiceClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'employee.create'
  | 'employee.update'
  | 'employee.import'
  | 'employee.deactivate'
  | 'response.hide'
  | 'submission.nudge'
  | 'settings.update'
  | 'settings.org_rename'
  | 'settings.priorities'
  | 'slack.connect'
  | 'slack.disconnect'
  | 'slack.sync'
  | 'slack.import'
  | 'campaign.send_test'
  | 'insight.generate'
  | 'data.export'
  | 'data.delete'
  | 'cron.auto_nudge'
  | 'cron.wall_of_shame'
  | 'cron.send_weekly'

export async function auditLog({
  action,
  actorId,
  orgId,
  targetType,
  targetId,
  metadata,
}: {
  action: AuditAction
  actorId: string
  orgId: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('audit_logs').insert({
      action,
      actor_id: actorId,
      org_id: orgId,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      metadata: metadata ?? null,
      ip_address: null, // Could be populated from request headers
    })
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err)
  }
}
