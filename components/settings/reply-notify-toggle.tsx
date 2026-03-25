'use client'

import { useState } from 'react'

type Props = { initialValue: boolean }

export function ReplyNotifyToggle({ initialValue }: Props) {
  const [enabled, setEnabled] = useState(initialValue)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (loading) return
    const next = !enabled
    setEnabled(next) // optimistic
    setLoading(true)
    try {
      const res = await fetch('/api/settings/reply-notify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notify_on_reply: next }),
      })
      if (!res.ok) setEnabled(!next) // revert on error
    } catch {
      setEnabled(!next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      role="switch"
      aria-checked={enabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        enabled ? 'bg-accent' : 'bg-white/[0.12]'
      } ${loading ? 'opacity-60' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
