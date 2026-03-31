'use client'

import { useState } from 'react'
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react'

type Props = {
  plan: string | null
  planStatus: string | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  hasStripeCustomer: boolean
}

function planLabel(plan: string | null): string {
  switch (plan) {
    case 'starter': return 'Starter'
    case 'pro': return 'Pro (Legacy)'
    case 'core': return 'Core'
    case 'growth': return 'Growth (Legacy)'
    case 'enterprise': return 'Enterprise'
    case 'trial': return 'Free Trial'
    default: return 'Free Beta'
  }
}

function statusBadge(status: string | null, trialEndsAt: string | null) {
  if (status === 'trialing' && trialEndsAt) {
    const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)
    if (daysLeft > 0) {
      return { text: `Trial · ${daysLeft}d left`, color: 'text-accent border-accent/20 bg-accent/[0.06]' }
    }
    return { text: 'Trial ended', color: 'text-amber-400 border-amber-400/20 bg-amber-400/[0.06]' }
  }
  switch (status) {
    case 'active': return { text: 'Active', color: 'text-accent border-accent/20 bg-accent/[0.06]' }
    case 'past_due': return { text: 'Past due', color: 'text-red-400 border-red-400/20 bg-red-400/[0.06]' }
    case 'canceled': return { text: 'Canceled', color: 'text-[#a1a1aa] border-white/[0.08] bg-white/[0.03]' }
    case 'unpaid': return { text: 'Unpaid', color: 'text-red-400 border-red-400/20 bg-red-400/[0.06]' }
    default: return { text: 'Free Beta', color: 'text-accent border-accent/20 bg-accent/[0.06]' }
  }
}

export function BillingSection({ plan, planStatus, trialEndsAt, currentPeriodEnd, hasStripeCustomer }: Props) {
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null)

  const badge = statusBadge(planStatus, trialEndsAt)
  const isSubscribed = planStatus === 'active' || planStatus === 'trialing'
  const isBeta = !planStatus || (!plan && !planStatus)

  async function openPortal() {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      // silently fail
    } finally {
      setLoadingPortal(false)
    }
  }

  async function startCheckout(selectedPlan: 'starter' | 'core') {
    setLoadingCheckout(selectedPlan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      // silently fail
    } finally {
      setLoadingCheckout(null)
    }
  }

  return (
    <div className="bg-surface border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
      {/* Current plan */}
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Current plan</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[15px] font-semibold">{planLabel(plan)}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.color}`}>
              {badge.text}
            </span>
          </div>
          {currentPeriodEnd && isSubscribed && (
            <p className="text-xs text-[#71717a] mt-1">
              {planStatus === 'trialing' ? 'Trial ends' : 'Renews'} {new Date(currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        {hasStripeCustomer && (
          <button
            onClick={openPortal}
            disabled={loadingPortal}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#a1a1aa] hover:text-white border border-white/[0.08] hover:border-white/[0.15] px-3 py-1.5 rounded-lg transition-colors"
          >
            {loadingPortal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
            Manage billing
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Upgrade options — show if not subscribed or on beta */}
      {(isBeta || planStatus === 'canceled') && (
        <div className="px-5 py-4">
          <p className="text-xs text-[#a1a1aa] mb-3">
            {isBeta
              ? 'Win The Week is free during beta. Subscribe now to lock in your rate — first 30 days free.'
              : 'Your subscription has been canceled. Resubscribe to regain access.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => startCheckout('starter')}
              disabled={!!loadingCheckout}
              className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-white/[0.1] hover:bg-white/[0.04] transition-colors"
            >
              {loadingCheckout === 'starter' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Starter · $99/mo
            </button>
            <button
              onClick={() => startCheckout('core')}
              disabled={!!loadingCheckout}
              className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-accent text-black hover:bg-accent/90 transition-colors"
            >
              {loadingCheckout === 'core' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Core · $299/mo
            </button>
          </div>
        </div>
      )}

      {/* Upgrade from Starter to Core */}
      {(plan === 'starter' || plan === 'pro') && isSubscribed && (
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Need more capacity?</p>
            <p className="text-xs text-[#71717a] mt-0.5">Upgrade to Core for up to 500 employees, custom domain, and priority support.</p>
          </div>
          <button
            onClick={openPortal}
            disabled={loadingPortal}
            className="text-[12px] font-semibold text-accent hover:text-accent/80 transition-colors shrink-0"
          >
            Upgrade to Core →
          </button>
        </div>
      )}

      {/* Past due warning */}
      {planStatus === 'past_due' && (
        <div className="px-5 py-4 bg-red-500/[0.04]">
          <p className="text-sm text-red-400 font-medium">Payment failed</p>
          <p className="text-xs text-red-400/70 mt-0.5 mb-2">
            Your last payment didn't go through. Please update your payment method to keep your subscription active.
          </p>
          <button
            onClick={openPortal}
            disabled={loadingPortal}
            className="text-[12px] font-semibold text-red-400 hover:text-red-300 transition-colors"
          >
            Update payment method →
          </button>
        </div>
      )}
    </div>
  )
}
