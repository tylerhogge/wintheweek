import { Resend } from 'resend'
import { escapeHtml } from '@/lib/utils'

// Lazy singleton — only instantiated at request time, not at build time
let _resend: Resend | null = null
export function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// ── Email templates ──────────────────────────────────────────────────────────

export function buildCampaignEmail({
  employeeName,
  subject,
  body,
  replyToAddress,
}: {
  employeeName: string
  subject: string
  body: string
  replyToAddress: string
}): { subject: string; html: string; text: string } {
  // Personalise the body — replace {{name}} with the employee's first name
  const firstName = employeeName.split(' ')[0]
  const personalisedBody = body.replace(/\{\{name\}\}/g, firstName)

  // Escape HTML in the body to prevent XSS in emails
  const safeBody = escapeHtml(personalisedBody)

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; background:#ffffff; }
    .wrap { max-width:520px; margin:0 auto; padding:40px 24px; }
    p { font-size:15px; color:#111111; line-height:1.6; margin:0 0 16px; }
  </style>
</head>
<body>
  <div class="wrap">
    ${safeBody
      .split('\n\n')
      .map((p: string): string => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('')}
  </div>
</body>
</html>`

  const text = `${personalisedBody}\n\n---\nJust reply to this email with what you got done.`

  return { subject, html, text }
}

/**
 * Helper to convert **bold** markdown syntax to <strong> tags
 */
function markdownBoldToStrong(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

/**
 * Helper to split text on double newlines and convert to HTML paragraphs
 */
function paragraphsToHtml(text: string | null): string {
  if (!text) return ''
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((para) => {
      const escaped = escapeHtml(para)
      const withBold = markdownBoldToStrong(escaped)
      return `<p style="font-size:14px; color:#a1a1aa; line-height:1.65; margin:0 0 14px;">${withBold}</p>`
    })
    .join('')
}

export function buildDigestEmail({
  orgName,
  weekLabel,
  summary,
  highlights,
  replies,
  dashboardUrl,
  bottomLine,
  crossFunctionalThemes,
  riskItems,
  initiativeTracking,
  sentimentScore,
  sentimentLabel,
  themes,
  replyToAddress,
}: {
  orgName: string
  weekLabel: string
  summary: string | null
  highlights: string[] | null
  replies: { name: string; team: string | null; body: string }[]
  dashboardUrl: string
  bottomLine?: string | null
  crossFunctionalThemes?: string | null
  riskItems?: string | null
  initiativeTracking?: string | null
  sentimentScore?: number | null
  sentimentLabel?: string | null
  themes?: string[] | null
  replyToAddress?: string | null
}): { subject: string; html: string; text: string } {
  const subject = `${orgName} — CEO Briefing: ${weekLabel}`

  // Determine sentiment color
  let sentimentColor = '#a1a1aa'
  let sentimentBgColor = 'rgba(255,255,255,0.03)'
  if (sentimentScore !== null && sentimentScore !== undefined) {
    if (sentimentScore >= 8) {
      sentimentColor = '#22c55e'
      sentimentBgColor = 'rgba(34,197,94,0.1)'
    } else if (sentimentScore >= 6) {
      sentimentColor = '#3b82f6'
      sentimentBgColor = 'rgba(59,130,246,0.1)'
    } else if (sentimentScore >= 4) {
      sentimentColor = '#eab308'
      sentimentBgColor = 'rgba(234,179,8,0.1)'
    } else if (sentimentScore >= 2) {
      sentimentColor = '#f97316'
      sentimentBgColor = 'rgba(249,115,22,0.1)'
    } else {
      sentimentColor = '#ef4444'
      sentimentBgColor = 'rgba(239,68,68,0.1)'
    }
  }

  const sentimentHtml =
    sentimentScore !== null && sentimentScore !== undefined
      ? `<div style="background:${sentimentBgColor}; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px 16px; margin-bottom:24px; display:inline-block;">
          <p style="font-size:12px; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; color:${sentimentColor}; margin:0;">Team Sentiment: ${sentimentScore}/10 ${sentimentLabel ? `— ${sentimentLabel}` : ''}</p>
        </div>`
      : ''

  // Bottom line (key takeaway) — prominent box
  const bottomLineHtml = bottomLine
    ? `<div style="background:rgba(34,197,94,0.08); border:2px solid #22c55e; border-radius:10px; padding:20px 24px; margin-bottom:28px;">
        <p style="font-size:10px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#22c55e; margin:0 0 8px;">Bottom Line</p>
        <p style="font-size:14px; color:#fafafa; line-height:1.65; margin:0; font-weight:500;">${escapeHtml(bottomLine)}</p>
      </div>`
    : ''

  // Executive Summary
  const summaryHtml = summary
    ? `<div style="margin-bottom:28px;">
        <p style="font-size:10px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#22c55e; margin:0 0 12px;">Executive Summary</p>
        <p style="font-size:14px; color:#a1a1aa; line-height:1.65; margin:0 0 ${highlights && highlights.length > 0 ? '14px' : '0'};">${escapeHtml(summary)}</p>
        ${
          highlights && highlights.length > 0
            ? highlights.map((h) => `<p style="font-size:14px; color:#a1a1aa; margin:6px 0; padding-left:14px; position:relative;">→ ${escapeHtml(h)}</p>`).join('')
            : ''
        }
      </div>`
    : ''

  // Cross-functional themes
  const themesHtml = crossFunctionalThemes
    ? `<div style="margin-bottom:28px;">
        <p style="font-size:10px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#22c55e; margin:0 0 12px;">Cross-Functional Themes</p>
        ${paragraphsToHtml(crossFunctionalThemes)}
      </div>`
    : ''

  // Risk & Decision Items
  const risksHtml = riskItems
    ? `<div style="margin-bottom:28px;">
        <p style="font-size:10px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#22c55e; margin:0 0 12px;">Risk & Decision Items</p>
        ${paragraphsToHtml(riskItems)}
      </div>`
    : ''

  // Initiative tracking
  const initiativeHtml = initiativeTracking
    ? `<div style="margin-bottom:28px;">
        <p style="font-size:10px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#22c55e; margin:0 0 12px;">Initiative Tracking</p>
        ${paragraphsToHtml(initiativeTracking)}
      </div>`
    : ''

  // Theme tags/pills
  const tagsHtml =
    themes && themes.length > 0
      ? `<div style="margin-bottom:28px;">
          ${themes
            .map(
              (t) =>
                `<span style="display:inline-block; background:rgba(34,197,94,0.15); color:#22c55e; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:500; margin-right:8px; margin-bottom:8px;">${escapeHtml(t)}</span>`,
            )
            .join('')}
        </div>`
      : ''

  // Call-to-action for questions (only if replyToAddress provided)
  const ctaBoxHtml = replyToAddress
    ? `<div style="background:rgba(34,197,94,0.06); border:1px solid rgba(34,197,94,0.18); border-radius:10px; padding:20px 24px; margin-bottom:28px;">
        <p style="font-size:14px; color:#a1a1aa; line-height:1.65; margin:0;">💬 <strong>Have a question?</strong> Reply to this email and I'll answer using your team's data.</p>
      </div>`
    : ''

  const repliesHtml = replies
    .map(
      (r) => `
    <div style="padding:16px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
      <p style="font-size:13px; font-weight:600; color:#fafafa; margin:0 0 6px;">
        ${escapeHtml(r.name)}${r.team ? ` <span style="font-weight:400; color:#71717a;">· ${escapeHtml(r.team)}</span>` : ''}
      </p>
      <p style="font-size:14px; color:#a1a1aa; line-height:1.65; margin:0; white-space:pre-wrap;">${escapeHtml(r.body)}</p>
    </div>`,
    )
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { background:#09090b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; margin:0; padding:0; }
  .wrap { max-width:560px; margin:40px auto; padding:0 20px; }
  .card { background:#111113; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:32px; }
  h2 { font-size:20px; font-weight:700; color:#fafafa; letter-spacing:-0.03em; margin:0 0 4px; }
  .sub { font-size:13px; color:#71717a; margin:0 0 24px; }
  .cta { display:inline-block; margin-top:28px; padding:10px 20px; background:#22c55e; color:#000; font-size:13px; font-weight:600; border-radius:8px; text-decoration:none; }
</style></head>
<body>
  <div class="wrap">
    <div class="card">
      <h2>Your CEO Briefing</h2>
      <p class="sub">${weekLabel} · ${orgName}</p>
      ${sentimentHtml}
      ${bottomLineHtml}
      ${summaryHtml}
      ${themesHtml}
      ${risksHtml}
      ${initiativeHtml}
      ${tagsHtml}
      ${ctaBoxHtml}
      <a href="${dashboardUrl}" class="cta">View on Dashboard →</a>
      <div>${repliesHtml}</div>
    </div>
  </div>
</body>
</html>`

  // Build text version
  const textSections = [
    `Your CEO Briefing — ${weekLabel}`,
    '',
  ]

  if (sentimentScore !== null && sentimentScore !== undefined) {
    textSections.push(`Team Sentiment: ${sentimentScore}/10 ${sentimentLabel ? `— ${sentimentLabel}` : ''}`)
    textSections.push('')
  }

  if (bottomLine) {
    textSections.push(`BOTTOM LINE`)
    textSections.push(bottomLine)
    textSections.push('')
  }

  if (summary) {
    textSections.push(`EXECUTIVE SUMMARY`)
    textSections.push(summary)
    if (highlights && highlights.length > 0) {
      highlights.forEach((h) => textSections.push(`• ${h}`))
    }
    textSections.push('')
  }

  if (crossFunctionalThemes) {
    textSections.push(`CROSS-FUNCTIONAL THEMES`)
    textSections.push(crossFunctionalThemes)
    textSections.push('')
  }

  if (riskItems) {
    textSections.push(`RISK & DECISION ITEMS`)
    textSections.push(riskItems)
    textSections.push('')
  }

  if (initiativeTracking) {
    textSections.push(`INITIATIVE TRACKING`)
    textSections.push(initiativeTracking)
    textSections.push('')
  }

  if (themes && themes.length > 0) {
    textSections.push(`THEMES: ${themes.join(', ')}`)
    textSections.push('')
  }

  if (replyToAddress) {
    textSections.push(`Have a question? Reply to this email and I'll answer using your team's data.`)
    textSections.push('')
  }

  textSections.push(`---`)
  textSections.push('')

  replies.forEach((r) => {
    textSections.push(`${r.name}${r.team ? ` (${r.team})` : ''}:`)
    textSections.push(r.body)
    textSections.push('')
  })

  textSections.push(`View on dashboard: ${dashboardUrl}`)

  const text = textSections.filter((line) => line !== undefined).join('\n')

  return { subject, html, text }
}

/**
 * Email sent to the admin (Sterling) the moment an employee submits their reply.
 * Reply-To is set to a tagged address so Sterling's reply is routed back through us.
 */
export function buildReplyNotification({
  adminName,
  employeeName,
  employeeTeam,
  replyBody,
  replyToAddress,
  dashboardUrl,
  weekReplied,
  weekTotal,
}: {
  adminName: string
  employeeName: string
  employeeTeam: string | null
  replyBody: string
  replyToAddress: string
  dashboardUrl: string
  weekReplied: number
  weekTotal: number
}): { subject: string; html: string; text: string } {
  const subject = `${employeeName} submitted their weekly update`
  const teamLabel = employeeTeam ? ` · ${employeeTeam}` : ''
  const weekProgress = weekTotal > 0
    ? `${weekReplied} of ${weekTotal} replied this week`
    : null

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; margin:0; padding:0; color:#111; }
  .wrap { max-width:520px; margin:0 auto; padding:40px 24px; }
  .label { font-size:11px; font-weight:600; letter-spacing:0.07em; text-transform:uppercase; color:#71717a; margin:0 0 6px; }
  .name { font-size:17px; font-weight:700; color:#111; margin:0 0 2px; }
  .team { font-size:13px; color:#71717a; margin:0 0 24px; }
  .week-bar { display:flex; align-items:center; gap:10px; background:#f5f5f5; border-radius:6px; padding:10px 14px; margin-bottom:24px; }
  .week-bar span { font-size:12px; font-weight:600; color:#52525b; }
  .week-bar .count { font-size:12px; color:#22c55e; font-weight:700; }
  .reply-box { background:#f9f9f9; border-left:3px solid #22c55e; padding:16px 20px; border-radius:4px; margin-bottom:28px; }
  .reply-box p { font-size:15px; color:#111; line-height:1.65; margin:0; white-space:pre-wrap; }
  .cta { font-size:14px; color:#52525b; }
  .cta a { color:#22c55e; font-weight:600; text-decoration:none; }
  .footer { margin-top:40px; padding-top:20px; border-top:1px solid #e5e5e5; font-size:12px; color:#a1a1aa; }
</style></head>
<body>
  <div class="wrap">
    <p class="label">Weekly Check-in</p>
    <p class="name">${escapeHtml(employeeName)}</p>
    <p class="team">${escapeHtml(teamLabel.trim() || 'No team')}</p>

    ${weekProgress ? `<div class="week-bar"><span>This week:</span><span class="count">${weekProgress}</span></div>` : ''}

    <div class="reply-box">
      <p>${escapeHtml(replyBody).replace(/\n/g, '<br/>')}</p>
    </div>

    <p class="cta">Hit <strong>Reply</strong> to respond directly to ${employeeName.split(' ')[0]}. Your reply will be delivered on your behalf and captured in the dashboard.</p>
    <p class="cta" style="margin-top:12px;"><a href="${dashboardUrl}">View all responses →</a></p>

    <div class="footer">Sent via <a href="https://wintheweek.co" style="color:#a1a1aa;">Win The Week</a></div>
  </div>
</body>
</html>`

  const text = `${weekProgress ? `[${weekProgress}]\n\n` : ''}${employeeName}${teamLabel} submitted their weekly update:\n\n${replyBody}\n\n---\nReply to this email to respond directly to ${employeeName.split(' ')[0]}.\nView dashboard: ${dashboardUrl}`

  return { subject, html, text }
}

export function buildNudgeEmail({
  employeeName,
  senderName,
  replyToAddress,
}: {
  employeeName: string
  senderName: string
  replyToAddress: string
}): { subject: string; html: string; text: string } {
  const firstName = employeeName.split(' ')[0]
  const subject = `Quick reminder — what did you win this week?`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; margin:0; padding:0; }
  .wrap { max-width:520px; margin:0 auto; padding:40px 24px; }
  p { font-size:15px; color:#111111; line-height:1.65; margin:0 0 16px; }
  .footer { margin-top:40px; padding-top:20px; border-top:1px solid #e5e5e5; font-size:12px; color:#a1a1aa; }
</style></head>
<body>
  <div class="wrap">
    <p>Hey ${firstName},</p>
    <p>Just a quick nudge — haven't heard from you yet this week. What did you get done?</p>
    <p>Hit reply and share whatever comes to mind — big wins, small progress, blockers. Takes 30 seconds.</p>
    <p style="color:#52525b; font-size:14px;">— ${senderName}</p>
    <div class="footer">Sent via <a href="https://wintheweek.co" style="color:#a1a1aa;">Win The Week</a></div>
  </div>
</body>
</html>`

  const text = `Hey ${firstName},\n\nJust a quick nudge — haven't heard from you yet this week. What did you get done?\n\nHit reply and share whatever comes to mind — big wins, small progress, blockers. Takes 30 seconds.\n\n— ${senderName}`

  return { subject, html, text }
}

/**
 * Email sent to the employee when the admin replies.
 * Looks like it comes directly from the admin — their name is in the From display.
 * Reply-To is set back to updates@wintheweek.co so further replies are captured.
 */
export function buildManagerReplyEmail({
  employeeFirstName,
  managerReplyBody,
}: {
  employeeFirstName: string
  managerReplyBody: string
}): { subject: string; html: string; text: string } {
  const subject = `Re: Your weekly update`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; margin:0; padding:0; }
  .wrap { max-width:520px; margin:0 auto; padding:40px 24px; }
  p { font-size:15px; color:#111111; line-height:1.65; margin:0 0 16px; white-space:pre-wrap; }
</style></head>
<body>
  <div class="wrap">
    ${managerReplyBody
      .split('\n\n')
      .filter(Boolean)
      .map((para: string) => `<p>${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
      .join('')}
  </div>
</body>
</html>`

  const text = managerReplyBody

  return { subject, html, text }
}

/**
 * Welcome email sent to a new employee the moment they are added to the team.
 * Keeps it warm, ultra-brief, and sets the right expectation.
 */
export function buildWelcomeEmail({
  employeeName,
  adminName,
  orgName,
}: {
  employeeName: string
  adminName: string | null
  orgName: string
}): { subject: string; html: string; text: string } {
  const firstName = employeeName.split(' ')[0]
  const from = adminName ?? orgName
  const subject = `You've been added to Win The Week`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; margin:0; padding:0; }
  .wrap { max-width:520px; margin:0 auto; padding:40px 24px; }
  p { font-size:15px; color:#111111; line-height:1.65; margin:0 0 16px; }
  .footer { margin-top:40px; padding-top:20px; border-top:1px solid #e5e5e5; font-size:12px; color:#a1a1aa; }
  .footer a { color:#a1a1aa; }
</style></head>
<body>
  <div class="wrap">
    <p>Hey ${firstName},</p>
    <p>${from} just added you to <strong>Win The Week</strong> — a simple way to keep the team aligned without meetings or status updates.</p>
    <p>Here's all you need to know:</p>
    <p>Once a week, you'll get a short email asking what you got done. Just hit reply — that's your update. No app to download, no account to create, no extra work.</p>
    <p>Two minutes. Every week. That's it.</p>
    <p style="color:#52525b; font-size:14px;">— The Win The Week team</p>
    <div class="footer">Sent via <a href="https://wintheweek.co">Win The Week</a></div>
  </div>
</body>
</html>`

  const text = `Hey ${firstName},\n\n${from} just added you to Win The Week — a simple way to keep the team aligned without meetings or status updates.\n\nOnce a week, you'll get a short email asking what you got done. Just hit reply — that's your update. No app to download, no account to create, no extra work.\n\nTwo minutes. Every week. That's it.\n\n— The Win The Week team`

  return { subject, html, text }
}

/**
 * Nudge email sent to admins who signed up but stalled during onboarding.
 * Sent ~48h after signup if they haven't added team members or created a campaign.
 */
export function buildOnboardingNudgeEmail({
  adminName,
  appUrl,
}: {
  adminName: string | null
  appUrl: string
}): { subject: string; html: string; text: string } {
  const firstName = adminName ? adminName.split(' ')[0] : 'there'
  const subject = `Finish setting up Win The Week — takes less than 5 minutes`

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { background:#ffffff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; margin:0; padding:0; }
  .wrap { max-width:520px; margin:0 auto; padding:40px 24px; }
  p { font-size:15px; color:#111111; line-height:1.65; margin:0 0 16px; }
  .cta { display:inline-block; background:#22c55e; color:#000000; font-weight:700; font-size:15px; text-decoration:none; padding:12px 28px; border-radius:8px; margin:8px 0 24px; }
  .steps { background:#f9fafb; border-radius:8px; padding:20px 24px; margin:0 0 20px; }
  .steps p { margin:0 0 8px; font-size:14px; }
  .footer { margin-top:40px; padding-top:20px; border-top:1px solid #e5e5e5; font-size:12px; color:#a1a1aa; }
  .footer a { color:#a1a1aa; }
</style></head>
<body>
  <div class="wrap">
    <p>Hey ${firstName},</p>
    <p>You signed up for Win The Week but haven't finished setting up yet — no worries, it takes less than 5 minutes.</p>
    <div class="steps">
      <p><strong>1. Add your team</strong> — paste in a few emails (or connect Slack)</p>
      <p><strong>2. Create a campaign</strong> — pick a day and time for your weekly check-in</p>
      <p style="margin:0;"><strong>That's it.</strong> Your team will get their first email automatically.</p>
    </div>
    <a href="${appUrl}/team" class="cta">Finish setup →</a>
    <p style="color:#71717a; font-size:14px;">Once you're set up, Win The Week runs on autopilot — AI-powered CEO briefings, employee profiles, and performance reviews that write themselves.</p>
    <p style="color:#71717a; font-size:14px;">Questions? Just reply to this email.</p>
    <p style="color:#52525b; font-size:14px;">— Tyler, Win The Week</p>
    <div class="footer">Sent via <a href="https://wintheweek.co">Win The Week</a></div>
  </div>
</body>
</html>`

  const text = `Hey ${firstName},\n\nYou signed up for Win The Week but haven't finished setting up yet — no worries, it takes less than 5 minutes.\n\n1. Add your team — paste in a few emails (or connect Slack)\n2. Create a campaign — pick a day and time for your weekly check-in\n\nThat's it. Your team will get their first email automatically.\n\nFinish setup: ${appUrl}/team\n\nOnce you're set up, Win The Week runs on autopilot — AI-powered CEO briefings, employee profiles, and performance reviews that write themselves.\n\nQuestions? Just reply to this email.\n\n— Tyler, Win The Week`

  return { subject, html, text }
}

export function buildWaitlistConfirmation(email: string): { subject: string; html: string } {
  return {
    subject: "You're on the list 🎉",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { background:#09090b; font-family:Inter,-apple-system,sans-serif; margin:0; padding:0; }
  .wrap { max-width:480px; margin:40px auto; padding:0 20px; }
  .card { background:#111113; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:36px; }
  h2 { font-size:22px; font-weight:700; color:#fafafa; letter-spacing:-0.03em; margin:0 0 12px; }
  p { font-size:15px; color:#a1a1aa; line-height:1.7; margin:0 0 12px; }
  .accent { color:#22c55e; font-weight:600; }
</style></head>
<body>
  <div class="wrap">
    <div class="card">
      <h2>You're on the list ✓</h2>
      <p>Thanks for signing up. We'll reach out to <span class="accent">${escapeHtml(email)}</span> when a spot opens up.</p>
      <p>In the meantime — if you have questions or want to move up the list, reply to this email.</p>
      <p style="margin-top:24px; font-size:13px; color:#52525b;">— The Win The Week team</p>
    </div>
  </div>
</body>
</html>`,
  }
}
