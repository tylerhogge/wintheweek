import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAILS = ['tyler@pelionvp.com']

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser()
  if (!user || !SUPER_ADMIN_EMAILS.includes(user.email ?? '')) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-bg text-[#fafafa]">
      {/* Admin top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-[#18181b] border-b border-white/[0.07] flex items-center px-6 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-red-500 rounded flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span className="text-sm font-semibold text-white">Win The Week — Admin</span>
        </div>
        <a href="/dashboard" className="text-xs text-[#71717a] hover:text-white transition-colors ml-auto">
          ← Back to app
        </a>
      </header>
      <main className="pt-12">
        {children}
      </main>
    </div>
  )
}
