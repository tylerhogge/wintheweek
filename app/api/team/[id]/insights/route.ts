import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthUser, getProfile } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user || !profile?.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Fetch the employee
  const { data: employee } = await supabase
    .from('employees')
    .select('id, name, team, function')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single()

  if (!employee) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch org name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.org_id)
    .single()

  // Fetch recent submissions with responses (last 12 weeks)
  const { data: submissions } = await supabase
    .from('submissions')
    .select('week_start, sent_at, replied_at, response:responses(body_clean)')
    .eq('employee_id', id)
    .not('sent_at', 'is', null)
    .order('week_start', { ascending: false })
    .limit(12)

  const replied = (submissions ?? []).filter(s => s.replied_at && s.response)
  const totalSent = (submissions ?? []).length
  const replyRate = totalSent > 0 ? Math.round((replied.length / totalSent) * 100) : 0

  // Build replies text for AI
  const repliesText = replied.map(s => {
    const body = (s.response as any)?.body_clean ?? '(no content)'
    return `Week of ${s.week_start}: ${body}`
  }).join('\n\n')

  if (replied.length === 0) {
    return NextResponse.json({
      insights: `${employee.name} hasn't replied to any check-ins yet. Insights will be generated once they start responding.`,
    })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are an AI assistant helping a manager understand one of their team members based on weekly check-in responses.

EMPLOYEE: ${employee.name}
${employee.team ? `TEAM: ${employee.team}` : ''}
${employee.function ? `ROLE: ${employee.function}` : ''}
ORGANIZATION: ${org?.name ?? 'their company'}
REPLY RATE: ${replyRate}% (${replied.length}/${totalSent} weeks)

RECENT CHECK-IN RESPONSES (newest first):
${repliesText}

---

Write a brief employee profile summary (under 250 words) covering:
1. KEY THEMES: What does this person consistently talk about? What are their main focus areas?
2. STRENGTHS: Based on their updates, where do they seem to excel or add the most value?
3. AREAS TO WATCH: Any patterns of concern — things they struggle with, recurring blockers, or topics they avoid?
4. ENGAGEMENT: Comment on their reply consistency and the depth/quality of their responses.

Write in direct, confident prose. Use their first name. Be specific and cite examples from their actual responses. This is for their manager's eyes only.

CRITICAL FORMATTING RULE: Do NOT use any markdown. No # headers, no ** bold **, no bullet points, no numbered lists. Write ONLY in plain flowing paragraphs separated by blank lines. Start directly with the content — do not begin with a title or header line.`,
      }],
    }, { timeout: 30000 })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Bad response')
    // Strip any markdown headers/bold the model may have added
    const cleaned = content.text.trim().replace(/^#+\s+.*\n*/gm, '').replace(/\*\*/g, '').trim()
    return NextResponse.json({ insights: cleaned })
  } catch (err) {
    console.error('Employee insights generation failed:', err)
    return NextResponse.json({ insights: 'Unable to generate insights right now. Please try again later.' })
  }
}
