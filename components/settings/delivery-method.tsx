'use client'

import { useState } from 'react'

type Delivery = 'email' | 'slack'
type Props = { initialValue: Delivery; hasSlack: boolean }

export function DeliveryMethod({ initialValue, hasSlack }: Props) {
  const [value, setValue] = useState<Delivery>(initialValue)
  const [saving, setSaving] = useState(false)

  async function handleChange(newValue: Delivery) {
    if (newValue === value) return
    if (newValue === 'slack' && !hasSlack) return

    setSaving(true)
    try {
      const res = await fetch('/api/settings/delivery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_delivery: newValue }),
      })
      if (res.ok) {
        setValue(newValue)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2.5">
      <label
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
          value === 'email'
            ? 'border-accent/30 bg-accent/[0.04]'
            : 'border-white/[0.06] hover:border-white/[0.12]'
        }`}
        onClick={() => handleChange('email')}
      >
        <input
          type="radio"
          name="delivery"
          checked={value === 'email'}
          onChange={() => handleChange('email')}
          className="accent-accent shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Email</p>
          <p className="text-xs text-[#71717a]">Check-ins sent to each person's inbox</p>
        </div>
      </label>

      <label
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
          !hasSlack ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${
          value === 'slack'
            ? 'border-[#4A154B]/40 bg-[#4A154B]/[0.05]'
            : 'border-white/[0.06] hover:border-white/[0.12]'
        }`}
        onClick={() => hasSlack && handleChange('slack')}
      >
        <input
          type="radio"
          name="delivery"
          checked={value === 'slack'}
          onChange={() => hasSlack && handleChange('slack')}
          disabled={!hasSlack}
          className="accent-[#4A154B] shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">Slack DM</p>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#a1a1aa"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>
          </div>
          <p className="text-xs text-[#71717a]">
            {hasSlack
              ? 'Check-ins sent as Slack DMs'
              : 'Connect Slack in the Integrations section below to enable'}
          </p>
        </div>
      </label>

      {saving && <p className="text-[11px] text-[#52525b]">Saving...</p>}
    </div>
  )
}
