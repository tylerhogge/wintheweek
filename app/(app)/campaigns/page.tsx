import { createClient, getAuthUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Campaign } from '@/types'
import SendTestEmail from './send-test-email'

const FREQUENCY_LABEL: Record<Campaign['frequency'], string> = {
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
}

const DAY_LABEL: Record<number, string> = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday',
}

export default async function CampaignsPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user) redirect('/auth/login')
  if (!profile?.org_id) redirect('/onboarding')

  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('org_id', profile.org_id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] mb-0.5">Emails</h1>
          <p className="text-sm text-[#71717a]">Manage your weekly email check-ins</p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-1.5 text-sm font-semibold bg-white text-black px-4 py-2 rounded-md hover:bg-white/90 transition-colors"
        >
          <span className="text-lg leading-none">+</span> New email
        </Link>
      </div>

      {campaigns?.length === 0 ? (
        <div className="text-center py-24 border border-white/[0.07] rounded-xl">
          <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <p className="text-sm font-medium text-white mb-1">No emails yet</p>
          <p className="text-sm text-[#71717a] mb-5">Create your first email to start collecting weekly check-ins.</p>
          <Link href="/campaigns/new" className="text-sm font-semibold bg-accent text-black px-4 py-2 rounded-md hover:bg-accent/90 transition-colors">
            Create email →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {campaigns?.map((c: Campaign): React.ReactNode => (
            <div
              key={c.id}
              className="bg-surface border border-white/[0.07] rounded-xl px-6 py-5 flex items-center justify-between hover:border-white/[0.12] transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Status dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.active ? 'bg-accent' : 'bg-[#52525b]'}`} />
                <div>
                  <p className="text-[14px] font-semibold tracking-tight">{c.name}</p>
                  <p className="text-xs text-[#71717a] mt-0.5">
                    {FREQUENCY_LABEL[c.frequency]} · {DAY_LABEL[c.send_day]} at {c.send_time} {c.timezone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${c.active ? 'bg-accent/10 border-accent/25 text-accent' : 'bg-white/[0.04] border-white/10 text-[#71717a]'}`}>
                  {c.active ? 'Active' : 'Paused'}
                </span>
                <Link
                  href={`/campaigns/${c.id}`}
                  className="text-xs text-[#71717a] hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-md transition-colors"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <SendTestEmail
        campaigns={campaigns ?? []}
        defaultEmail={user.email ?? ''}
        defaultName={profile?.name ?? user.email ?? 'there'}
      />
    </div>
  )
}
