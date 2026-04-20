/**
 * POST /api/slack/import
 *
 * Imports employees from a connected Slack workspace.
 *
 * Two modes:
 *   { mode: 'all' }               — imports every real user in the workspace
 *   { mode: 'channels', channel_ids: ['C123', ...] }  — imports members of specific channels
 *
 * For each user imported:
 *   - Skips bots, deactivated users, and users without email
 *   - Upserts into the employees table (dedupes by org_id + email)
 *   - Sets slack_user_id automatically
 *   - Uses channel name as the `team` field (channel mode only)
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { resolveSlackToken, listSlackUsers, getSlackChannelMembers, listSlackChannels } from '@/lib/slack'
import { getResend, buildWelcomeEmail } from '@/lib/resend'
import { checkRateLimit, rateLimitKeyFromUser } from '@/lib/rate-limit'

type SlackMember = {
  slack_user_id: string
  name: string
  email: string
  team: string | null
}

export async function POST(req: Request) {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  // Rate limit: 5 imports per minute
  const rl = checkRateLimit(rateLimitKeyFromUser(ctx.userId, 'slack-import'), { limit: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const body = await req.json()
  const mode: 'all' | 'channels' = body.mode
  const channelIds: string[] = body.channel_ids ?? []

  if (mode !== 'all' && mode !== 'channels') {
    return NextResponse.json({ error: 'Invalid mode — must be "all" or "channels"' }, { status: 400 })
  }
  if (mode === 'channels' && channelIds.length === 0) {
    return NextResponse.json({ error: 'No channels selected' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: integration } = await supabase
    .from('slack_integrations')
    .select('access_token, access_token_encrypted')
    .eq('org_id', ctx.orgId)
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'No Slack integration found' }, { status: 404 })
  }

  const token = resolveSlackToken(integration)
  if (!token) {
    return NextResponse.json({ error: 'Could not resolve Slack token' }, { status: 500 })
  }

  let membersToImport: SlackMember[] = []

  if (mode === 'all') {
    // ── Import all workspace users ──────────────────────────────────────
    const users = await listSlackUsers(token)
    membersToImport = users
      .filter((u) => !u.is_bot && !u.deleted && u.email)
      .map((u) => ({
        slack_user_id: u.id,
        name: u.name,
        email: u.email!,
        team: null,
      }))
  } else {
    // ── Import from specific channels ───────────────────────────────────
    // Fetch channel names for team labels
    const allChannels = await listSlackChannels(token)
    const channelNameMap = new Map(allChannels.map((ch) => [ch.id, ch.name]))

    // Fetch all workspace users upfront so we can resolve IDs → profiles
    const allUsers = await listSlackUsers(token)
    const userMap = new Map(allUsers.map((u) => [u.id, u]))

    // Deduplicate across channels (a user in #eng and #product should appear once)
    const seen = new Set<string>()

    for (const channelId of channelIds) {
      const memberIds = await getSlackChannelMembers(token, channelId)
      const channelName = channelNameMap.get(channelId) ?? null

      for (const memberId of memberIds) {
        if (seen.has(memberId)) continue
        seen.add(memberId)

        const user = userMap.get(memberId)
        if (!user || user.is_bot || user.deleted || !user.email) continue

        membersToImport.push({
          slack_user_id: memberId,
          name: user.name,
          email: user.email,
          team: channelName,
        })
      }
    }
  }

  if (membersToImport.length === 0) {
    return NextResponse.json({ error: 'No importable users found (all bots or missing emails)' }, { status: 400 })
  }

  // Fetch org name for welcome emails
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', ctx.orgId)
    .single()

  // Find which emails already exist
  const importEmails = membersToImport.map((m) => m.email.toLowerCase())
  const { data: existing } = await supabase
    .from('employees')
    .select('email')
    .eq('org_id', ctx.orgId)
    .in('email', importEmails)

  const existingEmails = new Set((existing ?? []).map((e: any) => e.email))
  const newMembers = membersToImport.filter((m) => !existingEmails.has(m.email.toLowerCase()))

  // Build upsert rows
  const rows = membersToImport.map((m) => ({
    org_id: ctx.orgId,
    name: m.name,
    email: m.email.toLowerCase(),
    team: m.team,
    slack_user_id: m.slack_user_id,
    active: true,
  }))

  const { error } = await supabase
    .from('employees')
    .upsert(rows, { onConflict: 'org_id,email', ignoreDuplicates: false })

  if (error) {
    console.error('[slack-import] Upsert failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // For existing employees, also update their slack_user_id if not set
  // (ignoreDuplicates: false means upsert will update, but only if we have the right merge behavior)
  // Let's explicitly update slack_user_id for existing employees who don't have one
  for (const m of membersToImport) {
    if (existingEmails.has(m.email.toLowerCase())) {
      await supabase
        .from('employees')
        .update({ slack_user_id: m.slack_user_id })
        .eq('org_id', ctx.orgId)
        .eq('email', m.email.toLowerCase())
        .is('slack_user_id', null)
    }
  }

  auditLog({
    action: 'slack.import',
    actorId: ctx.userId,
    orgId: ctx.orgId,
    metadata: { mode, total: rows.length, new: newMembers.length, channels: mode === 'channels' ? channelIds : undefined },
  })

  // Send welcome emails to newly added members (non-blocking)
  if (newMembers.length > 0) {
    const orgName = org?.name ?? 'Your team'

    const emailPromises = newMembers.map(async (m) => {
      try {
        const { subject, html, text } = buildWelcomeEmail({
          employeeName: m.name,
          adminName: ctx.name,
          orgName,
        })
        await getResend().emails.send({
          from: `${process.env.FROM_NAME ?? 'Win The Week'} <${process.env.FROM_EMAIL ?? 'updates@wintheweek.co'}>`,
          to: m.email,
          subject,
          html,
          text,
        })
      } catch (emailErr) {
        console.error(`Welcome email failed for ${m.email} (non-fatal):`, emailErr)
      }
    })

    Promise.all(emailPromises).catch(() => {})
  }

  return NextResponse.json({
    ok: true,
    imported: rows.length,
    new: newMembers.length,
    existing: rows.length - newMembers.length,
    slack_synced: rows.length,
  })
}
