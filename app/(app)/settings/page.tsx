import { getAuthUser, getProfile, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DigestToggle } from '@/components/settings/digest-toggle'
import { OrgNameEdit } from '@/components/settings/org-name-edit'
import { SlackConnect } from '@/components/settings/slack-connect'

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user) redirect('/auth/login')

  const org = (profile as any)?.organizations

  // Fetch org settings + Slack integration + employee match counts in parallel
  let digestNotify = false
  let slackIntegration: { team_name: string } | null = null
  let matchedCount = 0
  let totalCount = 0

  if (profile?.org_id) {
    const service = createServiceClient()
    const [orgData, slackData, employeeData] = await Promise.all([
      service.from('organizations').select('digest_notify').eq('id', profile.org_id).single(),
      service.from('slack_integrations').select('team_name').eq('org_id', profile.org_id).single(),
      service.from('employees').select('slack_user_id').eq('org_id', profile.org_id).eq('active', true),
    ])
    digestNotify = orgData.data?.digest_notify ?? false
    slackIntegration = slackData.data ?? null
    totalCount = employeeData.data?.length ?? 0
    matchedCount = employeeData.data?.filter((e: any) => e.slack_user_id).length ?? 0
  }

  return (
    <div className="max-w-[640px]">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold tracking-[-0.04em] mb-0.5">Settings</h1>
        <p className="text-sm text-[#71717a]">Manage your workspace preferences</p>
      </div>

      {/* Org settings */}
      <section className="mb-8">
        <p className="text-xs font-semibold tracking-[0.07em] uppercase text-[#71717a] mb-4">Organization</p>
        <div className="bg-surface border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
          <div className="px-5 py-4">
            <OrgNameEdit initialName={org?.name ?? ''} />
          </div>
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Workspace URL</p>
              <p className="text-xs text-[#71717a] mt-0.5">wintheweek.co/{org?.slug ?? '—'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="mb-8">
        <p className="text-xs font-semibold tracking-[0.07em] uppercase text-[#71717a] mb-4">Integrations</p>
        <div className="bg-surface border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
          <div className="px-5 py-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium">Slack</p>
                <p className="text-xs text-[#71717a] mt-0.5 max-w-[360px]">
                  Send check-ins and nudges via Slack DM instead of email.
                  Employees matched by email address — unmatched members still receive email.
                </p>
              </div>
            </div>
            <SlackConnect
              isConnected={!!slackIntegration}
              teamName={slackIntegration?.team_name}
              matchedCount={matchedCount}
              totalCount={totalCount}
              orgId={profile?.org_id ?? ''}
            />
          </div>
        </div>
      </section>

      {/* Email settings */}
      <section className="mb-8">
        <p className="text-xs font-semibold tracking-[0.07em] uppercase text-[#71717a] mb-4">Email</p>
        <div className="bg-surface border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Send from</p>
              <p className="text-xs text-[#71717a] mt-0.5">hello@wintheweek.co</p>
            </div>
            <span className="text-xs text-[#52525b] border border-white/[0.07] px-3 py-1 rounded-md w-fit">Custom domain on Growth plan</span>
          </div>
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Reply-to address</p>
              <p className="text-xs text-[#71717a] mt-0.5">updates@wintheweek.co</p>
            </div>
            <span className="text-xs bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-full w-fit">Active</span>
          </div>
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Email me the weekly digest</p>
              <p className="text-xs text-[#71717a] mt-0.5">
                Get the AI summary + all replies emailed to you once everyone has responded
              </p>
            </div>
            <DigestToggle initialValue={digestNotify} />
          </div>
        </div>
      </section>

      {/* Account */}
      <section className="mb-8">
        <p className="text-xs font-semibold tracking-[0.07em] uppercase text-[#71717a] mb-4">Account</p>
        <div className="bg-surface border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-[#71717a] mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
