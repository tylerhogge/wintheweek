import { redirect } from 'next/navigation'
import { createClient, getAuthUser, getProfile, createServiceClient } from '@/lib/supabase/server'
import { OnboardingForm } from './onboarding-form'
import { TeamMemberLanding } from './team-member-landing'
import { NotAdmittedLanding } from './not-admitted-landing'

export default async function OnboardingPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])

  if (!user) redirect('/auth/login')
  // Already has an org — go to dashboard
  if (profile?.org_id) redirect('/dashboard')

  const supabase = createServiceClient()

  // Check if this email exists as an employee in any org
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

  // Check if this email is on the waitlist (i.e. has been approved to create an org)
  const { data: waitlistEntry } = await supabase
    .from('waitlist')
    .select('id, email')
    .eq('email', user.email?.toLowerCase() ?? '')
    .limit(1)
    .single()

  if (!waitlistEntry) {
    return <NotAdmittedLanding userEmail={user.email ?? ''} />
  }

  return <OnboardingForm />
}
