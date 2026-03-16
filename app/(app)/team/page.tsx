import { createClient, getAuthUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Employee } from '@/types'
import { TeamClient } from './team-client'

export default async function TeamPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user) redirect('/auth/login')
  if (!profile?.org_id) redirect('/onboarding')

  const supabase = await createClient()

  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('name')

  const active = employees?.filter((e: Employee): boolean => e.active) ?? []
  const inactive = employees?.filter((e: Employee): boolean => !e.active) ?? []

  return (
    <div>
      <TeamClient active={active} inactive={inactive} />
    </div>
  )
}
