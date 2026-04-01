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
    sentAt: string | null      // ISO timestamp the check-in email was sent
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
    // Use actual send date if available, otherwise fall back to week label
    const sentDates = subs.map((s) => s.sentAt).filter(Boolean)
    const sentLabel = sentDates.length > 0
      ? `sent ${new Date(sentDates[0]!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
      : `week of ${week}`
    const lines: string[] = [`${sentLabel} (${responded.length}/${subs.length} replied):`]
    for (const s of responded) {
      const team = s.employeeTeam ? ` [${s.employeeTeam}]` : ''
      const body = s.body ? s.body.slice(0, 500) : '(no response body)'
      lines.push(`  ${s.employeeName}${team}: ${body}`)
    }
    if (notResponded.length > 0) lines.push(`  Have not replied: ${notResponded.join(', ')}`)
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
  }, { timeout: 30000 })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response from Claude')
  return content.text.trim()
}

// ── Briefing chat response generation ───────────────────────────────────────

export async function generateBriefingChatResponse(
  orgName: string,
  weekLabel: string,
  question: string,
  insight: InsightResult,
  replies: Array<{ name: string; team: string | null; body: string }>,
): Promise<string> {
  // Build brief roster for context
  const teams = [...new Set(replies.map(r => r.team).filter(Boolean))]
  const repliesText = replies
    .map((r: { name: string; team: string | null; body: string }): string => `[${r.name}${r.team ? ` · ${r.team}` : ''}]: ${r.body}`)
    .join('\n\n')

  // Build briefing context block
  const briefingParts: string[] = [
    `EXECUTIVE SUMMARY: ${insight.summary}`,
  ]
  if (insight.bottom_line) briefingParts.push(`BOTTOM LINE: ${insight.bottom_line}`)
  if (insight.highlights?.length) briefingParts.push(`HIGHLIGHTS:\n${insight.highlights.map(h => `- ${h}`).join('\n')}`)
  if (insight.cross_functional_themes) briefingParts.push(`CROSS-FUNCTIONAL THEMES:\n${insight.cross_functional_themes}`)
  if (insight.risk_items) briefingParts.push(`RISK & DECISION ITEMS:\n${insight.risk_items}`)
  if (insight.initiative_tracking) briefingParts.push(`INITIATIVE TRACKING:\n${insight.initiative_tracking}`)
  if (insight.themes?.length) briefingParts.push(`KEY THEMES: ${insight.themes.join(', ')}`)
  if (insight.sentiment_score != null) briefingParts.push(`COMPANY SENTIMENT: ${insight.sentiment_label ?? 'Neutral'} (${insight.sentiment_score}/10)`)

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an assistant helping a CEO understand their weekly briefing for ${orgName} (week of ${weekLabel}).

BRIEFING CONTEXT:
${briefingParts.join('\n\n')}

RAW CHECK-IN REPLIES (for additional context):
${repliesText}

---

CEO'S QUESTION: ${question}

---

Answer the CEO's question directly and concisely. Draw on the briefing analysis, the raw replies, and the themes identified. Be specific — use names, teams, and concrete data. Keep your reply under 300 words. Write in confident, clear prose suitable for a busy executive. No markdown, no headers, just direct answers.`,
      },
    ],
  }, { timeout: 30000 })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response from Claude')
  return content.text.trim()
}

// ── AI insight generation ────────────────────────────────────────────────────

export type InsightResult = {
  summary: string
  highlights: string[]
  cross_functional_themes: string | null
  risk_items: string | null
  bottom_line: string | null
  initiative_tracking: string | null
  sentiment_score: number | null
  sentiment_label: string | null
  themes: string[] | null
}

export type PriorityInput = {
  name: string
  description: string
}

export type PriorWeekContext = {
  summary: string | null
  highlights: string[] | null
  sentiment_score: number | null
  sentiment_label: string | null
  themes: string[] | null
  bottom_line: string | null
  week_label: string
}

export async function generateWeeklyInsight(
  orgName: string,
  weekLabel: string,
  replies: Array<{ name: string; team: string | null; body: string }>,
  priorities?: PriorityInput[] | null,
  priorWeek?: PriorWeekContext | null,
): Promise<InsightResult> {
  const repliesText = replies
    .map((r: { name: string; team: string | null; body: string }): string => `[${r.name}${r.team ? ` · ${r.team}` : ''}]: ${r.body}`)
    .join('\n\n')

  // Determine org size to calibrate depth of analysis
  const replyCount = replies.length
  const teams = [...new Set(replies.map(r => r.team).filter(Boolean))]
  const isSmallOrg = replyCount < 8
  const hasPriorities = priorities && priorities.length > 0

  // Build prior-week context for week-over-week comparison
  let priorWeekBlock = ''
  if (priorWeek && (priorWeek.summary || priorWeek.bottom_line)) {
    const parts: string[] = [`\n\nPRIOR WEEK BRIEFING (${priorWeek.week_label}):`]
    if (priorWeek.bottom_line) parts.push(`Bottom line: ${priorWeek.bottom_line}`)
    else if (priorWeek.summary) parts.push(`Summary: ${priorWeek.summary}`)
    if (priorWeek.highlights?.length) parts.push(`Highlights: ${priorWeek.highlights.join(' | ')}`)
    if (priorWeek.themes?.length) parts.push(`Key themes: ${priorWeek.themes.join(', ')}`)
    if (priorWeek.sentiment_score != null) parts.push(`Sentiment: ${priorWeek.sentiment_label ?? ''} ${priorWeek.sentiment_score}/10`)
    priorWeekBlock = parts.join('\n')
  }

  const prioritiesBlock = hasPriorities
    ? `\n\nCEO-DEFINED COMPANY PRIORITIES:\n${priorities.map((p, i) => `${i + 1}. ${p.name}${p.description ? ` — ${p.description}` : ''}`).join('\n')}\n`
    : ''

  const initiativeSection = hasPriorities
    ? `\n\n5. INITIATIVE TRACKING (1 paragraph per priority): For each CEO-defined priority above, evaluate how the company is tracking this week based on the check-in data. Is there forward motion? Is anyone actively working on it? Is it stalled? If a priority has ZERO signal in the check-ins — nobody mentioned anything related to it — that is a red flag and you should say so explicitly. Be direct: "on track", "at risk", "no signal this week." Name the people whose work connects to each priority.`
    : ''

  const initiativeJsonField = hasPriorities
    ? `\n  "initiative_tracking": "Full text with one paragraph per priority separated by \\n\\n",`
    : `\n  "initiative_tracking": null,`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16384,
    messages: [
      {
        role: 'user',
        content: `You are a chief of staff writing a weekly intelligence briefing for the CEO of ${orgName}. Your job is NOT to summarize what people said — it's to synthesize across people, connect dots they wouldn't connect themselves, identify decisions that are overdue, flag silence as risk, and tell the CEO what they need to hear, not what's comfortable.

Week: ${weekLabel}
Total replies: ${replyCount}
Teams represented: ${teams.length > 0 ? teams.join(', ') : 'No team labels'}${prioritiesBlock}${priorWeekBlock}

Individual check-in replies:
${repliesText}

---

Write a weekly intelligence briefing with these sections. Be specific — use names, teams, and data from the check-ins. Be opinionated and direct. Do not hedge. If something is a problem, say it plainly.

${isSmallOrg ? `Note: This is a smaller team (${replyCount} replies). Scale the analysis accordingly — fewer themes, shorter sections. Don't manufacture complexity that isn't there, but still be direct about what matters.` : ''}

1. CROSS-FUNCTIONAL THEMES (${isSmallOrg ? '1-2' : '2-4'} paragraphs): What patterns emerge when you read across all the replies? Where are different people independently surfacing the same issue? Where is one person's blocker another person's deliverable? Connect the dots. Name names. If multiple people are describing the same underlying condition from different angles, call it out.

2. RISK AND DECISION ITEMS (${isSmallOrg ? '1-3' : '2-5'} items): Decisions that are overdue, risks that aren't being managed, things the CEO needs to act on THIS WEEK. Each item should name the people involved and state what specifically needs to happen. If nobody mentioned something important and that silence itself is a risk, flag it. Format each as a short paragraph with the involved people's names bolded at the start.

3. BOTTOM LINE (1 paragraph): The single most important thing the CEO should take away. Not a recap — a judgment call. What's the real story this week?

4. HIGHLIGHTS: Exactly 3 short highlight bullets (one sentence each) calling out the most notable wins. Start each with the person's name.${initiativeSection}

5. COMPANY SENTIMENT: Read the emotional tone across ALL replies. Score the overall company mood on a 1-10 scale (1 = deeply concerned/frustrated, 5 = neutral, 10 = highly energized/optimistic). Also provide a short label like "Energized", "Positive", "Steady", "Mixed", "Concerned", or "Frustrated". Be honest — if people are stressed, the score should reflect that.

6. THEMES: Extract the 3-5 most prominent topics or themes across all replies. These should be short labels (1-3 words each) like "Hiring", "Product launch", "Technical debt", "Client renewals", "Q2 planning". Only include themes that multiple people mentioned or that dominated a reply.

Format your response as JSON exactly like this:
{
  "cross_functional_themes": "Full text with paragraphs separated by \\n\\n",
  "risk_items": "Full text with items separated by \\n\\n",
  "bottom_line": "Single paragraph",
  "summary": "A 2-sentence executive summary for the dashboard card — the most compressed version of the bottom line",
  "highlights": ["...", "...", "..."],${initiativeJsonField}
  "sentiment_score": 7,
  "sentiment_label": "Positive",
  "themes": ["Theme 1", "Theme 2", "Theme 3"]
}

${priorWeek ? `\n7. WEEK-OVER-WEEK CONTEXT: You have last week's briefing above. Weave comparisons naturally into your analysis — don't create a separate "vs last week" section. Examples: "Pipeline concerns are now in their third consecutive week", "Sentiment improved from ${priorWeek.sentiment_score}/10 to reflect the team's momentum on shipping", "Unlike last week, no one flagged hiring as a blocker." If a theme disappeared or a new one emerged, note it. If sentiment shifted meaningfully, explain why.\n` : ''}
Write in confident, direct prose. No corporate fluff. No "it's worth noting" or "it may be beneficial to consider." Just tell the CEO what's happening and what to do about it.`,
      },
    ],
  }, { timeout: 55000 })

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response from Claude')

  // Extract JSON from the response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse Claude response as JSON')

  const parsed = JSON.parse(jsonMatch[0]) as InsightResult
  return parsed
}
