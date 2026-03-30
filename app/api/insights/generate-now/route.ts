/**
 * POST /api/insights/generate-now
 *
 * User-facing version of insight generation. Auth via Supabase session.
 * Requires admin role.
 *
 * Body: { week_start: string }
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateWeeklyInsight, type PriorWeekContext } from '@/lib/anthropic'
import { formatWeekRange } from '@/lib/utils'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { checkRateLimit, rateLimitKeyFromUser } from '@/lib/rate-limit'

// AI generation via Claude can take 15-30s — extend Vercel's default 10s timeout
export const maxDuration = 60

export async function POST(req: Request) {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  // Rate limit: 10 generations per hour
  const rl = checkRateLimit(rateLimitKeyFromUser(ctx.userId, 'insight-gen'), { limit: 10, windowSeconds: 3600 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 })
  }

  const { week_start } = await req.json()
  if (!week_start) return NextResponse.json({ error: 'week_start required' }, { status: 400 })

  const service = createServiceClient()
  const orgId = ctx.orgId

  // Fetch prior week date upfront for the query
  const priorDate = new Date(week_start + 'T00:00:00Z')
  priorDate.setUTCDate(priorDate.getUTCDate() - 7)
  const priorWeekStart = priorDate.toISOString().slice(0, 10)

  // Execute all three queries in parallel
  const [orgResult, submissionsResult, priorInsightResult] = await Promise.all([
    service
      .from('organizations')
      .select('name, priorities')
      .eq('id', orgId)
      .single(),
    service
      .from('submissions')
      .select('employees(name, team), responses(body_clean, hidden_at)')
      .eq('week_start', week_start)
      .eq('employees.org_id', orgId)
      .not('responses', 'is', null),
    service
      .from('insights')
      .select('summary, highlights, sentiment_score, sentiment_label, themes, bottom_line')
      .eq('org_id', orgId)
      .eq('week_start', priorWeekStart)
      .single(),
  ])

  const { data: org } = orgResult
  const { data: submissions } = submissionsResult
  const { data: priorInsight } = priorInsightResult

  const replies = ((submissions ?? []) as any[])
    .filter((s: any) => !s.responses?.hidden_at)
    .map((s: any) => ({
      name: s.employees?.name ?? 'Unknown',
      team: s.employees?.team ?? null,
      body: s.responses?.body_clean ?? '',
    }))
    .filter((r: any) => r.body.trim().length > 0)

  if (replies.length === 0) {
    return NextResponse.json({ error: 'No replies to summarize yet' }, { status: 400 })
  }

  const priorWeek: PriorWeekContext | null = priorInsight ? {
    ...priorInsight,
    week_label: formatWeekRange(priorWeekStart),
  } : null

  const weekLabel = formatWeekRange(week_start)
  let insight: { summary: string; highlights: string[]; cross_functional_themes: string | null; risk_items: string | null; bottom_line: string | null; initiative_tracking: string | null; sentiment_score: number | null; sentiment_label: string | null; themes: string[] | null }

  try {
    insight = await generateWeeklyInsight(org?.name ?? 'the org', weekLabel, replies, org?.priorities as any, priorWeek)
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
      initiative_tracking: insight.initiative_tracking,
      sentiment_score: insight.sentiment_score,
      sentiment_label: insight.sentiment_label,
      themes: insight.themes,
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'org_id,week_start' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  auditLog({
    action: 'insight.generate',
    actorId: ctx.userId,
    orgId,
    metadata: { week_start, reply_count: replies.length },
  })

  return NextResponse.json({ ok: true, insight })
}
