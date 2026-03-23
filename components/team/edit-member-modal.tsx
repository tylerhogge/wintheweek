'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Employee } from '@/types'

type Props = {
  employee: Employee
  allTeams: string[]
  onClose: () => void
}

export function EditMemberModal({ employee, allTeams, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: employee.name,
    email: employee.email,
    team: employee.team ?? '',
    function: employee.function ?? '',
  })
  const [managerTeams, setManagerTeams] = useState<string[]>(employee.manager_of_teams ?? [])

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleManagerTeam(team: string) {
    setManagerTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/team/edit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employee.id,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        team: form.team.trim() || null,
        function: form.function.trim() || null,
        manager_of_teams: managerTeams.length > 0 ? managerTeams : null,
      }),
    })

    if (res.ok) {
      router.refresh()
      onClose()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong')
    }
    setLoading(false)
  }

  async function handleDeactivate() {
    setLoading(true)
    await fetch('/api/team/edit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employee.id,
        active: !employee.active,
      }),
    })
    router.refresh()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[440px] bg-[#111113] border border-white/[0.1] rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
          <h2 className="text-[17px] font-bold tracking-[-0.02em]">Edit team member</h2>
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

          {/* Manager of teams */}
          {allTeams.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">
                Manager of teams <span className="text-[#52525b] font-normal">(optional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allTeams.map((team) => {
                  const isSelected = managerTeams.includes(team)
                  return (
                    <button
                      key={team}
                      type="button"
                      onClick={() => toggleManagerTeam(team)}
                      className={`text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${
                        isSelected
                          ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                          : 'border-white/10 text-[#71717a] hover:text-white hover:border-white/20'
                      }`}
                    >
                      {team}
                    </button>
                  )
                })}
              </div>
              {managerTeams.length > 0 && (
                <p className="text-[11px] text-[#52525b] mt-1.5">
                  Will receive reply notifications for {managerTeams.join(', ')}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || !form.name.trim() || !form.email.trim()}
                className="bg-white text-black font-semibold text-sm px-4 py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-[#71717a] hover:text-white transition-colors px-3"
              >
                Cancel
              </button>
            </div>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={loading}
              className="text-xs text-[#52525b] hover:text-red-400 transition-colors"
            >
              {employee.active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-[#18181b] border border-white/10 text-white text-sm px-3.5 py-2.5 rounded-md outline-none focus:border-accent/40 placeholder-[#52525b] transition-colors'
