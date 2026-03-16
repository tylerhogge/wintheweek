import { redirect } from 'next/navigation'
import { getAuthUser, getProfile } from '@/lib/supabase/server'
import { AppShell } from '@/components/nav/app-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // These are memoised via React.cache — no extra network calls when pages call them too
  const [user, profile] = await Promise.all([getAuthUser(), getProfile()])

  if (!user) redirect('/auth/login')

  return (
    <AppShell profile={profile}>
      {children}
    </AppShell>
  )
}
