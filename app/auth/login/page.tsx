'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight mb-10 justify-center">
          <span className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          Win the Week
        </Link>

        <div className="bg-surface border border-white/[0.08] rounded-xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h2 className="text-lg font-bold tracking-tight mb-2">Check your email</h2>
              <p className="text-sm text-[#a1a1aa] leading-relaxed">
                We sent a magic link to <strong className="text-white">{email}</strong>.
                Click it to sign in — no password needed.
              </p>
              <button onClick={() => setSent(false)} className="mt-6 text-sm text-[#71717a] hover:text-white transition-colors">
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-[22px] font-bold tracking-[-0.03em] mb-1">Sign in</h2>
              <p className="text-sm text-[#71717a] mb-6">We'll send a magic link to your email.</p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-surface2 border border-white/10 text-white text-sm px-3.5 py-2.5 rounded-md outline-none focus:border-accent/50 placeholder-[#52525b] transition-colors"
                />

                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-white text-black font-semibold text-sm py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send magic link →'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#52525b] mt-5">
          Don't have an account?{' '}
          <Link href="/#waitlist" className="text-[#a1a1aa] hover:text-white transition-colors">
            Join the waitlist
          </Link>
        </p>
      </div>
    </div>
  )
}
