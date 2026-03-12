'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loadingMagic, setLoadingMagic] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmail, setShowEmail] = useState(false)

  async function handleGoogle() {
    setLoadingGoogle(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoadingGoogle(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoadingMagic(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoadingMagic(false)
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
              <button onClick={() => { setSent(false); setShowEmail(false) }} className="mt-6 text-sm text-[#71717a] hover:text-white transition-colors">
                Use a different method
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-[22px] font-bold tracking-[-0.03em] mb-1">Sign in</h2>
              <p className="text-sm text-[#71717a] mb-6">Welcome back to Win the Week.</p>

              {/* Google button — primary */}
              <button
                onClick={handleGoogle}
                disabled={loadingGoogle}
                className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold text-sm py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50 mb-4"
              >
                {loadingGoogle ? (
                  <span>Connecting…</span>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-xs text-[#52525b]">or</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              {/* Email magic link — secondary */}
              {!showEmail ? (
                <button
                  onClick={() => setShowEmail(true)}
                  className="w-full text-sm text-[#a1a1aa] hover:text-white border border-white/10 hover:border-white/20 py-2.5 rounded-md transition-colors"
                >
                  Continue with email →
                </button>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full bg-[#18181b] border border-white/10 text-white text-sm px-3.5 py-2.5 rounded-md outline-none focus:border-accent/50 placeholder-[#52525b] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loadingMagic || !email}
                    className="w-full bg-white/10 border border-white/10 text-white font-semibold text-sm py-2.5 rounded-md hover:bg-white/[0.15] transition-colors disabled:opacity-50"
                  >
                    {loadingMagic ? 'Sending…' : 'Send magic link →'}
                  </button>
                </form>
              )}

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md mt-3">
                  {error}
                </p>
              )}
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
