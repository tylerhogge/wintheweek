/**
 * POST /api/team/[id]/chat
 *
 * Chat endpoint for asking questions about a specific employee.
 * Uses their check-in history as context for Claude.
 *
 * Body: { question: string }
 * Response: { answer: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'
import { requireRole } from '@/lib/rbac'

export const maxDuration = 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const auth = await requireRole('member')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const { question } = await req.json()
  if (!question?.trim()) {
    return NextResponse.json({ error: 'question is required' }, { status: 400 })
  }

  const service = createServiceClient()

  // Fetch employee, org, and submissions in parallel
  const [empResult, orgResult, subsResult] = await Promise.all([
    service
      .from('employees')
      .select('id, name, email, team, function, active, created_at')
      .eq('id', id)
      .eq('org_id', ctx.orgId)
      .single(),
    service
      .from('organizations')
      .select('name')
      .eq('id', ctx.orgId)
      .single(),
    service
      .from('submissions')
      .select('week_start, sent_at, replied_at, response:responses(body_clean)')
      .eq('employee_id', id)
      .not('sent_at', 'is', null)
      .order('week_start', { ascending: false })
      .limit(16),
  ])

  const { data: employee } = empResult
  const { data: org } = orgResult
  const { data: submissions } = subsResult

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }

  const allSubs = submissions ?? []
  const totalSent = allSubs.length
  const replied = allSubs.filter((s: any) => s.replied_at && s.response)
  const replyRate = totalSent > 0 ? Math.round((replied.length / totalSent) * 100) : 0

  // Build check-in history text
  const historyLines = allSubs.map((s: any) => {
    const body = s.response?.body_clean
    if (body) {
      return `Week of ${s.week_start} — REPLIED:\n${body}`
    }
    return `Week of ${s.week_start} — DID NOT REPLY`
  })

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are an AI assistant helping a manager understand one of their team members at ${org?.name ?? 'their company'}.

EMPLOYEE: ${employee.name}
EMAIL: ${employee.email}
${employee.team ? `TEAM: ${employee.team}` : ''}
${employee.function ? `ROLE: ${employee.function}` : ''}
STATUS: ${employee.active ? 'Active' : 'Inactive'}
REPLY RATE: ${replyRate}% (${replied.length}/${totalSent} weeks)

CHECK-IN HISTORY (newest first):
${historyLines.join('\n\n')}

---

MANAGER'S QUESTION: ${question.trim()}

---

Answer the question directly and concisely. Be specific — reference actual content from their check-ins. Use their first name. Keep your answer under 300 words. Write in plain text, no markdown formatting. If you can't answer well from the available data, say so briefly.`,
        },
      ],
    }, { timeout: 30000 })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response')
    return NextResponse.json({ answer: content.text.trim() })
  } catch (err: any) {
    console.error('[employee-chat]', err)
    return NextResponse.json(
      { error: 'Failed to generate response', detail: err?.message ?? String(err) },
      { status: 500 },
    )
  }
}
