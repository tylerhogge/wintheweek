/**
 * POST /api/submissions/[id]/nudge
 *
 * Sends a reminder to an employee who hasn't replied yet.
 * Routes to Slack DM if the employee is matched, otherwise email.
 * Requires admin role.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend, buildNudgeEmail } from '@/lib/resend'
import { sendSlackDM, buildNudgeBlocks } from '@/lib/slack'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { checkRateLimit, rateLimitKeyFromUser } from '@/lib/rate-limit'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [auth, { id: submissionId }] = await Promise.all([requireRole('admin'), params])
  if ('error' in auth) return auth.error
  const { ctx } = auth

  // Rate limit: 30 nudges per minute per user
  const rl = checkRateLimit(rateLimitKeyFromUser(ctx.userId, 'nudge'), { limit: 30, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const serviceSupabase = createServiceClient()

  // Fetch submission + employee — verify belongs to this org and unreplied
  const { data: submission } = await serviceSupabase
    .from('submissions')
    .select('id, replied_at, employee_id, week_start, campaigns!inner(org_id), employees(name, email, slack_user_id)')
    .eq('id', submissionId)
    .eq('campaigns.org_id', ctx.orgId)
    .is('replied_at', null)
    .single()

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found or already replied' }, { status: 404 })
  }

  const employee = (submission as any).employees
  if (!employee?.email) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  const senderName = ctx.name ?? ctx.email.split('@')[0]

  // -- Route to Slack if matched ----------------------------------------------
  if (employee.slack_user_id) {
    const { data: integration } = await serviceSupabase
      .from('slack_integrations')
      .select('access_token')
      .eq('org_id', ctx.orgId)
      .single()

    if (integration?.access_token) {
      const { blocks, fallbackText } = buildNudgeBlocks(employee.name, senderName)
      const result = await sendSlackDM(integration.access_token, employee.slack_user_id, blocks, fallbackText)
      if (result.ok) {
        auditLog({
          action: 'submission.nudge',
          actorId: ctx.userId,
          orgId: ctx.orgId,
          targetType: 'submission',
          targetId: submissionId,
          metadata: { via: 'slack', employee_email: employee.email },
        })
        return NextResponse.json({ ok: true, via: 'slack' })
      }
      console.warn('[nudge] Slack DM failed, falling back to email:', result.error)
    }
  }

  // -- Email fallback ---------------------------------------------------------
  const replyTo = process.env.REPLY_TO_EMAIL ?? 'updates@wintheweek.co'
  const emailContent = buildNudgeEmail({ employeeName: employee.name, senderName, replyToAddress: replyTo })

  const { error } = await getResend().emails.send({
    from: `${senderName} <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`,
    to: employee.email,
    replyTo,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  })

  if (error) {
    console.error('[nudge] Failed to send email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  auditLog({
    action: 'submission.nudge',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'submission',
    targetId: submissionId,
    metadata: { via: 'email', employee_email: employee.email },
  })

  return NextResponse.json({ ok: true, via: 'email' })
}
