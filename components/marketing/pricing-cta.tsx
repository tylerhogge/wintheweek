'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

type Props = {
  plan: 'starter' | 'core'
  variant?: 'default' | 'accent'
  label?: string
}

export function PricingCTA({ plan, variant = 'default', label }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (res.status === 401) {
        // Not logged in — redirect to signup
        window.location.href = '/auth/login?redirect=/settings'
      }
    } catch {
      // Fall back to signup page
      window.location.href = '/auth/login?redirect=/settings'
    } finally {
      setLoading(false)
    }
  }

  const baseClasses = 'block text-center text-sm font-semibold py-2 rounded-md transition-colors w-full'
  const variantClasses = variant === 'accent'
    ? 'bg-accent text-black hover:bg-accent/90'
    : 'border border-white/10 hover:bg-white/[0.04]'

  return (
    <button onClick={handleClick} disabled={loading} className={`${baseClasses} ${variantClasses}`}>
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Redirecting…
        </span>
      ) : (
        label ?? 'Get started free'
      )}
    </button>
  )
}
