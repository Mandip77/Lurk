import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { constructWebhookEvent } from '@/lib/stripe'
import Stripe from 'stripe'

// Use server-only env vars (no NEXT_PUBLIC_) so price IDs are not in client bundles.
// Supports both monthly and annual price IDs for each tier.
function getTierFromPriceId(priceId: string): 'pro' | 'agency' | 'free' {
  const map: Record<string, 'pro' | 'agency'> = {}

  const proMonthly = process.env.STRIPE_PRO_PRICE_ID
  const proAnnual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID
  const agencyMonthly = process.env.STRIPE_AGENCY_PRICE_ID
  const agencyAnnual = process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID

  if (proMonthly) map[proMonthly] = 'pro'
  if (proAnnual) map[proAnnual] = 'pro'
  if (agencyMonthly) map[agencyMonthly] = 'agency'
  if (agencyAnnual) map[agencyAnnual] = 'agency'

  // Fallback to NEXT_PUBLIC_ vars if server-only vars aren't set yet
  const fallbackPro = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
  const fallbackAgency = process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID
  if (fallbackPro && !map[fallbackPro]) map[fallbackPro] = 'pro'
  if (fallbackAgency && !map[fallbackAgency]) map[fallbackAgency] = 'agency'

  const tier = map[priceId]
  if (!tier) {
    console.error(`[stripe-webhook] Unknown price ID received: ${priceId}`)
    return 'free'
  }
  return tier
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const payload = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = constructWebhookEvent(payload, signature)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const subscription = await (await import('@/lib/stripe')).stripe.subscriptions.retrieve(
        session.subscription as string
      )
      const priceId = subscription.items.data[0].price.id
      const tier = getTierFromPriceId(priceId)

      if (userId && tier !== 'free') {
        await supabase.from('users').update({ tier, stripe_customer_id: session.customer as string }).eq('id', userId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const priceId = sub.items.data[0].price.id
      const tier = getTierFromPriceId(priceId)
      const customerId = sub.customer as string

      if (sub.status === 'active' && tier !== 'free') {
        await supabase.from('users').update({ tier }).eq('stripe_customer_id', customerId)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      await supabase.from('users').update({ tier: 'free' }).eq('stripe_customer_id', customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
