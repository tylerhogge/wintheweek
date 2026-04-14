import { createClient, getAuthUser, getProfile } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Employee, Response, ManagerReply } from '@/types'
import { EmployeeProfileClient } from './employee-profile-client'
import { format, parseISO, differenceInHours } from 'date-fns'

type ProfileSubmission = {
  id: string
  week_start: string
  sent_at: string | null
  replied_at: string | null
  nudged_at: string | null
  email_status: string
  hidden_at: string | null
  response: {
    id: string
    body_clean: string | null
    created_at: string
    manager_replies: { id: string; body_clean: string; sender_type: string; employee_name: string | null; created_at: string }[]
  } | null
}

type Stats = {
  totalSent: number
  totalReplied: number
  replyRate: number
  currentStreak: number
  avgResponseTimeHrs: number | null
}

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user) redirect('/auth/login')
  if (!profile?.org_id) redirect('/onboarding')

  const supabase = await createClient()

  // Fetch the employee, ensuring they belong to the same org
  const { data: employee } = await supabase
    .from('employees')
    .select('id, org_id, name, email, team, function, active, slack_user_id, manager_of_teams, created_at')
    .eq('id', id)
    .eq('org_id', profile.org_id)
    .single()

  if (!employee) notFound()

  // Parallelize submissions, org, and team queries (all depend on employee.org_id which we now have)
  const [{ data: submissions }, { data: org }, { data: allEmployees }] = await Promise.all([
    supabase
      .from('submissions')
      .select(`
        id, week_start, sent_at, replied_at, nudged_at, email_status, hidden_at,
        response:responses(id, body_clean, created_at, manager_replies(id, body_clean, sender_type, employee_name, created_at))
      `)
      .eq('employee_id', id)
      .not('sent_at', 'is', null)
      .order('week_start', { ascending: false }),
    supabase.from('organizations').select('name').eq('id', profile.org_id).single(),
    supabase.from('employees').select('team').eq('org_id', profile.org_id).eq('active', true),
  ])
  const allTeams = [...new Set((allEmployees ?? []).map(e => e.team).filter(Boolean))] as string[]

  // Calculate stats from submissions
  const typedSubmissions = (submissions ?? []) as unknown as ProfileSubmission[]

  const totalSent = typedSubmissions.length
  const totalReplied = typedSubmissions.filter(s => s.replied_at).length
  const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0

  // Calculate current streak (consecutive weeks replied from most recent backwards)
  let currentStreak = 0
  for (const sub of typedSubmissions) {
    if (sub.replied_at) {
      currentStreak++
    } else {
      break
    }
  }

  // Calculate average response time in hours
  let avgResponseTimeHrs: number | null = null
  const withResponseTime = typedSubmissions.filter(s => s.sent_at && s.replied_at)
  if (withResponseTime.length > 0) {
    const totalHours = withResponseTime.reduce((sum, s) => {
      const hours = differenceInHours(parseISO(s.replied_at!), parseISO(s.sent_at!))
      return sum + hours
    }, 0)
    avgResponseTimeHrs = totalHours / withResponseTime.length
  }

  const stats: Stats = {
    totalSent,
    totalReplied,
    replyRate,
    currentStreak,
    avgResponseTimeHrs,
  }

  const orgName = org?.name ?? 'your company'

  return (
    <EmployeeProfileClient
      employee={employee as Employee}
      submissions={typedSubmissions}
      stats={stats}
      orgName={orgName}
      allTeams={allTeams}
    />
  )
}
