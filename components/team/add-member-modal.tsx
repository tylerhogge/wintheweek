'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = { onClose: () => void }

export function AddMemberModal({ onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', team: '', function: '' })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/team/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      router.refresh()
      onClose()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[440px] bg-[#111113] border border-white/[0.1] rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <h2 className="text-[17px] font-bold tracking-[-0.02em]">Add team member</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#71717a] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                Full name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Alex Johnson"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
                autoFocus
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                Work email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                placeholder="alex@company.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Team</label>
              <input
                type="text"
                placeholder="Engineering"
                value={form.team}
                onChange={(e) => update('team', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Function</label>
              <input
                type="text"
                placeholder="Software Engineer"
                value={form.function}
                onChange={(e) => update('function', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={loading || !form.name.trim() || !form.email.trim()}
              className="flex-1 bg-white text-black font-semibold text-sm py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding…' : 'Add member'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[#71717a] hover:text-white transition-colors px-3"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-[#18181b] border border-white/10 text-white text-sm px-3.5 py-2.5 rounded-md outline-none focus:border-accent/40 placeholder-[#52525b] transition-colors'
