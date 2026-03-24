/**
 * POST /api/insights/generate-now
 *
 * User-facing version of insight generation. Auth via Supabase session
 * (no CRON_SECRET needed). Auto-resolves org_id from the authenticated user.
 *
 * Body: { week_start: string }
 */

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateWeeklyInsight } from '@/lib/anthropic'
import { formatWeekRange } from '@/lib/utils'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { week_start } = await req.json()
  if (!week_start) return NextResponse.json({ error: 'week_start required' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', session.user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'No org found' }, { status: 404 })

  const service = createServiceClient()
  const orgId = profile.org_id

  const { data: org } = await service
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()

  const { data: submissions } = await service
    .from('submissions')
    .select('employees(name, team), responses(body_clean)')
    .eq('week_start', week_start)
    .eq('employees.org_id', orgId)
    .not('responses', 'is', null)

  const replies = ((submissions ?? []) as any[])
    .map((s: any) => ({
      name: s.employees?.name ?? 'Unknown',
      team: s.employees?.team ?? null,
      body: s.responses?.body_clean ?? '',
    }))
    .filter((r: any) => r.body.trim().length > 0)

  if (replies.length === 0) {
    return NextResponse.json({ error: 'No replies to summarize yet' }, { status: 400 })
  }

  const weekLabel = formatWeekRange(week_start)
  let insight: { summary: string; highlights: string[]; cross_functional_themes: string | null; risk_items: string | null; bottom_line: string | null }

  try {
    insight = await generateWeeklyInsight(org?.name ?? 'the org', weekLabel, replies)
  } catch (err: any) {
    console.error('AI generation failed', err)
    return NextResponse.json({
      error: 'AI generation failed',
      detail: err?.message ?? String(err),
    }, { status: 500 })
  }

  const { error } = await service.from('insights').upsert(
    {
      org_id: orgId,
      week_start,
      summary: insight.summary,
      highlights: insight.highlights,
      cross_functional_themes: insight.cross_functional_themes,
      risk_items: insight.risk_items,
      bottom_line: insight.bottom_line,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,week_start' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, insight })
}
