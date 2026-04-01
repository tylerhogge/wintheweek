/**
 * POST /api/briefing-chat
 *
 * Chat endpoint for asking questions about the weekly briefing.
 * Auth via Supabase session — any logged-in user can ask questions.
 *
 * Body: { question: string, weekStart: string }
 * Response: { answer: string }
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateBriefingChatResponse } from '@/lib/anthropic'
import { requireRole } from '@/lib/rbac'

// Allow longer timeout for Claude response
export const maxDuration = 60

export async function POST(req: Request) {
  const auth = await requireRole('member') // Any logged-in user can ask
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const { question, weekStart } = await req.json()
  if (!question?.trim() || !weekStart) {
    return NextResponse.json(
      { error: 'question and weekStart required' },
      { status: 400 }
    )
  }

  const service = createServiceClient()
  const orgId = ctx.orgId

  // Fetch org name, the week's insight, and all raw replies
  const [orgResult, insightResult, submissionsResult] = await Promise.all([
    service
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single(),
    service
      .from('insights')
      .select('summary, highlights, cross_functional_themes, risk_items, bottom_line, initiative_tracking, sentiment_score, sentiment_label, themes')
      .eq('org_id', orgId)
      .eq('week_start', weekStart)
      .maybeSingle(),
    service
      .from('submissions')
      .select('employees(name, team), responses(body_clean, hidden_at)')
      .eq('week_start', weekStart)
      .eq('employees.org_id', orgId)
      .not('responses', 'is', null),
  ])

  const { data: org } = orgResult
  const { data: insight } = insightResult
  const { data: submissions } = submissionsResult

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  if (!insight) {
    return NextResponse.json(
      { error: 'No briefing found for this week' },
      { status: 400 }
    )
  }

  // Extract replies, filtering out hidden ones
  const replies = ((submissions ?? []) as any[])
    .filter((s: any) => !s.responses?.hidden_at)
    .map((s: any) => ({
      name: s.employees?.name ?? 'Unknown',
      team: s.employees?.team ?? null,
      body: s.responses?.body_clean ?? '',
    }))
    .filter((r: any) => r.body.trim().length > 0)

  if (replies.length === 0) {
    return NextResponse.json(
      { error: 'No briefing data available for this week' },
      { status: 400 }
    )
  }

  // Format week label for context
  const weekDate = new Date(weekStart + 'T00:00:00Z')
  const endDate = new Date(weekDate)
  endDate.setUTCDate(endDate.getUTCDate() + 6)
  const weekLabel = `${weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  try {
    const answer = await generateBriefingChatResponse(
      org.name ?? 'the organization',
      weekLabel,
      question.trim(),
      insight as any,
      replies
    )

    return NextResponse.json({ answer })
  } catch (err: any) {
    console.error('[briefing-chat]', err)
    return NextResponse.json(
      {
        error: 'Failed to generate response',
        detail: err?.message ?? String(err),
      },
      { status: 500 }
    )
  }
}
