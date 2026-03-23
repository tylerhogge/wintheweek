import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ── Email query response generation ──────────────────────────────────────────

export type QueryContext = {
  employees: Array<{
    name: string
    team: string | null
    active: boolean
  }>
  submissions: Array<{
    weekStart: string
    employeeName: string
    employeeTeam: string | null
    responded: boolean
    body: string | null
  }>
}

export async function generateQueryResponse(
  orgName: string,
  question: string,
  ctx: QueryContext,
): Promise<string> {
  // Build employee roster section
  const activeEmployees = ctx.employees.filter((e) => e.active)
  const rosterLines = activeEmployees.map((e) =>
    e.team ? `  - ${e.name} (${e.team})` : `  - ${e.name}`,
  )

  // Group submissions by week, then by employee for readability
  const byWeek = new Map<string, typeof ctx.submissions>()
  for (const s of ctx.submissions) {
    if (!byWeek.has(s.weekStart)) byWeek.set(s.weekStart, [])
    byWeek.get(s.weekStart)!.push(s)
  }

  const weekSections: string[] = []
  const sortedWeeks = [...byWeek.keys()].sort().reverse()
  for (const week of sortedWeeks) {
    const subs = byWeek.get(week)!
    const responded = subs.filter((s) => s.responded)
    const notResponded = subs.filter((s) => !s.responded).map((s) => s.employeeName)
    const lines: string[] = [`Week of ${week} (${responded.length}/${subs.length} responded):`]
    for (const s of responded) {
      const team = s.employeeTeam ? ` [${s.employeeTeam}]` : ''
      const body = s.body ? s.body.slice(0, 500) : '(no response body)'
      lines.push(`  ${s.employeeName}${team}: ${body}`)
    }
    if (notResponded.length > 0) lines.push(`  Did not respond: ${notResponded.join(', ')}`)
    weekSections.push(lines.join('\n'))
  }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an AI assistant for ${orgName}, helping a manager understand their team's weekly check-in data.

ACTIVE TEAM (${activeEmployees.length} members):
${rosterLines.join('\n')}

RECENT CHECK-IN DATA (newest first):
${weekSections.join('\n\n')}

---

MANAGER'S QUESTION: ${question}

---

Answer the question directly and concisely. Be specific — use names, teams, and data from the check-ins above. Keep your reply under 350 words. Write in plain text suitable for an email: no markdown bold (**), no ## headers. Simple prose paragraphs or short numbered/bulleted lists are fine where they help clarity. If you can't answer well from the available data, say so briefly.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response from Claude')
  return content.text.trim()
}

// ── AI insight generation ────────────────────────────────────────────────────

export type InsightResult = {
  summary: string
  highlights: string[]
}

export async function generateWeeklyInsight(
  orgName: string,
  weekLabel: string,
  replies: Array<{ name: string; team: string | null; body: string }>,
): Promise<InsightResult> {
  const repliesText = replies
    .map((r: { name: string; team: string | null; body: string }): string => `[${r.name}${r.team ? ` · ${r.team}` : ''}]: ${r.body}`)
    .join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are summarizing weekly team check-ins for ${orgName}.

Week: ${weekLabel}
Total replies: ${replies.length}

Replies:
${repliesText}

Write a concise weekly summary in two parts:

1. SUMMARY: 2-3 sentences capturing what the company as a whole accomplished this week. Be specific, mention numbers and outcomes where possible. Write it as a confident paragraph — no bullet points.

2. HIGHLIGHTS: Exactly 3 short highlight bullets (one sentence each) that call out the most notable wins across the org. Start each with the person's name or team.

Format your response as JSON exactly like this:
{
  "summary": "...",
  "highlights": ["...", "...", "..."]
}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response from Claude')

  // Extract JSON from the response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse Claude response as JSON')

  const parsed = JSON.parse(jsonMatch[0]) as InsightResult
  return parsed
}
