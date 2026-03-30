import Stripe from 'stripe'

// Lazy-init: Stripe SDK must NOT be instantiated at module scope because
// STRIPE_SECRET_KEY isn't available during `next build` on Vercel.
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return _stripe
}

// Plan configuration — maps our internal plan names to Stripe Price IDs
export const PLANS = {
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_PRO!,
    employeeLimit: 100,
    monthlyPrice: 199,
  },
  growth: {
    name: 'Growth',
    priceId: process.env.STRIPE_PRICE_GROWTH!,
    employeeLimit: 500,
    monthlyPrice: 399,
  },
} as const

export type PlanKey = keyof typeof PLANS

/** Look up our plan key from a Stripe price ID */
export function planFromPriceId(priceId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key as PlanKey
  }
  return null
}
