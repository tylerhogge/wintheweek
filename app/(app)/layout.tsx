import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/nav/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Fetch profile + org
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar profile={profile} />

      {/* Main content — offset for fixed sidebar */}
      <main className="flex-1 ml-[220px] min-h-screen">
        <div className="max-w-[1040px] mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
