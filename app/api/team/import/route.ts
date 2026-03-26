import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend, buildWelcomeEmail } from '@/lib/resend'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { checkRateLimit, rateLimitKeyFromUser } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const { members } = await req.json()

  if (!Array.isArray(members) || members.length === 0) {
    return NextResponse.json({ error: 'No members provided' }, { status: 400 })
  }

  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  // Rate limit: 10 imports per minute
  const rl = checkRateLimit(rateLimitKeyFromUser(ctx.userId, 'team-import'), { limit: 10, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const supabase = createServiceClient()

  // Fetch org name for welcome emails
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', ctx.orgId)
    .single()

  const rows = members
    .filter((m: any) => m.name?.trim() && m.email?.trim())
    .map((m: any) => ({
      org_id: ctx.orgId,
      name: m.name.trim(),
      email: m.email.trim().toLowerCase(),
      team: m.team?.trim() || null,
      function: m.function?.trim() || null,
      active: true,
    }))

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid rows found (name and email required)' }, { status: 400 })
  }

  // Find which emails already exist so we only welcome truly new members
  const importEmails = rows.map((r: any) => r.email)
  const { data: existing } = await supabase
    .from('employees')
    .select('email')
    .eq('org_id', ctx.orgId)
    .in('email', importEmails)

  const existingEmails = new Set((existing ?? []).map((e: any) => e.email))
  const newRows = rows.filter((r: any) => !existingEmails.has(r.email))

  // upsert — skip duplicates by email within the org
  const { error } = await supabase
    .from('employees')
    .upsert(rows, { onConflict: 'org_id,email', ignoreDuplicates: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  auditLog({
    action: 'employee.import',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    metadata: { total: rows.length, new: newRows.length },
  })

  // Send welcome emails to newly added members (non-blocking)
  if (newRows.length > 0) {
    const orgName = org?.name ?? 'Your team'

    const emailPromises = newRows.map(async (row: any) => {
      try {
        const { subject, html, text } = buildWelcomeEmail({
          employeeName: row.name,
          adminName: ctx.name,
          orgName,
        })
        await getResend().emails.send({
          from: `${process.env.FROM_NAME ?? 'Win the Week'} <${process.env.FROM_EMAIL ?? 'updates@wintheweek.co'}>`,
          to: row.email,
          subject,
          html,
          text,
        })
      } catch (emailErr) {
        console.error(`Welcome email failed for ${row.email} (non-fatal):`, emailErr)
      }
    })

    // Fire all in parallel, don't await (don't block the response)
    Promise.all(emailPromises).catch(() => {})
  }

  return NextResponse.json({ ok: true, imported: rows.length, welcomed: newRows.length })
}
