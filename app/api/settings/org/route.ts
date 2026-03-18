import { NextResponse } from 'next/server'
import { getAuthUser, getProfile, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user || !profile?.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('organizations')
    .update({ name: name.trim() })
    .eq('id', profile.org_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
