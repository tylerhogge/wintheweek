import { Suspense } from 'react'
import { getAuthUser, getProfile, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DigestToggle } from '@/components/settings/digest-toggle'
import { ReplyNotifyToggle } from '@/components/settings/reply-notify-toggle'
import { OrgNameEdit } from '@/components/settings/org-name-edit'
import { SlackConnect } from '@/components/settings/slack-connect'
import { ShameSettings } from '@/components/settings/shame-settings'
import { PrioritiesEditor } from '@/components/settings/priorities-editor'
import { BillingSection } from '@/components/settings/billing-section'
import type { Priority } from '@/types'

// ── Heavy data section — streams in while shell renders instantly ──────────
async function SettingsContent({ orgId, org }: { orgId: string; org: any }) {
  const service = createServiceClient()
  const [orgData, slackData, totalCountData, matchedCountData] = await Promise.all([
    service.from('organizations').select('digest_notify, notify_on_reply, shame_enabled, shame_channel_id, shame_channel_name, shame_email_enabled, auto_nudge, priorities, stripe_customer_id, stripe_subscription_id, plan, plan_status, trial_ends_at, current_period_end').eq('id', orgId).single(),
    service.from('slack_integrations').select('team_name').eq('org_id', orgId).single(),
    service.from('employees').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('active', true),
    service.from('employees').select('id', { count: 'exact', head: true }).eq('org_id', orgId).eq('active', true).not('slack_user_id', 'is', null),
  ])

  const digestNotify = orgData.data?.digest_notify ?? false
  const notifyOnReply = orgData.data?.notify_on_reply ?? true
  const shameEnabled = orgData.data?.shame_enabled ?? false
  const shameChannelId = orgData.data?.shame_channel_id ?? null
  const shameChannelName = orgData.data?.shame_channel_name ?? null
  const shameEmailEnabled = orgData.data?.shame_email_enabled ?? false
  const autoNudge = orgData.data?.auto_nudge ?? false
  const priorities = (orgData.data?.priorities as Priority[] | null) ?? []
  const stripePlan = orgData.data?.plan ?? null
  const planStatus = orgData.data?.plan_status ?? null
  const trialEndsAt = orgData.data?.trial_ends_at ?? null
  const currentPeriodEnd = orgData.data?.current_period_end ?? null
  const hasStripeCustomer = !!orgData.data?.stripe_customer_id
  const slackIntegration = slackData.data ?? null
  const totalCount = totalCountData.count ?? 0
  const matchedCount = matchedCountData.count ?? 0

  return (
    <>
      {/* Billing */}
      <section className="mb-8">
        <p className="text-xs font-semibold tracking-[0.07em] uppercase text-[#71717a] mb-4">Billing</p>
        <BillingSection
          plan={stripePlan}
          planStatus={planStatus}
          trialEndsAt={trialEndsAt}
          currentPeriodEnd={currentPeriodEnd}
          hasStripeCustomer={hasStripeCustomer}
        />
      </section>

      {/* CEO Priorities */}
      <section className="mb-8">
        <p className="text-xs font-semibold tracking-[0.07em] uppercase text-[#71717a] mb-4">CEO Priorities</p>
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <div className="mb-4">
            <p className="text-sm font-medium">Company priorities</p>
            <p className="text-xs text-[#71717a] mt-0.5">
              Set your top priorities and the AI weekly briefing will evaluate how the company is tracking against each one.
            </p>
          </div>
          <PrioritiesEditor initialPriorities={priorities} />
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
              orgId={orgId}
            />
          </div>
        </div>
      </section>

      {/* Wall of Shame */}
      <section className="mb-8">
        <p className="text-xs font-semibold tracking-[0.07em] uppercase text-[#71717a] mb-4">Accountability</p>
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <div className="mb-4">
            <p className="text-sm font-medium">Wall of Shame</p>
            <p className="text-xs text-[#71717a] mt-0.5">
              After the Friday check-in goes out, hold your team accountable with nudges and reports on Monday.
            </p>
          </div>
          <ShameSettings
            slackConnected={!!slackIntegration}
            initialSlackEnabled={shameEnabled}
            initialChannelId={shameChannelId}
            initialChannelName={shameChannelName}
            initialEmailEnabled={shameEmailEnabled}
            initialAutoNudge={autoNudge}
          />
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
              <p className="text-sm font-medium">Email me the weekly CEO briefing</p>
              <p className="text-xs text-[#71717a] mt-0.5">
                Monday at 5 PM — get the AI briefing + all replies emailed to you at end of day.
              </p>
            </div>
            <DigestToggle initialValue={digestNotify} />
          </div>
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Email me each reply as it comes in</p>
              <p className="text-xs text-[#71717a] mt-0.5">
                Get each person&apos;s check-in delivered to your inbox — reply directly to engage with them
              </p>
            </div>
            <ReplyNotifyToggle initialValue={notifyOnReply} />
          </div>
        </div>
      </section>
    </>
  )
}

// ── Skeleton shown while SettingsContent streams in ───────────────────────
function SettingsContentSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Integrations skeleton */}
      <section>
        <div className="h-3 w-24 bg-white/[0.06] rounded mb-4" />
        <div className="bg-surface border border-white/[0.07] rounded-xl px-5 py-4">
          <div className="h-4 w-16 bg-white/[0.08] rounded mb-2" />
          <div className="h-3 w-64 bg-white/[0.04] rounded mb-4" />
          <div className="h-8 w-32 bg-white/[0.06] rounded" />
        </div>
      </section>
      {/* Accountability skeleton */}
      <section>
        <div className="h-3 w-28 bg-white/[0.06] rounded mb-4" />
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <div className="h-4 w-28 bg-white/[0.08] rounded mb-2" />
          <div className="h-3 w-56 bg-white/[0.04] rounded mb-4" />
          <div className="space-y-3 pl-4 border-l-2 border-white/[0.08]">
            <div className="h-10 bg-white/[0.04] rounded" />
            <div className="h-10 bg-white/[0.04] rounded" />
          </div>
        </div>
      </section>
      {/* Email skeleton */}
      <section>
        <div className="h-3 w-12 bg-white/[0.06] rounded mb-4" />
        <div className="bg-surface border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center justify-between">
              <div>
                <div className="h-4 w-24 bg-white/[0.08] rounded mb-1.5" />
                <div className="h-3 w-40 bg-white/[0.04] rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Page shell — renders immediately ──────────────────────────────────────
export default async function SettingsPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user) redirect('/auth/login')

  const org = (profile as any)?.organizations

  return (
    <div className="max-w-[640px]">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold tracking-[-0.04em] mb-0.5">Settings</h1>
        <p className="text-sm text-[#71717a]">Manage your workspace preferences</p>
      </div>

      {/* Org settings — only needs profile data, renders immediately */}
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

      {/* Heavy sections stream in — skeleton shows immediately */}
      {profile?.org_id ? (
        <Suspense fallback={<SettingsContentSkeleton />}>
          <SettingsContent orgId={profile.org_id} org={org} />
        </Suspense>
      ) : null}

      {/* Account — only needs user data, renders immediately */}
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
