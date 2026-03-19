/**
 * GET /api/slack/install
 * Redirects the admin to Slack's OAuth authorization page.
 */
import { redirect } from 'next/navigation'
import { buildSlackOAuthUrl } from '@/lib/slack'

export async function GET() {
  redirect(buildSlackOAuthUrl())
}
