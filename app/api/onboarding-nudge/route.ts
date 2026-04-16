/**
 * POST /api/onboarding-nudge
 *
 * Called by Vercel Cron daily at 15:00 UTC (9 AM MDT).
 * Sends a single nudge email to admins who signed up 48+ hours ago
 * but haven't finished onboarding (no employees added OR no campaign created).
 *
 * Only sends once per profile — tracks via `onboarding_nudge_sent_at` on profiles.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend, buildOnboardingNudgeEmail } from '@/lib/resend'
import { verifyCronSecret } from '@/lib/auth'

export const maxDuration = 60

export async function POST(req: Request) {
  const authErr = verifyCronSecret(req)
  if (authErr) return authErr

  const supabase = createServiceClient()
  const resend = getResend()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://wintheweek.co'

  // Find profiles where:
  // - signed up 48+ hours ago
  // - haven't been sent an onboarding nudge yet
  // - role is admin (they're the ones who set up the org)
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, name, org_id')
    .eq('role', 'admin')
    .is('onboarding_nudge_sent_at', null)
    .lt('created_at', cutoff)

  if (profileErr) {
    console.error('[onboarding-nudge] Failed to query profiles:', profileErr)
    return NextResponse.json({ error: 'DB error', detail: profileErr.message }, { status: 500 })
  }

  if (!profiles || profiles.length === 0) {
    console.log('[onboarding-nudge] No stalled signups found')
    return NextResponse.json({ ok: true, nudged: 0 })
  }

  console.log(`[onboarding-nudge] Found ${profiles.length} profiles to check`)

  let nudged = 0
  let skipped = 0
  const fromAddress = `Win The Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`

  for (const profile of profiles) {
    // Check if this org has employees or campaigns — if so, they're past onboarding
    const [{ count: empCount }, { count: campCount }] = await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id).eq('active', true),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('org_id', profile.org_id),
    ])

    const hasEmployees = (empCount ?? 0) > 0
    const hasCampaign = (campCount ?? 0) > 0

    if (hasEmployees && hasCampaign) {
      // They finished onboarding — mark as sent so we don't check again
      await supabase
        .from('profiles')
        .update({ onboarding_nudge_sent_at: new Date().toISOString() })
        .eq('id', profile.id)
      skipped++
      continue
    }

    // Build and send the nudge email
    const { subject, html, text } = buildOnboardingNudgeEmail({
      adminName: profile.name,
      appUrl,
    })

    try {
      await resend.emails.send({
        from: fromAddress,
        to: profile.email,
        subject,
        html,
        text,
      })

      // Mark as sent
      await supabase
        .from('profiles')
        .update({ onboarding_nudge_sent_at: new Date().toISOString() })
        .eq('id', profile.id)

      nudged++
      console.log(`[onboarding-nudge] Sent to ${profile.email}`)
    } catch (err) {
      console.error(`[onboarding-nudge] Failed to send to ${profile.email}:`, err)
    }
  }

  console.log(`[onboarding-nudge] Done: ${nudged} nudged, ${skipped} skipped (already onboarded)`)
  return NextResponse.json({ ok: true, nudged, skipped })
}

// Vercel Cron calls GET by default
export async function GET(req: Request) {
  return POST(req)
}
