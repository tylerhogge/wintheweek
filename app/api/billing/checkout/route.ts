/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout session for a new subscription.
 * Body: { plan: 'pro' | 'growth' }
 *
 * If the org already has a Stripe customer, reuses it.
 * Includes a 30-day free trial on the subscription.
 * Returns: { url: string } — the Stripe Checkout URL to redirect to.
 */

import { NextResponse } from 'next/server'
import { stripe, PLANS, type PlanKey } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

export async function POST(req: Request) {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const { plan } = await req.json()
  if (!plan || !PLANS[plan as PlanKey]) {
    return NextResponse.json({ error: 'Invalid plan. Must be "pro" or "growth".' }, { status: 400 })
  }

  const planConfig = PLANS[plan as PlanKey]
  const service = createServiceClient()

  // Fetch or create Stripe customer
  const { data: org } = await service
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('id', ctx.orgId)
    .single()

  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  let customerId = org.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.email,
      name: org.name ?? undefined,
      metadata: { org_id: org.id },
    })
    customerId = customer.id

    await service
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', org.id)
  }

  // Create Checkout session with 30-day trial
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wintheweek.co'
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 30,
      metadata: { org_id: org.id, plan },
    },
    success_url: `${appUrl}/settings?billing=success`,
    cancel_url: `${appUrl}/settings?billing=canceled`,
    metadata: { org_id: org.id, plan },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: session.url })
}
