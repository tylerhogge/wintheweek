/**
 * POST /api/insights/generate
 *
 * Generates (or regenerates) an AI weekly summary for a given org + week.
 * Called automatically after each inbound reply, and on-demand from the dashboard.
 *
 * Body: { org_id: string, week_start: string }
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateWeeklyInsight } from '@/lib/anthropic'
import { formatWeekRange } from '@/lib/utils'
import { verifyCronSecret } from '@/lib/auth'

export async function POST(req: Request) {
  const authErr = verifyCronSecret(req)
  if (authErr) return authErr

  const { org_id, week_start } = await req.json()
  if (!org_id || !week_start) {
    return NextResponse.json({ error: 'org_id and week_start required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch org name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', org_id)
    .single()

  // Fetch all cleaned responses for this week
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      week_start,
      employees(name, team),
      responses(body_clean)
    `)
    .eq('week_start', week_start)
    .eq('employees.org_id', org_id)
    .not('responses', 'is', null)

  if (!submissions || submissions.length === 0) {
    return NextResponse.json({ ok: true, note: 'No replies to summarize yet' })
  }

  // Shape the data for the AI prompt
  const replies = (submissions as unknown as { employees: { name: string; team: string | null } | null; responses: { body_clean: string } | null }[])
    .map((s: { employees: { name: string; team: string | null } | null; responses: { body_clean: string } | null }) => ({
      name: s.employees?.name ?? 'Unknown',
      team: s.employees?.team ?? null,
      body: s.responses?.body_clean ?? '',
    }))
    .filter((r: { body: string }): boolean => r.body.trim().length > 0)

  if (replies.length === 0) {
    return NextResponse.json({ ok: true, note: 'No clean reply bodies to summarize' })
  }

  const weekLabel = formatWeekRange(week_start)

  let insight: { summary: string; highlights: string[] }
  try {
    insight = await generateWeeklyInsight(org?.name ?? 'the org', weekLabel, replies)
  } catch (err) {
    console.error('AI insight generation failed', err)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }

  // Upsert the insight
  const { error } = await supabase.from('insights').upsert(
    {
      org_id,
      week_start,
      summary: insight.summary,
      highlights: insight.highlights,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,week_start' },
  )

  if (error) {
    console.error('Failed to store insight', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, insight })
}
