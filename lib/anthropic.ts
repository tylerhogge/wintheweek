import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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
    .map((r) => `[${r.name}${r.team ? ` · ${r.team}` : ''}]: ${r.body}`)
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
