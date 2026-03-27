/**
 * GET /api/search?q=keyword&limit=20
 *
 * Cross-week keyword search across all response bodies.
 * Returns matching responses with employee info, week, and highlighted snippet.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

export async function GET(req: Request) {
  const auth = await requireRole('member')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const service = createServiceClient()

  // Search across all weeks — use ilike for case-insensitive partial matching
  const { data, error } = await service
    .from('responses')
    .select(`
      id, body_clean, created_at,
      submission:submissions!inner(
        id, week_start, replied_at,
        employee:employees!inner(id, name, email, team)
      )
    `)
    .eq('submissions.employees.org_id', ctx.orgId)
    .is('hidden_at', null)
    .ilike('body_clean', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Search query failed:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }

  // Build results with snippet context around the match
  const results = (data ?? []).map((r: any) => {
    const body: string = r.body_clean ?? ''
    const lowerBody = body.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const idx = lowerBody.indexOf(lowerQuery)

    // Extract ~100 chars around the match
    let snippet = ''
    if (idx >= 0) {
      const start = Math.max(0, idx - 50)
      const end = Math.min(body.length, idx + query.length + 50)
      snippet = (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '')
    } else {
      snippet = body.slice(0, 120) + (body.length > 120 ? '…' : '')
    }

    const sub = r.submission
    return {
      response_id: r.id,
      snippet,
      match_index: idx,
      created_at: r.created_at,
      week_start: sub?.week_start,
      replied_at: sub?.replied_at,
      employee: sub?.employee ? {
        id: sub.employee.id,
        name: sub.employee.name,
        team: sub.employee.team,
      } : null,
    }
  })

  return NextResponse.json({ results, query, count: results.length })
}
