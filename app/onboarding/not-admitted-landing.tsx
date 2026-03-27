'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'

type Props = {
  userEmail: string
}

export function NotAdmittedLanding({ userEmail }: Props) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleJoinWaitlist() {
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      })
      if (res.ok) {
        // Sign them out and redirect to homepage — they'll get a confirmation email
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/?waitlisted=1')
      }
    } catch {
      // Silently fail — they can join via the homepage
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight mb-10 justify-center">
          <Logo size={28} />
          Win The Week
        </Link>

        <div className="bg-surface border border-white/[0.08] rounded-xl p-8 text-center">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h2 className="text-[20px] font-bold tracking-[-0.03em] mb-2">
            We're not quite ready for you yet
          </h2>
          <p className="text-sm text-[#a1a1aa] mb-6 leading-relaxed">
            Win The Week is currently in beta. Join the waitlist and we'll let you know as soon as your spot opens up.
          </p>

          <button
            onClick={handleJoinWaitlist}
            className="w-full bg-white text-black font-semibold text-sm py-2.5 rounded-md hover:bg-white/90 transition-colors mb-3"
          >
            Join the waitlist
          </button>

          <p className="text-[11px] text-[#3f3f46] mb-4">
            Signed in as {userEmail}
          </p>

          <button
            onClick={handleSignOut}
            className="text-sm text-[#71717a] hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
