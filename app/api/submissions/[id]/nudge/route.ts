/**
 * POST /api/submissions/[id]/nudge
 *
 * Sends a reminder to an employee who hasn't replied yet.
 * Routes to Slack DM if the employee is matched, otherwise email.
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getResend, buildNudgeEmail } from '@/lib/resend'
import { sendSlackDM, buildNudgeBlocks } from '@/lib/slack'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: submissionId } = await params

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, name, email')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const serviceSupabase = createServiceClient()

  // Fetch submission + employee — verify belongs to this org and unreplied
  const { data: submission } = await serviceSupabase
    .from('submissions')
    .select('id, replied_at, employee_id, week_start, campaigns!inner(org_id), employees(name, email, slack_user_id)')
    .eq('id', submissionId)
    .eq('campaigns.org_id', profile.org_id)
    .is('replied_at', null)
    .single()

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found or already replied' }, { status: 404 })
  }

  const employee = (submission as any).employees
  if (!employee?.email) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  const senderName = profile.name ?? profile.email.split('@')[0]

  // -- Route to Slack if matched ----------------------------------------------
  if (employee.slack_user_id) {
    const { data: integration } = await serviceSupabase
      .from('slack_integrations')
      .select('access_token')
      .eq('org_id', profile.org_id)
      .single()

    if (integration?.access_token) {
      const { blocks, fallbackText } = buildNudgeBlocks(employee.name, senderName)
      const result = await sendSlackDM(integration.access_token, employee.slack_user_id, blocks, fallbackText)
      if (result.ok) return NextResponse.json({ ok: true, via: 'slack' })
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

  return NextResponse.json({ ok: true, via: 'email' })
}
