/**
 * POST /api/monday-jobs
 *
 * Single Monday cron endpoint that runs the right job based on current time.
 * Vercel Hobby plan only allows 2 cron slots, so we use one slot with
 * multiple scheduled times via a single path.
 *
 * Escalation ladder (all times MDT / America/Denver):
 *   9 AM  → Auto-nudge (gentle reminder to non-respondents)
 *   1 PM  → Wall of Shame (Slack post + admin email report)
 *   5 PM  → CEO Briefing (AI-generated weekly digest)
 *
 * The endpoint detects which job to run based on a `job` query param,
 * falling back to running all jobs whose time has passed.
 */

import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/auth'

const JOBS_CONFIG = {
  'auto-nudge': '/api/auto-nudge',
  'wall-of-shame': '/api/wall-of-shame',
  'email-briefing': '/api/email-briefing',
} as const

type JobName = keyof typeof JOBS_CONFIG

export const maxDuration = 120

export async function POST(req: Request) {
  const authErr = verifyCronSecret(req)
  if (authErr) return authErr

  const url = new URL(req.url)
  const jobParam = url.searchParams.get('job') as JobName | null
  const authHeader = req.headers.get('authorization') ?? ''

  // Determine which jobs to run
  const jobsToRun: JobName[] = jobParam && JOBS_CONFIG[jobParam]
    ? [jobParam]
    : getAllDueJobs()

  const results: { job: string; status: string; response?: any }[] = []

  // Run jobs sequentially (they share rate limits and DB connections)
  for (const job of jobsToRun) {
    const jobUrl = `${url.origin}${JOBS_CONFIG[job]}`
    console.log(`[monday-jobs] Running ${job} via ${jobUrl}`)

    try {
      const res = await fetch(jobUrl, {
        method: 'POST',
        headers: { 'Authorization': authHeader },
      })

      const data = await res.json().catch(() => ({ status: res.status }))
      results.push({ job, status: res.ok ? 'ok' : `error ${res.status}`, response: data })
      console.log(`[monday-jobs] ${job} → ${res.status}`)
    } catch (err) {
      console.error(`[monday-jobs] ${job} failed:`, err)
      results.push({ job, status: `fetch error: ${String(err)}` })
    }
  }

  console.log('[monday-jobs] complete:', JSON.stringify(results))
  return NextResponse.json({ ok: true, results })
}

/**
 * Determine which jobs are due based on current MDT hour.
 * This handles the case where the cron fires and we need to decide
 * which escalation step(s) to run.
 */
function getAllDueJobs(): JobName[] {
  // Get current hour in MDT
  const now = new Date()
  const mdtTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Denver' }))
  const hour = mdtTime.getHours()

  const jobs: JobName[] = []

  if (hour >= 9) jobs.push('auto-nudge')
  if (hour >= 13) jobs.push('wall-of-shame')
  if (hour >= 17) jobs.push('email-briefing')

  return jobs
}

// Allow Vercel cron to call via GET too
export { POST as GET }
