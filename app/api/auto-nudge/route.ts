/**
 * POST /api/auto-nudge
 *
 * Called by Vercel Cron every Saturday at 2pm UTC (~48h before Wall of Shame).
 * Sends a friendly nudge email to employees who haven't replied yet this week.
 *
 * Only nudges if:
 *  - The org has wall_of_shame enabled (they care about accountability)
 *  - The employee was sent a check-in this week but hasn't replied
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend, buildNudgeEmail } from '@/lib/resend'
import { getWeekStart } from '@/lib/utils'
import { format } from 'date-fns'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const weekStart = format(getWeekStart(), 'yyyy-MM-dd')

  // Find orgs that have auto_nudge enabled
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, auto_nudge')
    .eq('auto_nudge', true)

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ ok: true, nudged: 0, note: 'No orgs with auto_nudge enabled' })
  }

  const resend = getResend()
  const fromAddress = `Win the Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`
  const replyTo = process.env.REPLY_TO_EMAIL ?? 'updates@wintheweek.co'
  let nudged = 0

  for (const org of orgs) {
    // Get admin name to sign the nudge
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('org_id', org.id)
      .limit(1)
      .single()

    const senderName = adminProfile?.name ?? org.name

    // Find submissions sent this week that haven't been replied to
    const { data: openSubmissions } = await supabase
      .from('submissions')
      .select('id, employee_id, employees!inner(name, email, org_id, active)')
      .eq('week_start', weekStart)
      .eq('employees.org_id', org.id)
      .eq('employees.active', true)
      .not('sent_at', 'is', null)
      .is('replied_at', null)

    if (!openSubmissions || openSubmissions.length === 0) continue

    for (const sub of openSubmissions) {
      const emp = (sub as any).employees
      if (!emp?.email) continue

      const { subject, html, text } = buildNudgeEmail({
        employeeName: emp.name,
        senderName,
        replyToAddress: replyTo,
      })

      const { error } = await resend.emails.send({
        from: fromAddress,
        to: emp.email,
        replyTo,
        subject,
        html,
        text,
      })

      if (error) {
        console.error(`[auto-nudge] Failed to nudge ${emp.email}:`, error)
      } else {
        nudged++
      }
    }
  }

  console.log(`[auto-nudge] Nudged ${nudged} employees for week ${weekStart}`)
  return NextResponse.json({ ok: true, weekStart, nudged })
}

// Allow Vercel cron to call via GET too
export { POST as GET }
