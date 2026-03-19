/**
 * lib/slack.ts
 *
 * Slack API helpers for Win the Week:
 *  - OAuth helpers
 *  - Sending DMs (check-ins and nudges)
 *  - Looking up users by email
 *  - Verifying inbound webhook signatures
 *  - Block Kit message builders
 */

import * as crypto from 'crypto'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SlackSendResult =
  | { ok: true; ts: string; channel: string }
  | { ok: false; error: string }

// ── OAuth URL builder ─────────────────────────────────────────────────────────

export function buildSlackOAuthUrl(): string {
  const clientId = process.env.SLACK_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/oauth`
  const scopes = [
    'chat:write',
    'im:write',
    'users:read',
    'users:read.email',
  ].join(',')

  return (
    `https://slack.com/oauth/v2/authorize` +
    `?client_id=${clientId}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`
  )
}

// ── OAuth token exchange ──────────────────────────────────────────────────────

export async function exchangeSlackCode(code: string): Promise<{
  access_token: string
  team: { id: string; name: string }
  bot_user_id: string
} | null> {
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/oauth`
  const params = new URLSearchParams({
    code,
    redirect_uri: redirectUri,
    client_id: process.env.SLACK_CLIENT_ID ?? '',
    client_secret: process.env.SLACK_CLIENT_SECRET ?? '',
  })

  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await res.json()
  if (!data.ok) {
    console.error('[Slack OAuth] Exchange failed:', data.error)
    return null
  }

  return {
    access_token: data.access_token,
    team: data.team,
    bot_user_id: data.bot_user_id,
  }
}

// ── User lookup by email ──────────────────────────────────────────────────────

export async function lookupSlackUserByEmail(
  token: string,
  email: string,
): Promise<string | null> {
  const res = await fetch(
    `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const data = await res.json()
  if (!data.ok || !data.user?.id) return null
  // Filter out deactivated users
  if (data.user?.deleted) return null
  return data.user.id as string
}

// ── Send a DM ─────────────────────────────────────────────────────────────────

/**
 * Opens a DM channel with a user (idempotent) and sends a Block Kit message.
 */
export async function sendSlackDM(
  token: string,
  slackUserId: string,
  blocks: object[],
  fallbackText: string,
): Promise<SlackSendResult> {
  // 1. Open (or retrieve) the DM channel
  const openRes = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users: slackUserId }),
  })
  const openData = await openRes.json()
  if (!openData.ok) {
    return { ok: false, error: `conversations.open failed: ${openData.error}` }
  }

  const channelId: string = openData.channel.id

  // 2. Post the message
  const postRes = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
      text: fallbackText,
      blocks,
    }),
  })
  const postData = await postRes.json()
  if (!postData.ok) {
    return { ok: false, error: `chat.postMessage failed: ${postData.error}` }
  }

  return { ok: true, ts: postData.ts, channel: channelId }
}

// ── Webhook signature verification ───────────────────────────────────────────

/**
 * Verifies a Slack Events API request using the signing secret.
 * Must be called with the raw request body string (before JSON.parse).
 */
export function verifySlackSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET ?? ''

  // Reject requests older than 5 minutes (replay attack prevention)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false

  const sigBasestring = `v0:${timestamp}:${rawBody}`
  const expectedSig =
    'v0=' +
    crypto
      .createHmac('sha256', signingSecret)
      .update(sigBasestring)
      .digest('hex')

  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(signature),
    )
  } catch {
    return false
  }
}

// ── Block Kit message builders ────────────────────────────────────────────────

/**
 * Builds a Block Kit check-in message.
 * Mirrors the email campaign body, replacing {{name}} with the employee's first name.
 */
export function buildCheckinBlocks(
  employeeName: string,
  campaignBody: string,
): { blocks: object[]; fallbackText: string } {
  const firstName = employeeName.split(' ')[0]
  const personalisedBody = campaignBody.replace(/\{\{name\}\}/g, firstName)

  const blocks: object[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: personalisedBody,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '💬 Just reply to this message — your update goes straight to the dashboard.',
        },
      ],
    },
  ]

  return { blocks, fallbackText: personalisedBody }
}

/**
 * Builds a Block Kit nudge message.
 */
export function buildNudgeBlocks(
  employeeName: string,
  senderName: string,
): { blocks: object[]; fallbackText: string } {
  const firstName = employeeName.split(' ')[0]
  const text = `Hey ${firstName} — haven't heard from you yet this week. What did you get done?\n\nReply here and I'll pass it along.`

  const blocks: object[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Nudge from *${senderName}* via Win the Week`,
        },
      ],
    },
  ]

  return { blocks, fallbackText: text }
}
