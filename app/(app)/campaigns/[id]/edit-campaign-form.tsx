'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { RichBodyEditor } from '@/components/rich-body-editor'
import type { Campaign } from '@/types'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Berlin', label: 'Central Europe (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

const TIME_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const totalMinutes = (6 * 60) + i * 30
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h
  const label = `${displayH}:${String(m).padStart(2, '0')} ${ampm}`
  return { value, label }
})

type Props = {
  campaign: Campaign
  allTeams: string[]
}

export function EditCampaignForm({ campaign, allTeams }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Campaign>(campaign)
  const [selectedTeams, setSelectedTeams] = useState<string[]>(campaign.target_teams ?? [])
  const [showPreview, setShowPreview] = useState(false)

  function update(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleTeam(team: string) {
    setSelectedTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('campaigns')
      .update({
        name: form.name,
        subject: form.subject,
        body: form.body,
        frequency: form.frequency,
        send_day: form.send_day,
        send_time: form.send_time,
        timezone: form.timezone,
        active: form.active,
        target_teams: selectedTeams.length > 0 ? selectedTeams : null,
      })
      .eq('id', campaign.id)

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push('/campaigns')
    }
  }

  async function toggleActive() {
    const supabase = createClient()
    await supabase.from('campaigns').update({ active: !form.active }).eq('id', campaign.id)
    setForm((prev) => ({ ...prev, active: !prev.active }))
  }

  return (
    <div className="max-w-[640px]">
      <div className="mb-8">
        <Link href="/campaigns" className="text-xs text-[#71717a] hover:text-white transition-colors mb-3 inline-flex items-center gap-1">
          ← Campaigns
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold tracking-[-0.03em] mb-0.5">Edit campaign</h1>
            <p className="text-sm text-[#71717a]">Changes apply to future sends only</p>
          </div>
          <button
            onClick={toggleActive}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors w-fit ${
              form.active
                ? 'bg-accent/10 border-accent/25 text-accent hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400'
                : 'bg-white/[0.04] border-white/10 text-[#71717a] hover:bg-accent/10 hover:border-accent/25 hover:text-accent'
            }`}
          >
            {form.active ? 'Active — click to pause' : 'Paused — click to activate'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        <Field label="Campaign name" hint="For your reference — employees won't see this">
          <input value={form.name ?? ''} onChange={(e) => update('name', e.target.value)} required className={inputCls} />
        </Field>

        <Field label="Email subject">
          <input value={form.subject ?? ''} onChange={(e) => update('subject', e.target.value)} required className={inputCls} />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-[#a1a1aa]">Email body</label>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/10 text-[#71717a] hover:text-white hover:border-white/20 transition-colors"
            >
              {showPreview ? 'Hide preview' : 'Preview'}
            </button>
          </div>
          <RichBodyEditor
            value={form.body ?? ''}
            onChange={(v) => update('body', v)}
            className={inputCls}
          />
          {/* Hidden input for form validation */}
          <input type="hidden" value={form.body ?? ''} required />

          {showPreview && (
            <div className="mt-3 bg-white rounded-lg p-6 text-black">
              <p className="text-[10px] font-semibold text-[#71717a] uppercase tracking-wider mb-3">Preview — as seen by employee</p>
              <p className="text-xs text-[#a1a1aa] mb-2 font-medium">Subject: {form.subject}</p>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {(form.body ?? '').replace(/\{\{name\}\}/g, 'Sarah')}
              </div>
            </div>
          )}
        </div>

        {/* Team targeting */}
        {allTeams.length > 0 && (
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
              {allTeams.map((team) => (
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

        <div className="bg-surface border border-white/[0.07] rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold tracking-tight">Schedule</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Frequency">
              <select value={form.frequency ?? 'weekly'} onChange={(e) => update('frequency', e.target.value)} className={selectCls}>
                <option value="weekly">Every week</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
            <Field label="Day">
              <select value={form.send_day ?? 5} onChange={(e) => update('send_day', Number(e.target.value))} className={selectCls}>
                {DAYS.map((d: string, i: number): React.ReactNode => (
                  <option key={d} value={i + 1}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Send time">
              <select value={form.send_time ?? '09:00'} onChange={(e) => update('send_time', e.target.value)} className={selectCls}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Timezone">
              <select value={form.timezone ?? 'America/Denver'} onChange={(e) => update('timezone', e.target.value)} className={selectCls}>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-md">{error}</p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-white text-black font-semibold text-sm px-5 py-2.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
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
