/**
 * POST /api/email-briefing
 *
 * Called by Vercel Cron every Monday at 5 PM MDT (23:00 UTC).
 * For each org with digest_notify enabled:
 *   1. Finds the latest week with sent check-ins
 *   2. Generates (or re-generates) the AI insight if needed
 *   3. Emails the CEO briefing + all replies to the admin
 *
 * Replaces the old "fire when everyone replies" trigger.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getResend, buildDigestEmail } from '@/lib/resend'
import { generateWeeklyInsight, type PriorWeekContext } from '@/lib/anthropic'
import { formatWeekRange } from '@/lib/utils'
import { verifyCronSecret } from '@/lib/auth'

export const maxDuration = 60

export async function POST(req: Request) {
  const authErr = verifyCronSecret(req)
  if (authErr) return authErr

  const supabase = createServiceClient()
  const results: { org: string; status: string }[] = []

  // Load all orgs that want the weekly briefing email
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, digest_notify, priorities, briefing_last_emailed_week')
    .eq('digest_notify', true)

  for (const org of orgs ?? []) {
    try {
      // ── Find the most recent week with sent check-ins ──────────────────
      const { data: latestSub } = await supabase
        .from('submissions')
        .select('week_start, employees!inner(org_id)')
        .eq('employees.org_id', org.id)
        .not('sent_at', 'is', null)
        .order('week_start', { ascending: false })
        .limit(1)
        .single()

      if (!latestSub) {
        results.push({ org: org.name, status: 'skipped — no submissions found' })
        continue
      }

      const weekStart = (latestSub as any).week_start as string

      // Prevent double-emailing for the same week
      if ((org as any).briefing_last_emailed_week === weekStart) {
        results.push({ org: org.name, status: `skipped — already emailed for ${weekStart}` })
        continue
      }

      // ── Fetch replies for this week ────────────────────────────────────
      const { data: submissions } = await supabase
        .from('submissions')
        .select('employees(name, team), responses(body_clean, hidden_at)')
        .eq('week_start', weekStart)
        .eq('employees.org_id', org.id)
        .not('responses', 'is', null)

      const replies = ((submissions ?? []) as any[])
        .filter((s: any) => !s.responses?.hidden_at)
        .map((s: any) => ({
          name: s.employees?.name ?? 'Unknown',
          team: s.employees?.team ?? null,
          body: s.responses?.body_clean ?? '',
        }))
        .filter((r: any) => r.body.trim().length > 0)

      if (replies.length === 0) {
        results.push({ org: org.name, status: 'skipped — no replies yet' })
        continue
      }

      // ── Ensure insight exists (generate if missing) ────────────────────
      let { data: insight } = await supabase
        .from('insights')
        .select('id, summary, highlights, cross_functional_themes, risk_items, bottom_line, initiative_tracking, sentiment_score, sentiment_label, themes')
        .eq('org_id', org.id)
        .eq('week_start', weekStart)
        .maybeSingle()

      if (!insight?.summary) {
        // Generate the insight now
        const weekLabel = formatWeekRange(weekStart)

        // Fetch prior week for comparison
        const priorDate = new Date(weekStart + 'T00:00:00Z')
        priorDate.setUTCDate(priorDate.getUTCDate() - 7)
        const priorWeekStart = priorDate.toISOString().slice(0, 10)

        const { data: priorInsight } = await supabase
          .from('insights')
          .select('summary, highlights, sentiment_score, sentiment_label, themes, bottom_line')
          .eq('org_id', org.id)
          .eq('week_start', priorWeekStart)
          .single()

        const priorWeek: PriorWeekContext | null = priorInsight ? {
          ...priorInsight,
          week_label: formatWeekRange(priorWeekStart),
        } : null

        try {
          const generated = await generateWeeklyInsight(
            org.name,
            weekLabel,
            replies,
            org.priorities as any,
            priorWeek,
          )

          // Upsert the insight
          await supabase.from('insights').upsert(
            {
              org_id: org.id,
              week_start: weekStart,
              summary: generated.summary,
              highlights: generated.highlights,
              cross_functional_themes: generated.cross_functional_themes,
              risk_items: generated.risk_items,
              bottom_line: generated.bottom_line,
              initiative_tracking: generated.initiative_tracking,
              sentiment_score: generated.sentiment_score,
              sentiment_label: generated.sentiment_label,
              themes: generated.themes,
              generated_at: new Date().toISOString(),
            },
            { onConflict: 'org_id,week_start' },
          )

          insight = generated as any
        } catch (err) {
          console.error(`[email-briefing] AI generation failed for ${org.name}:`, err)
          // Still send email without AI summary
        }
      }

      // ── Get admin email ────────────────────────────────────────────────
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('org_id', org.id)
        .eq('role', 'admin')
        .limit(1)
        .single()

      if (!adminProfile?.email) {
        results.push({ org: org.name, status: 'skipped — no admin email' })
        continue
      }

      // ── Build and send the email ───────────────────────────────────────
      const weekLabel = formatWeekRange(weekStart)
      const appUrl = 'https://www.wintheweek.co'

      const email = buildDigestEmail({
        orgName: org.name,
        weekLabel,
        summary: insight?.summary ?? null,
        highlights: (insight?.highlights as string[] | null) ?? null,
        replies,
        dashboardUrl: `${appUrl}/dashboard?week=${weekStart}`,
        bottomLine: insight?.bottom_line ?? null,
        crossFunctionalThemes: insight?.cross_functional_themes ?? null,
        riskItems: insight?.risk_items ?? null,
        initiativeTracking: insight?.initiative_tracking ?? null,
        sentimentScore: insight?.sentiment_score ?? null,
        sentimentLabel: insight?.sentiment_label ?? null,
        themes: (insight?.themes as string[] | null) ?? null,
        replyToAddress: 'updates@wintheweek.co',
      })

      await getResend().emails.send({
        from: `Win The Week <${process.env.FROM_EMAIL ?? 'hello@wintheweek.co'}>`,
        to: adminProfile.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      })

      // ── Mark this week as emailed ──────────────────────────────────────
      await supabase
        .from('organizations')
        .update({ briefing_last_emailed_week: weekStart })
        .eq('id', org.id)

      results.push({ org: org.name, status: `emailed to ${adminProfile.email} — ${replies.length} replies` })

    } catch (err) {
      console.error(`[email-briefing] Error for org ${org.name}:`, err)
      results.push({ org: org.name, status: `error: ${String(err)}` })
    }
  }

  console.log('[email-briefing] complete:', results)
  return NextResponse.json({ ok: true, results })
}

// Allow Vercel cron to call via GET too
export { POST as GET }
