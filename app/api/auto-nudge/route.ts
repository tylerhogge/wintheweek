/**
 * POST /api/auto-nudge
 *
 * Called by Vercel Cron every Monday at 1pm UTC (7 AM MDT).
 * Sends a friendly nudge email to employees who haven't replied yet this week.
 * Fires first thing Monday morning before the Wall of Shame goes out at 10 AM.
 *
 * Only nudges if:
 *  - The org has auto_nudge enabled
 *  - The employee was sent a check-in this week but hasn't replied
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend, buildNudgeEmail } from '@/lib/resend'
import { getWeekStart } from '@/lib/utils'
import { verifyCronSecret } from '@/lib/auth'
import { format } from 'date-fns'

export async function POST(req: Request) {
  const authErr = verifyCronSecret(req)
  if (authErr) {
    console.error('[auto-nudge] Auth failed — CRON_SECRET mismatch or missing')
    return authErr
  }

  const supabase = createServiceClient()
  const weekStart = format(getWeekStart(), 'yyyy-MM-dd')
  console.log(`[auto-nudge] Running for week_start=${weekStart} at ${new Date().toISOString()}`)

  // Find orgs that have auto_nudge enabled
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, auto_nudge')
    .eq('auto_nudge', true)

  if (orgError) {
    console.error('[auto-nudge] Failed to query orgs:', orgError)
    return NextResponse.json({ error: 'DB error', detail: orgError.message }, { status: 500 })
  }

  console.log(`[auto-nudge] Found ${orgs?.length ?? 0} orgs with auto_nudge=true`)

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ ok: true, nudged: 0, weekStart, note: 'No orgs with auto_nudge enabled' })
  }

  const resend = getResend()
  const fromAddress = `Win The Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`
  const replyTo = process.env.REPLY_TO_EMAIL ?? 'updates@wintheweek.co'
  let nudged = 0
  const errors: string[] = []

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
    const { data: openSubmissions, error: subError } = await supabase
      .from('submissions')
      .select('id, employee_id, employees!inner(name, email, org_id, active)')
      .eq('week_start', weekStart)
      .eq('employees.org_id', org.id)
      .eq('employees.active', true)
      .not('sent_at', 'is', null)
      .is('replied_at', null)
      .is('hidden_at', null)

    if (subError) {
      console.error(`[auto-nudge] Failed to query submissions for org=${org.id}:`, subError)
      errors.push(`org=${org.id}: ${subError.message}`)
      continue
    }

    console.log(`[auto-nudge] org=${org.id} (${org.name}): ${openSubmissions?.length ?? 0} unreplied submissions`)

    if (!openSubmissions || openSubmissions.length === 0) continue

    // Batch emails in groups of 10 (like send-weekly)
    for (let i = 0; i < openSubmissions.length; i += 10) {
      const batch = openSubmissions.slice(i, i + 10)
      await Promise.all(batch.map(async (sub) => {
        const emp = (sub as any).employees
        if (!emp?.email) return

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
          errors.push(`${emp.email}: ${(error as any).message ?? error}`)
        } else {
          nudged++
          console.log(`[auto-nudge] Sent nudge to ${emp.email}`)
        }
      }))
    }
  }

  // Write audit log so this is visible in the DB
  try {
    for (const org of orgs) {
      await supabase.from('audit_logs').insert({
        action: 'cron.auto_nudge',
        actor_id: null,
        org_id: org.id,
        metadata: { weekStart, nudged, errors: errors.length > 0 ? errors : null, ran_at: new Date().toISOString() },
      })
    }
  } catch (err) {
    console.error('[auto-nudge] Failed to write audit log:', err)
  }

  const result = { ok: true, weekStart, nudged, orgs: orgs.length, errors: errors.length > 0 ? errors : undefined }
  console.log(`[auto-nudge] Complete:`, JSON.stringify(result))
  return NextResponse.json(result)
}

// Allow Vercel cron to call via GET too
export { POST as GET }
