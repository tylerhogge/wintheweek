/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Billing Portal session so the customer can manage
 * their subscription, update payment method, or cancel.
 * Returns: { url: string } — the portal URL to redirect to.
 */

import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

export async function POST() {
  const auth = await requireRole('admin')
  if ('error' in auth) return auth.error
  const { ctx } = auth

  const service = createServiceClient()
  const { data: org } = await service
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', ctx.orgId)
    .single()

  if (!org?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found. Subscribe to a plan first.' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.wintheweek.co'
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${appUrl}/settings`,
  })

  return NextResponse.json({ url: session.url })
}
