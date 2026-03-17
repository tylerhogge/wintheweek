/**
 * POST /api/responses/[id]/like
 *
 * Toggles the like on a response. If already liked, removes it. If not liked, sets liked_at.
 * Auth: must be an authenticated user in the same org as the submission.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch current liked_at
  const { data: response, error: fetchErr } = await supabase
    .from('responses')
    .select('id, liked_at')
    .eq('id', id)
    .single()

  if (fetchErr || !response) {
    return NextResponse.json({ error: 'Response not found' }, { status: 404 })
  }

  const newLikedAt = response.liked_at ? null : new Date().toISOString()

  const { error: updateErr } = await supabase
    .from('responses')
    .update({ liked_at: newLikedAt })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ liked: newLikedAt !== null, liked_at: newLikedAt })
}
