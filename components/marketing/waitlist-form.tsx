'use client'

import { useState } from 'react'

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (res.ok) {
      setDone(true)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/25 text-accent text-sm font-medium px-5 py-2.5 rounded-md">
        <span className="font-bold">✓</span> You're on the list — we'll be in touch!
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-[420px] mx-auto">
      <input
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="flex-1 bg-[#18181b] border border-white/10 text-white text-sm px-4 py-2.5 rounded-md outline-none focus:border-accent/40 placeholder-[#52525b] transition-colors"
      />
      <button
        type="submit"
        disabled={loading || !email}
        className="bg-accent text-black font-semibold text-sm px-5 py-2.5 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {loading ? '...' : 'Join waitlist →'}
      </button>
      {error && <p className="absolute text-xs text-red-400 mt-12">{error}</p>}
    </form>
  )
}
