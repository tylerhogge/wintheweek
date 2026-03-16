import { Resend } from 'resend'

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

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; background:#ffffff; }
    .wrap { max-width:520px; margin:0 auto; padding:40px 24px; }
    p { font-size:15px; color:#111111; line-height:1.6; margin:0 0 16px; }
    .footer { margin-top:32px; font-size:12px; color:#999999; }
    .footer a { color:#999999; }
  </style>
</head>
<body>
  <div class="wrap">
    ${personalisedBody
      .split('\n\n')
      .map((p: string): string => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('')}
    <div class="footer">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`

  const text = `${personalisedBody}\n\n---\nJust reply to this email with what you got done.`

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
      <p>Thanks for signing up. We'll reach out to <span class="accent">${email}</span> when a spot opens up.</p>
      <p>In the meantime — if you have questions or want to move up the list, reply to this email.</p>
      <p style="margin-top:24px; font-size:13px; color:#52525b;">— The Win the Week team</p>
    </div>
  </div>
</body>
</html>`,
  }
}
