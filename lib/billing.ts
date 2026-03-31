/**
 * Billing helpers — subscription gating and plan checks.
 *
 * During beta, all orgs are treated as active. Once beta ends,
 * flip ENFORCE_BILLING to true and orgs will need an active subscription.
 */

import { createServiceClient } from '@/lib/supabase/server'

// Flip this to true when you want to enforce paid subscriptions
const ENFORCE_BILLING = false

export type SubscriptionStatus = {
  isActive: boolean        // Has an active or trialing subscription
  isBeta: boolean          // No subscription data at all (free beta user)
  isPastDue: boolean       // Payment failed — grace period
  isCanceled: boolean      // Subscription canceled
  plan: string | null
  planStatus: string | null
  trialEndsAt: string | null
  daysUntilTrialEnd: number | null
}

export async function getSubscriptionStatus(orgId: string): Promise<SubscriptionStatus> {
  const service = createServiceClient()
  const { data: org } = await service
    .from('organizations')
    .select('plan, plan_status, trial_ends_at')
    .eq('id', orgId)
    .single()

  const plan = org?.plan ?? null
  const planStatus = org?.plan_status ?? null
  const trialEndsAt = org?.trial_ends_at ?? null

  const isBeta = !planStatus
  const isActive = isBeta || planStatus === 'active' || planStatus === 'trialing'
  const isPastDue = planStatus === 'past_due'
  const isCanceled = planStatus === 'canceled'

  let daysUntilTrialEnd: number | null = null
  if (trialEndsAt) {
    daysUntilTrialEnd = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)
  }

  return { isActive, isBeta, isPastDue, isCanceled, plan, planStatus, trialEndsAt, daysUntilTrialEnd }
}

/**
 * Check if an org should be allowed to use the app.
 * During beta (ENFORCE_BILLING = false), always returns true.
 * After beta, requires active/trialing subscription or past_due grace period.
 */
export async function isOrgAllowed(orgId: string): Promise<boolean> {
  if (!ENFORCE_BILLING) return true

  const status = await getSubscriptionStatus(orgId)
  // Allow active, trialing, and past_due (grace period)
  return status.isActive || status.isPastDue
}

/**
 * Get the employee limit for an org's plan.
 * Returns Infinity for beta users (no limit) and enterprise.
 */
export function getEmployeeLimit(plan: string | null): number {
  switch (plan) {
    case 'starter': return 50
    case 'pro': return 100       // legacy — grandfathered
    case 'business': return 500
    case 'growth': return 500    // legacy — grandfathered
    case 'enterprise': return Infinity
    default: return Infinity     // beta = unlimited
  }
}
