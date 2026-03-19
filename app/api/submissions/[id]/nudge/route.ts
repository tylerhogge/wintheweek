/**
 * POST /api/submissions/[id]/nudge
 *
 * Sends a reminder email to an employee who hasn't replied yet.
 * Only works if the submission has no reply.
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getResend, buildNudgeEmail } from '@/lib/resend'

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

  // Fetch submission + employee, verify it belongs to this org and hasn't been replied to
  const { data: submission } = await serviceSupabase
    .from('submissions')
    .select('id, replied_at, employee_id, week_start, campaigns!inner(org_id), employees(name, email)')
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
  const replyTo = process.env.REPLY_TO_EMAIL ?? 'updates@wintheweek.co'

  const emailContent = buildNudgeEmail({
    employeeName: employee.name,
    senderName,
    replyToAddress: replyTo,
  })

  const resend = getResend()
  const { error } = await resend.emails.send({
    from: `${senderName} <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`,
    to: employee.email,
    replyTo,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  })

  if (error) {
    console.error('[nudge] Failed to send', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
