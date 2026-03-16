import { getAuthUser, getProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])
  if (!user) redirect('/auth/login')

  const org = (profile as any)?.organizations

  return (
    <div className="max-w-[640px]">
      <div className="mb-8">
        <h1 className="text-[22px] font-bold tracking-[-0.03em] mb-0.5">Settings</h1>
        <p className="text-sm text-[#71717a]">Manage your workspace preferences</p>
      </div>

      {/* Org settings */}
      <section className="mb-8">
        <p className="text-xs font-semibold tracking-[0.07em] uppercase text-[#71717a] mb-4">Organization</p>
        <div className="bg-surface border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Organization name</p>
              <p className="text-xs text-[#71717a] mt-0.5">{org?.name ?? '—'}</p>
            </div>
            <button className="text-xs border border-white/10 text-[#a1a1aa] hover:text-white px-3 py-1.5 rounded-md transition-colors">Edit</button>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Workspace URL</p>
              <p className="text-xs text-[#71717a] mt-0.5">wintheweek.co/{org?.slug ?? '—'}</p>
            </div>
            <button className="text-xs border border-white/10 text-[#a1a1aa] hover:text-white px-3 py-1.5 rounded-md transition-colors">Edit</button>
          </div>
        </div>
      </section>

      {/* Email settings */}
      <section className="mb-8">
        <p className="text-xs font-semibold tracking-[0.07em] uppercase text-[#71717a] mb-4">Email</p>
        <div className="bg-surface border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Send from</p>
              <p className="text-xs text-[#71717a] mt-0.5">hello@wintheweek.co</p>
            </div>
            <span className="text-xs text-[#52525b] border border-white/[0.07] px-3 py-1 rounded-md">Custom domain on Growth plan</span>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Reply-to domain</p>
              <p className="text-xs text-[#71717a] mt-0.5">inbound.wintheweek.co</p>
            </div>
            <span className="text-xs bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-full">Active</span>
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

      {/* Danger zone */}
      <section>
        <p className="text-xs font-semibold tracking-[0.07em] uppercase text-red-500/70 mb-4">Danger zone</p>
        <div className="bg-surface border border-red-500/20 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Delete organization</p>
            <p className="text-xs text-[#71717a] mt-0.5">Permanently deletes all data. This cannot be undone.</p>
          </div>
          <button className="text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded-md transition-colors">
            Delete
          </button>
        </div>
      </section>
    </div>
  )
}
