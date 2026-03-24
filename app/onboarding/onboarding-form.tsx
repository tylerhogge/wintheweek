'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function OnboardingForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ company: '', yourName: '' })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/onboarding/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      router.push('/team?onboarding=1')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">

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
          <h2 className="text-[22px] font-bold tracking-[-0.03em] mb-1">Set up your workspace</h2>
          <p className="text-sm text-[#71717a] mb-6">Takes 30 seconds. You can change everything later.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                Company name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Acme Corp"
                value={form.company}
                onChange={(e) => update('company', e.target.value)}
                required
                autoFocus
                className="w-full bg-[#18181b] border border-white/10 text-white text-sm px-3.5 py-2.5 rounded-md outline-none focus:border-accent/50 placeholder-[#52525b] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Your name</label>
              <input
                type="text"
                placeholder="Alex Johnson"
                value={form.yourName}
                onChange={(e) => update('yourName', e.target.value)}
                className="w-full bg-[#18181b] border border-white/10 text-white text-sm px-3.5 py-2.5 rounded-md outline-none focus:border-accent/50 placeholder-[#52525b] transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !form.company.trim()}
              className="w-full bg-white text-black font-semibold text-sm py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating workspace…' : 'Create workspace →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#52525b] mt-5">
          Next: add your team members
        </p>
      </div>
    </div>
  )
}
