/**
 * POST /api/billing/webhook
 *
 * Stripe webhook endpoint. Handles subscription lifecycle events:
 *  - checkout.session.completed  → activate subscription
 *  - customer.subscription.updated → sync plan status changes
 *  - customer.subscription.deleted → mark as canceled
 *  - invoice.payment_failed → mark as past_due
 *
 * Must be configured in Stripe Dashboard → Webhooks with the events above.
 */

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe, planFromPriceId } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const service = createServiceClient()

  switch (event.type) {
    // ── Checkout completed — first-time subscription activation ────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const orgId = session.metadata?.org_id
      const plan = session.metadata?.plan
      if (!orgId || !session.subscription) break

      // Fetch the full subscription to get trial/period details
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      const priceId = subscription.items.data[0]?.price?.id
      const resolvedPlan = plan ?? planFromPriceId(priceId ?? '') ?? 'pro'

      await service.from('organizations').update({
        stripe_subscription_id: subscription.id,
        plan: resolvedPlan,
        plan_status: subscription.status as string,
        trial_ends_at: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        current_period_end: new Date(((subscription as any).current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400) * 1000).toISOString(),
      }).eq('id', orgId)

      console.log(`[stripe] Checkout completed: org=${orgId} plan=${resolvedPlan} status=${subscription.status}`)
      break
    }

    // ── Subscription updated — plan change, renewal, trial end, etc. ──
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const orgId = subscription.metadata?.org_id

      // If no org_id in metadata, look up by customer ID
      let targetOrgId = orgId
      if (!targetOrgId) {
        const { data: org } = await service
          .from('organizations')
          .select('id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single()
        targetOrgId = org?.id
      }
      if (!targetOrgId) break

      const priceId = subscription.items.data[0]?.price?.id
      const plan = planFromPriceId(priceId ?? '')

      await service.from('organizations').update({
        ...(plan ? { plan } : {}),
        plan_status: subscription.status as string,
        trial_ends_at: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        current_period_end: new Date(((subscription as any).current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400) * 1000).toISOString(),
      }).eq('id', targetOrgId)

      console.log(`[stripe] Subscription updated: org=${targetOrgId} status=${subscription.status}`)
      break
    }

    // ── Subscription deleted — cancellation confirmed ─────────────────
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const orgId = subscription.metadata?.org_id

      let targetOrgId = orgId
      if (!targetOrgId) {
        const { data: org } = await service
          .from('organizations')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .single()
        targetOrgId = org?.id
      }
      if (!targetOrgId) break

      await service.from('organizations').update({
        plan_status: 'canceled',
        stripe_subscription_id: null,
      }).eq('id', targetOrgId)

      console.log(`[stripe] Subscription canceled: org=${targetOrgId}`)
      break
    }

    // ── Payment failed — mark as past_due ─────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string
      if (!customerId) break

      const { data: org } = await service
        .from('organizations')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (org) {
        await service.from('organizations').update({
          plan_status: 'past_due',
        }).eq('id', org.id)
        console.log(`[stripe] Payment failed: org=${org.id}`)
      }
      break
    }

    default:
      // Unhandled event type — ignore
      break
  }

  return NextResponse.json({ received: true })
}
