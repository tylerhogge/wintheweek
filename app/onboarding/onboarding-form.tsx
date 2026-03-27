'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Priority = { name: string; description: string }

export function OnboardingForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'basics' | 'priorities'>('basics')
  const [form, setForm] = useState({ company: '', yourName: '' })
  const [priorities, setPriorities] = useState<Priority[]>([
    { name: '', description: '' },
    { name: '', description: '' },
    { name: '', description: '' },
  ])

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updatePriority(index: number, field: 'name' | 'description', value: string) {
    setPriorities((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  function addPriority() {
    if (priorities.length < 7) {
      setPriorities((prev) => [...prev, { name: '', description: '' }])
    }
  }

  function removePriority(index: number) {
    setPriorities((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleBasicsSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStep('priorities')
  }

  async function handleFinish(includePriorities: boolean) {
    setLoading(true)
    setError(null)

    const filledPriorities = includePriorities
      ? priorities.filter((p) => p.name.trim())
      : []

    const res = await fetch('/api/onboarding/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        priorities: filledPriorities.length > 0 ? filledPriorities : undefined,
      }),
    })

    if (res.ok) {
      router.push('/team?onboarding=1')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
    }
  }

  const filledCount = priorities.filter((p) => p.name.trim()).length

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
          Win The Week
        </Link>

        {step === 'basics' ? (
          <>
            <div className="bg-surface border border-white/[0.08] rounded-xl p-8">
              <h2 className="text-[22px] font-bold tracking-[-0.03em] mb-1">Set up your workspace</h2>
              <p className="text-sm text-[#71717a] mb-6">Takes 30 seconds. You can change everything later.</p>

              <form onSubmit={handleBasicsSubmit} className="space-y-4">
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

                {error && step === 'basics' && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!form.company.trim()}
                  className="w-full bg-white text-black font-semibold text-sm py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-[#52525b] mt-5">
              Step 1 of 2
            </p>
          </>
        ) : (
          <>
            <div className="bg-surface border border-white/[0.08] rounded-xl p-8">
              <h2 className="text-[22px] font-bold tracking-[-0.03em] mb-1">Set your CEO priorities</h2>
              <p className="text-sm text-[#71717a] mb-1">What are your top company priorities right now?</p>
              <p className="text-xs text-[#52525b] mb-6">
                Optional — but when set, the AI weekly briefing will evaluate how the company is tracking against each one.
              </p>

              <div className="space-y-3 mb-5">
                {priorities.map((p, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-[#52525b] uppercase tracking-wider shrink-0 w-4">{i + 1}.</span>
                      <input
                        type="text"
                        placeholder={
                          i === 0 ? 'e.g. Launch v2 by Q2' :
                          i === 1 ? 'e.g. Hit $1M ARR' :
                          i === 2 ? 'e.g. Hire 3 engineers' :
                          'Priority name'
                        }
                        value={p.name}
                        onChange={(e) => updatePriority(i, 'name', e.target.value)}
                        autoFocus={i === 0}
                        className="flex-1 bg-[#18181b] border border-white/10 text-white text-sm px-3 py-2 rounded-md outline-none focus:border-accent/50 placeholder-[#52525b] transition-colors"
                      />
                      {priorities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePriority(i)}
                          className="text-[#52525b] hover:text-[#71717a] transition-colors text-lg leading-none px-1"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                    {p.name.trim() && (
                      <div className="ml-6">
                        <input
                          type="text"
                          placeholder="Brief description (optional)"
                          value={p.description}
                          onChange={(e) => updatePriority(i, 'description', e.target.value)}
                          className="w-full bg-[#18181b] border border-white/[0.06] text-[#a1a1aa] text-xs px-3 py-1.5 rounded-md outline-none focus:border-accent/50 placeholder-[#3f3f46] transition-colors"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {priorities.length < 7 && (
                <button
                  type="button"
                  onClick={addPriority}
                  className="text-xs text-[#71717a] hover:text-white transition-colors mb-5 block"
                >
                  + Add another priority
                </button>
              )}

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md mb-4">
                  {error}
                </p>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => handleFinish(true)}
                  disabled={loading || filledCount === 0}
                  className="w-full bg-white text-black font-semibold text-sm py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating workspace…' : `Save ${filledCount > 0 ? filledCount : ''} ${filledCount === 1 ? 'priority' : 'priorities'} & continue →`}
                </button>
                <button
                  onClick={() => handleFinish(false)}
                  disabled={loading}
                  className="w-full text-[#71717a] hover:text-white text-sm py-2 transition-colors"
                >
                  Skip for now →
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-5 px-1">
              <button
                onClick={() => setStep('basics')}
                className="text-xs text-[#52525b] hover:text-[#71717a] transition-colors"
              >
                ← Back
              </button>
              <p className="text-xs text-[#52525b]">
                Step 2 of 2
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
