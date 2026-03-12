import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Employee } from '@/types'
import { getInitials, avatarGradient } from '@/lib/utils'
import { TeamClient } from './team-client'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
  if (!profile?.org_id) redirect('/onboarding')

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
