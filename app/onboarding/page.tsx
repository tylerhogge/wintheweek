import { redirect } from 'next/navigation'
import { createClient, getAuthUser, getProfile, createServiceClient } from '@/lib/supabase/server'
import { OnboardingForm } from './onboarding-form'
import { TeamMemberLanding } from './team-member-landing'

export default async function OnboardingPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])

  if (!user) redirect('/auth/login')
  // Already has an org — go to dashboard
  if (profile?.org_id) redirect('/dashboard')

  // Check if this email exists as an employee in any org
  const supabase = createServiceClient()
  const { data: employeeMatch } = await supabase
    .from('employees')
    .select('id, org_id, name, organizations(name)')
    .eq('email', user.email?.toLowerCase() ?? '')
    .eq('active', true)
    .limit(1)
    .single()

  if (employeeMatch?.org_id) {
    const orgName = (employeeMatch as any).organizations?.name ?? 'your team'
    return <TeamMemberLanding orgName={orgName} employeeName={employeeMatch.name} userEmail={user.email ?? ''} />
  }

  return <OnboardingForm />
}
