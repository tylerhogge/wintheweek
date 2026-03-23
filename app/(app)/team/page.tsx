import { Suspense } from 'react'
import { createClient, getAuthUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Employee } from '@/types'
import { TeamClient } from './team-client'

// ── Streaming data component — fetches employees then renders ─────────────
async function TeamContent({ orgId }: { orgId: string }) {
  const supabase = await createClient()

  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('org_id', orgId)
    .order('name')

  const active = employees?.filter((e: Employee): boolean => e.active) ?? []
  const inactive = employees?.filter((e: Employee): boolean => !e.active) ?? []

  return <TeamClient active={active} inactive={inactive} />
}

// ── Skeleton shown while TeamContent streams in ───────────────────────────
function TeamSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <div className="h-6 w-16 bg-white/[0.08] rounded mb-2" />
          <div className="h-3 w-32 bg-white/[0.04] rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-white/[0.06] rounded-md" />
          <div className="h-9 w-28 bg-white/[0.08] rounded-md" />
        </div>
      </div>
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.07]">
          <div className="h-3 w-full bg-white/[0.04] rounded" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="px-5 py-3.5 flex items-center gap-3 border-b border-white/[0.05] last:border-0">
            <div className="w-7 h-7 rounded-full bg-white/[0.06] shrink-0" />
            <div className="flex-1">
              <div className="h-3.5 w-32 bg-white/[0.08] rounded mb-1.5" />
              <div className="h-3 w-44 bg-white/[0.04] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page shell — renders immediately ──────────────────────────────────────
export default async function TeamPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user) redirect('/auth/login')
  if (!profile?.org_id) redirect('/onboarding')

  return (
    <div>
      <Suspense fallback={<TeamSkeleton />}>
        <TeamContent orgId={profile.org_id} />
      </Suspense>
    </div>
  )
}
