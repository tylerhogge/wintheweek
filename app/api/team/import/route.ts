import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getResend, buildWelcomeEmail } from '@/lib/resend'

export async function POST(req: Request) {
  const { members } = await req.json()

  if (!Array.isArray(members) || members.length === 0) {
    return NextResponse.json({ error: 'No members provided' }, { status: 400 })
  }

  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await userClient
    .from('profiles')
    .select('org_id, name')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization found' }, { status: 400 })
  }

  // Fetch org name for welcome emails
  const { data: org } = await userClient
    .from('organizations')
    .select('name')
    .eq('id', profile.org_id)
    .single()

  const supabase = createServiceClient()

  const rows = members
    .filter((m: any) => m.name?.trim() && m.email?.trim())
    .map((m: any) => ({
      org_id: profile.org_id,
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
    .eq('org_id', profile.org_id)
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

  // Send welcome emails to newly added members (non-blocking)
  if (newRows.length > 0) {
    const orgName = org?.name ?? 'Your team'
    const adminName = profile.name ?? null

    const emailPromises = newRows.map(async (row: any) => {
      try {
        const { subject, html, text } = buildWelcomeEmail({
          employeeName: row.name,
          adminName,
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
