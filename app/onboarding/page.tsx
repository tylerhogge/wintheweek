import { redirect } from 'next/navigation'
import { createClient, getAuthUser, getProfile, createServiceClient } from '@/lib/supabase/server'
import { OnboardingForm } from './onboarding-form'
import { TeamMemberLanding } from './team-member-landing'

export default async function OnboardingPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])

  if (!user) redirect('/auth/login')
  // Already has an org — go to dashboard
  if (profile?.org_id) redirect('/dashboard')

  const supabase = createServiceClient()

  // Check if this email exists as an employee in any org
  const { data: employeeMatch } = await supabase
    .from('employees')
    .select('id, org_id, name, manager_of_teams, organizations(name)')
    .eq('email', user.email?.toLowerCase() ?? '')
    .eq('active', true)
    .limit(1)
    .single()

  if (employeeMatch?.org_id) {
    // Managers get linked to the org and sent to the dashboard
    const isManager = employeeMatch.manager_of_teams && (employeeMatch.manager_of_teams as string[]).length > 0
    if (isManager) {
      // Link their profile to the org so they can access the dashboard
      await supabase
        .from('profiles')
        .update({ org_id: employeeMatch.org_id, role: 'member' })
        .eq('id', user.id)
      redirect('/dashboard')
    }

    // Regular employees don't need to log in — they reply via email
    const orgName = (employeeMatch as any).organizations?.name ?? 'your team'
    return <TeamMemberLanding orgName={orgName} employeeName={employeeMatch.name} userEmail={user.email ?? ''} />
  }

  // No employee match — this is a new org admin creating their workspace.
  // During beta, anyone who signs up can create an org (waitlist gate removed for launch).
  return <OnboardingForm />
}
