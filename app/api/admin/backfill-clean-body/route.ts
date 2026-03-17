/**
 * POST /api/admin/backfill-clean-body
 *
 * One-time utility: re-runs cleanEmailBody() on every response's body_raw
 * and writes the result back to body_clean.
 *
 * Auth: Bearer ${CRON_SECRET} header required.
 *
 * Safe to run multiple times — just overwrites body_clean.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { cleanEmailBody } from '@/lib/utils'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch all responses that have a raw body
  const { data: responses, error: fetchErr } = await supabase
    .from('responses')
    .select('id, body_raw')
    .not('body_raw', 'is', null)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!responses || responses.length === 0) {
    return NextResponse.json({ updated: 0, message: 'No responses found' })
  }

  let updated = 0
  const errors: string[] = []

  for (const response of responses) {
    const cleaned = cleanEmailBody(response.body_raw)
    const { error: updateErr } = await supabase
      .from('responses')
      .update({ body_clean: cleaned })
      .eq('id', response.id)

    if (updateErr) {
      errors.push(`${response.id}: ${updateErr.message}`)
    } else {
      updated++
    }
  }

  return NextResponse.json({
    updated,
    total: responses.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
