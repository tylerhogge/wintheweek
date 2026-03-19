'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const DEFAULT_SUBJECT = "What did you get done this week? 👊"
const DEFAULT_BODY = `Hey {{name}},

It's Friday. What did you win this week?

Just hit reply and share what you got done — big or small. Your update goes straight to the team dashboard.

Takes 2 minutes. Makes the whole team smarter.`

export default function NewCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableTeams, setAvailableTeams] = useState<string[]>([])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]) // empty = all teams

  const [form, setForm] = useState({
    name: 'Weekly Check-in',
    subject: DEFAULT_SUBJECT,
    body: DEFAULT_BODY,
    frequency: 'weekly' as const,
    send_day: 5,
    send_time: '09:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  // Load distinct teams from employees
  useEffect(() => {
    async function loadTeams() {
      const supabase = createClient()
      const { data } = await supabase
        .from('employees')
        .select('team')
        .eq('active', true)
        .not('team', 'is', null)

      if (data) {
        const unique = [...new Set(data.map((e: { team: string | null }) => e.team).filter(Boolean) as string[])].sort()
        setAvailableTeams(unique)
      }
    }
    loadTeams()
  }, [])

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleTeam(team: string) {
    setSelectedTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()

    const { error } = await supabase.from('campaigns').insert({
      ...form,
      org_id: profile?.org_id,
      active: true,
      target_teams: selectedTeams.length > 0 ? selectedTeams : null,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/campaigns')
    }
  }

  return (
    <div className="max-w-[640px]">
      <div className="mb-8">
        <Link href="/campaigns" className="text-xs text-[#71717a] hover:text-white transition-colors mb-3 inline-flex items-center gap-1">
          ← Campaigns
        </Link>
        <h1 className="text-[22px] font-bold tracking-[-0.03em] mb-0.5">New campaign</h1>
        <p className="text-sm text-[#71717a]">Configure your weekly email check-in</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Name */}
        <Field label="Campaign name" hint="For your reference — employees won't see this">
          <input value={form.name} onChange={(e) => update('name', e.target.value)} required className={inputCls} />
        </Field>

        {/* Subject */}
        <Field label="Email subject">
          <input value={form.subject} onChange={(e) => update('subject', e.target.value)} required className={inputCls} />
        </Field>

        {/* Body */}
        <Field label="Email body" hint="Use {{name}} to personalise with the employee's first name">
          <textarea
            value={form.body}
            onChange={(e) => update('body', e.target.value)}
            required
            rows={8}
            className={`${inputCls} resize-y`}
          />
        </Field>

        {/* Team targeting */}
        {availableTeams.length > 0 && (
          <div className="bg-surface border border-white/[0.07] rounded-xl p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold tracking-tight">Recipients</p>
              <p className="text-xs text-[#52525b] mt-0.5">
                {selectedTeams.length === 0
                  ? 'Sending to all active team members'
                  : `Sending to ${selectedTeams.length} team${selectedTeams.length > 1 ? 's' : ''}: ${selectedTeams.join(', ')}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTeams.map((team) => (
                <button
                  key={team}
                  type="button"
                  onClick={() => toggleTeam(team)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    selectedTeams.includes(team)
                      ? 'bg-accent/10 border-accent/30 text-accent'
                      : 'bg-white/[0.04] border-white/10 text-[#71717a] hover:border-white/20 hover:text-white'
                  }`}
                >
                  {selectedTeams.includes(team) ? '✓ ' : ''}{team}
                </button>
              ))}
              {selectedTeams.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTeams([])}
                  className="text-xs text-[#52525b] hover:text-white transition-colors px-1"
                >
                  Clear (send to all)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Schedule */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold tracking-tight">Schedule</p>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Frequency">
              <select value={form.frequency} onChange={(e) => update('frequency', e.target.value)} className={selectCls}>
                <option value="weekly">Every week</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>

            <Field label="Day">
              <select value={form.send_day} onChange={(e) => update('send_day', Number(e.target.value))} className={selectCls}>
                {DAYS.map((d: string, i: number): React.ReactNode => (
                  <option key={d} value={i + 1}>{d}</option>
                ))}
              </select>
            </Field>

            <Field label="Send time">
              <input type="time" value={form.send_time} onChange={(e) => update('send_time', e.target.value)} className={inputCls} />
            </Field>

            <Field label="Timezone">
              <input value={form.timezone} onChange={(e) => update('timezone', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-white text-black font-semibold text-sm px-5 py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create campaign'}
          </button>
          <Link href="/campaigns" className="text-sm text-[#71717a] hover:text-white transition-colors">Cancel</Link>
        </div>
      </form>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-[#52525b] mt-1">{hint}</p>}
    </div>
  )
}

const inputCls = 'w-full bg-surface2 border border-white/10 text-white text-sm px-3.5 py-2.5 rounded-md outline-none focus:border-accent/40 placeholder-[#52525b] transition-colors'
const selectCls = 'w-full bg-surface2 border border-white/10 text-white text-sm px-3.5 py-2.5 rounded-md outline-none focus:border-accent/40 transition-colors'
