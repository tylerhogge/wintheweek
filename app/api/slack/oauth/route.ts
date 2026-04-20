/**
 * GET /api/slack/oauth?code=...
 * Handles the Slack OAuth callback.
 * Exchanges the code for a token, stores the integration, then triggers a user sync.
 */
import { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { exchangeSlackCode } from '@/lib/slack'
import { encrypt } from '@/lib/encryption'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    redirect('/settings?slack=cancelled')
  }

  // Identify the current user's org
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await userClient
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) redirect('/settings?slack=error')

  // Exchange code for access token
  const tokenData = await exchangeSlackCode(code!)
  if (!tokenData) redirect('/settings?slack=error')

  // Upsert the integration record
  const supabase = createServiceClient()
  const { error: upsertErr } = await supabase
    .from('slack_integrations')
    .upsert(
      {
        org_id: profile.org_id,
        access_token: tokenData.access_token, // Kept for backward compat — will be cleared after encryption migration
        access_token_encrypted: encrypt(tokenData.access_token),
        team_id: tokenData.team.id,
        team_name: tokenData.team.name,
        bot_user_id: tokenData.bot_user_id,
      },
      { onConflict: 'org_id' },
    )

  if (upsertErr) {
    console.error('[Slack OAuth] Failed to store integration:', upsertErr)
    redirect('/settings?slack=error')
  }

  // Trigger background user sync (fire and forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wintheweek.co'
  fetch(`${appUrl}/api/slack/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ org_id: profile.org_id }),
  }).catch((err) => console.error('[Slack OAuth] Sync trigger failed:', err))

  // If the org has no employees yet, redirect straight to team import
  // so the admin can immediately import from Slack
  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', profile.org_id)
    .eq('active', true)

  if (count === 0) {
    redirect('/team?slack_import=1')
  }

  redirect('/settings?slack=connected')
}
