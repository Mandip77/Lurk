import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { priceId } = body

  // Validate priceId against known env-configured prices — prevents price manipulation
  const validPriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID,
  ].filter(Boolean)

  if (!priceId || !validPriceIds.includes(priceId)) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { data: profile } = await supabase.from('users').select('stripe_customer_id').eq('id', user.id).single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })
  }

  const session = await createCheckoutSession({
    customerId: profile.stripe_customer_id,
    priceId,
    userId: user.id,
    successUrl: `${appUrl}/dashboard?upgraded=true`,
    cancelUrl: `${appUrl}/pricing`,
  })

  return NextResponse.json({ url: session.url })
}
