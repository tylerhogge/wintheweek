import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

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
