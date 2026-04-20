/**
 * GET /api/slack/channels
 *
 * Returns a list of public Slack channels for the authenticated user's org.
 * Used by the Slack import modal to let admins pick specific channels.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'
import { resolveSlackToken, listSlackChannels } from '@/lib/slack'

export async function GET() {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

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

  const channels = await listSlackChannels(token)

  return NextResponse.json({ ok: true, channels })
}
