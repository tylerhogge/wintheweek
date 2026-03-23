import { Suspense } from 'react'
import { createClient, getAuthUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewCampaignForm } from './new-campaign-form'

// ── Streaming data component ──────────────────────────────────────────────
async function NewCampaignContent({ orgId }: { orgId: string }) {
  const supabase = await createClient()

  const { data: teams } = await supabase
    .from('employees')
    .select('team')
    .eq('org_id', orgId)
    .eq('active', true)
    .not('team', 'is', null)

  const uniqueTeams = [
    ...new Set(teams?.map((e: { team: string | null }) => e.team).filter(Boolean)),
  ] as string[]

  return <NewCampaignForm availableTeams={uniqueTeams} />
}

// ── Skeleton ──────────────────────────────────────────────────────────────
function NewCampaignSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-10 w-full bg-white/[0.04] rounded-md" />
      <div className="h-10 w-full bg-white/[0.04] rounded-md" />
      <div className="h-32 w-full bg-white/[0.04] rounded-md" />
      <div className="h-24 w-full bg-white/[0.04] rounded-xl" />
      <div className="h-36 w-full bg-white/[0.04] rounded-xl" />
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────
export default async function NewCampaignPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user) redirect('/auth/login')
  if (!profile?.org_id) redirect('/onboarding')

  return (
    <div className="max-w-[640px]">
      <div className="mb-8">
        <a href="/campaigns" className="text-xs text-[#71717a] hover:text-white transition-colors mb-3 inline-flex items-center gap-1">
          ← Campaigns
        </a>
        <h1 className="text-[22px] font-bold tracking-[-0.03em] mb-0.5">New campaign</h1>
        <p className="text-sm text-[#71717a]">Configure your weekly email check-in</p>
      </div>

      <Suspense fallback={<NewCampaignSkeleton />}>
        <NewCampaignContent orgId={profile.org_id} />
      </Suspense>
    </div>
  )
}
