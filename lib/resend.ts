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

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body { background:#09090b; margin:0; padding:0; font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif; }
    .wrap { max-width:560px; margin:40px auto; padding:0 20px; }
    .card { background:#111113; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:36px; }
    .logo { display:flex; align-items:center; gap:8px; margin-bottom:32px; }
    .logo-mark { width:28px; height:28px; background:#22c55e; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; }
    .logo-text { font-size:15px; font-weight:600; color:#fafafa; }
    h2 { font-size:20px; font-weight:700; color:#fafafa; margin:0 0 16px; letter-spacing:-0.03em; }
    p { font-size:15px; color:#a1a1aa; line-height:1.7; margin:0 0 16px; }
    p strong { color:#fafafa; font-weight:500; }
    .reply-hint { margin-top:24px; padding:16px; background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.2); border-radius:8px; font-size:13px; color:#a1a1aa; }
    .footer { margin-top:24px; font-size:12px; color:#52525b; text-align:center; }
    .footer a { color:#52525b; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="logo">
        <div class="logo-mark">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <span class="logo-text">Win the Week</span>
      </div>
      ${personalisedBody
        .split('\n\n')
        .map((p: string): string => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
        .join('')}
      <div class="reply-hint">
        👆 <strong style="color:#fafafa">Just hit Reply</strong> and share what you accomplished. No login required.
      </div>
    </div>
    <div class="footer">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe">Unsubscribe</a> · Win the Week
    </div>
  </div>
</body>
</html>`

  const text = `${personalisedBody}\n\n---\nJust reply to this email with what you got done. No login needed.\n\nWin the Week`

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
