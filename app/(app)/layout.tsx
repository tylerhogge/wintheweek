import { redirect } from 'next/navigation'
import { getAuthUser, getProfile } from '@/lib/supabase/server'
import { AppShell } from '@/components/nav/app-shell'

// Edge runtime: V8 isolates start in ~0ms vs 200-500ms for Node.js workers.
// All pages in this route group inherit Edge runtime automatically.
// Safe because we only use fetch-based APIs (Supabase, cookies) — no Node.js built-ins.
export const runtime = 'edge'

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
