import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createStripeCustomer } from '@/lib/stripe'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Create user profile and Stripe customer on first login
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: existingUser } = await serviceClient
    .from('users')
    .select('id, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  // Always sync github_id from GitHub identity if present
  const githubIdentity = user.identities?.find((i: { provider: string; identity_data?: { sub?: string } }) => i.provider === 'github')
  const githubId = githubIdentity?.identity_data?.sub ? Number(githubIdentity.identity_data.sub) : null
  if (githubId) {
    await serviceClient.from('users').update({ github_id: githubId }).eq('id', user.id)
  }

  if (!existingUser?.stripe_customer_id) {
    try {
      const email = user.email || `user-${user.id}@placeholder.com`
      const customer = await createStripeCustomer(
        email,
        user.user_metadata?.full_name
      )

      await serviceClient.from('users').upsert({
        id: user.id,
        email: email,
        full_name: user.user_metadata?.full_name ?? null,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        stripe_customer_id: customer.id,
        github_id: githubId,
      }, { onConflict: 'id' })
    } catch (err) {
      console.error('Failed to create stripe customer or profile:', err)
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
