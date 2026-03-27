'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'

type Props = {
  orgName: string
  employeeName: string
  userEmail: string
}

export function TeamMemberLanding({ orgName, employeeName, userEmail }: Props) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
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
          <div className="w-14 h-14 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>

          <h2 className="text-[20px] font-bold tracking-[-0.03em] mb-2">
            You're all set!
          </h2>
          <p className="text-sm text-[#a1a1aa] mb-2 leading-relaxed">
            Hi {employeeName}! You're a member of <span className="text-white font-medium">{orgName}</span> on Win The Week — and you <span className="text-white font-medium">don't need to log in</span>.
          </p>
          <p className="text-sm text-[#71717a] mb-6 leading-relaxed">
            Just wait for your weekly check-in email and reply from your inbox. That's it — no app, no login, no friction.
          </p>

          <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-4 py-3 mb-6 text-left">
            <p className="text-xs font-medium text-[#a1a1aa] mb-1">How it works</p>
            <ol className="text-xs text-[#71717a] space-y-1.5 list-decimal list-inside">
              <li>You'll get a weekly email asking what you accomplished</li>
              <li>Just hit reply and share your wins</li>
              <li>Your team lead sees everyone's updates in one place</li>
            </ol>
          </div>

          <p className="text-[11px] text-[#3f3f46] mb-5">
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
