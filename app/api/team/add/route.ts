import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend, buildWelcomeEmail } from '@/lib/resend'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { checkRateLimit, rateLimitKeyFromUser } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const { name, email, team, function: fn, manager_of_teams } = await req.json()

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  // Require admin role
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  // Rate limit: 60 adds per minute per user
  const rl = checkRateLimit(rateLimitKeyFromUser(ctx.userId, 'team-add'), { limit: 60, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Fetch org name for the welcome email
  const supabase = createServiceClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', ctx.orgId)
    .single()

  const { data: inserted, error } = await supabase.from('employees').insert({
    org_id: ctx.orgId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    team: team?.trim() || null,
    function: fn?.trim() || null,
    active: true,
    manager_of_teams: Array.isArray(manager_of_teams) && manager_of_teams.length > 0 ? manager_of_teams : null,
  }).select('id').single()

  if (error) {
    if (error.message.includes('duplicate') || error.code === '23505') {
      return NextResponse.json({ error: 'This email is already on your team' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log
  auditLog({
    action: 'employee.create',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    targetType: 'employee',
    targetId: inserted?.id,
    metadata: { name: name.trim(), email: email.trim().toLowerCase(), team: team?.trim() || null },
  })

  // Send welcome email (non-blocking — don't fail the request if email fails)
  try {
    const { subject, html, text } = buildWelcomeEmail({
      employeeName: name.trim(),
      adminName: ctx.name,
      orgName: org?.name ?? 'Your team',
    })

    await getResend().emails.send({
      from: `${process.env.FROM_NAME ?? 'Win the Week'} <${process.env.FROM_EMAIL ?? 'updates@wintheweek.co'}>`,
      to: email.trim().toLowerCase(),
      subject,
      html,
      text,
    })
  } catch (emailErr) {
    console.error('Welcome email failed (non-fatal):', emailErr)
  }

  return NextResponse.json({ ok: true })
}
