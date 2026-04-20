'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/logo'

type Priority = { name: string; description: string }
type Delivery = 'email' | 'slack'

export function OnboardingForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'basics' | 'priorities' | 'delivery'>('basics')
  const [form, setForm] = useState({ company: '', yourName: '' })
  const [priorities, setPriorities] = useState<Priority[]>([
    { name: '', description: '' },
    { name: '', description: '' },
    { name: '', description: '' },
  ])
  const [delivery, setDelivery] = useState<Delivery>('email')

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

  function goToDelivery(includePriorities: boolean) {
    // Store whether priorities should be sent
    setForm((prev) => ({ ...prev, _includePriorities: includePriorities } as any))
    setStep('delivery')
  }

  async function handleFinish() {
    setLoading(true)
    setError(null)

    const includePriorities = (form as any)._includePriorities !== false
    const filledPriorities = includePriorities
      ? priorities.filter((p) => p.name.trim())
      : []

    const res = await fetch('/api/onboarding/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company: form.company,
        yourName: form.yourName,
        priorities: filledPriorities.length > 0 ? filledPriorities : undefined,
        defaultDelivery: delivery,
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
  const totalSteps = 3

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] tracking-tight mb-10 justify-center">
          <Logo size={28} />
          Win The Week
        </Link>

        {/* ── Step 1: Basics ─────────────────────────────────────────── */}
        {step === 'basics' && (
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
              Step 1 of {totalSteps}
            </p>
          </>
        )}

        {/* ── Step 2: Priorities ──────────────────────────────────────── */}
        {step === 'priorities' && (
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

              {error && step === 'priorities' && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md mb-4">
                  {error}
                </p>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => goToDelivery(true)}
                  disabled={loading || filledCount === 0}
                  className="w-full bg-white text-black font-semibold text-sm py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {`Save ${filledCount > 0 ? filledCount : ''} ${filledCount === 1 ? 'priority' : 'priorities'} & continue →`}
                </button>
                <button
                  onClick={() => goToDelivery(false)}
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
                Step 2 of {totalSteps}
              </p>
            </div>
          </>
        )}

        {/* ── Step 3: Delivery method ────────────────────────────────── */}
        {step === 'delivery' && (
          <>
            <div className="bg-surface border border-white/[0.08] rounded-xl p-8">
              <h2 className="text-[22px] font-bold tracking-[-0.03em] mb-1">How should check-ins be delivered?</h2>
              <p className="text-sm text-[#71717a] mb-6">
                This is how your team will receive their weekly check-in and how they'll reply. You can change this later.
              </p>

              <div className="space-y-3 mb-6">
                {/* Email option */}
                <label
                  className={`flex items-start gap-3.5 border rounded-xl px-5 py-4 cursor-pointer transition-all ${
                    delivery === 'email'
                      ? 'border-accent/40 bg-accent/[0.04]'
                      : 'border-white/[0.08] hover:border-white/[0.18] bg-[#09090b]'
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={delivery === 'email'}
                    onChange={() => setDelivery('email')}
                    className="mt-1 accent-accent shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#a1a1aa]">
                        <rect width="20" height="16" x="2" y="4" rx="2"/>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                      Email
                    </p>
                    <p className="text-xs text-[#71717a] leading-relaxed">
                      Each person gets a check-in email and replies from their inbox. No new tools to learn — works with any email client.
                    </p>
                  </div>
                </label>

                {/* Slack option */}
                <label
                  className={`flex items-start gap-3.5 border rounded-xl px-5 py-4 cursor-pointer transition-all ${
                    delivery === 'slack'
                      ? 'border-[#4A154B]/50 bg-[#4A154B]/[0.06]'
                      : 'border-white/[0.08] hover:border-white/[0.18] bg-[#09090b]'
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={delivery === 'slack'}
                    onChange={() => setDelivery('slack')}
                    className="mt-1 accent-[#4A154B] shrink-0"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#a1a1aa"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>
                      Slack DM
                    </p>
                    <p className="text-xs text-[#71717a] leading-relaxed">
                      Each person gets a Slack DM from the Win The Week bot and replies right in Slack. You'll connect your workspace next.
                    </p>
                  </div>
                </label>
              </div>

              {error && step === 'delivery' && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md mb-4">
                  {error}
                </p>
              )}

              <button
                onClick={handleFinish}
                disabled={loading}
                className="w-full bg-white text-black font-semibold text-sm py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating workspace…' : 'Create workspace →'}
              </button>
            </div>

            <div className="flex items-center justify-between mt-5 px-1">
              <button
                onClick={() => setStep('priorities')}
                className="text-xs text-[#52525b] hover:text-[#71717a] transition-colors"
              >
                ← Back
              </button>
              <p className="text-xs text-[#52525b]">
                Step 3 of {totalSteps}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
