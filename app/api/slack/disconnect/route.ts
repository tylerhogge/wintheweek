/**
 * POST /api/slack/disconnect
 * Removes the Slack integration for the current user's org,
 * and clears all employee slack_user_id values.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await userClient
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) return NextResponse.json({ error: 'No org' }, { status: 400 })

  const supabase = createServiceClient()

  // Delete the integration
  await supabase.from('slack_integrations').delete().eq('org_id', profile.org_id)

  // Clear Slack user IDs from all employees in the org
  await supabase
    .from('employees')
    .update({ slack_user_id: null })
    .eq('org_id', profile.org_id)

  return NextResponse.json({ ok: true })
}
