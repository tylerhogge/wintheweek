import { Suspense } from 'react'
import { redirect, notFound } from 'next/navigation'
import { format, startOfWeek } from 'date-fns'
import { getAuthUser, getProfile, createServiceClient } from '@/lib/supabase/server'
import { EditCampaignForm } from './edit-campaign-form'

async function EditCampaignContent({ id, orgId }: { id: string; orgId: string }) {
  const service = createServiceClient()

  const [campaignRes, teamsRes, submissionsRes] = await Promise.all([
    service.from('campaigns').select('id, org_id, name, subject, body, frequency, send_day, send_time, timezone, active, target_teams, created_at').eq('id', id).eq('org_id', orgId).single(),
    service.from('employees').select('team').eq('org_id', orgId).eq('active', true).not('team', 'is', null),
    (async () => {
      const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      return service
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .eq('week_start', currentWeekStart)
        .not('sent_at', 'is', null)
    })(),
  ])

  if (campaignRes.error || !campaignRes.data) notFound()

  const allTeams = teamsRes.data
    ? [...new Set(teamsRes.data.map((e: { team: string | null }) => e.team).filter(Boolean) as string[])].sort()
    : []

  const alreadySentThisWeek = submissionsRes.count !== null && submissionsRes.count > 0

  return <EditCampaignForm campaign={campaignRes.data} allTeams={allTeams} alreadySentThisWeek={alreadySentThisWeek} />
}

function EditCampaignSkeleton() {
  return (
    <div className="max-w-[640px] animate-pulse">
      <div className="mb-8">
        <div className="h-3 w-20 bg-white/[0.06] rounded mb-3" />
        <div className="h-6 w-48 bg-white/[0.08] rounded mb-1" />
        <div className="h-3 w-56 bg-white/[0.04] rounded" />
      </div>
      <div className="space-y-5">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="h-3 w-24 bg-white/[0.06] rounded mb-2" />
            <div className="h-10 bg-white/[0.04] rounded-md" />
          </div>
        ))}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <div className="h-4 w-20 bg-white/[0.08] rounded mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-3 w-16 bg-white/[0.06] rounded mb-2" />
                <div className="h-10 bg-white/[0.04] rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user) redirect('/auth/login')
  if (!profile?.org_id) redirect('/campaigns')

  const { id } = await params

  return (
    <Suspense fallback={<EditCampaignSkeleton />}>
      <EditCampaignContent id={id} orgId={profile.org_id} />
    </Suspense>
  )
}
