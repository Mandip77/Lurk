'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with basic security scanning',
    features: [
      '3 scans per month',
      'Core vulnerability detection',
      'GitHub PR comments',
      'Basic findings report',
    ],
    cta: 'Current Plan',
    priceId: null,
    popular: false,
  },
  {
    name: 'Pro',
    price: '$15',
    period: 'per month',
    description: 'For developers who ship frequently',
    features: [
      'Unlimited scans',
      'Fix suggestions for all findings',
      'Priority scanning queue',
      'Email notifications',
      'API access',
    ],
    cta: 'Upgrade to Pro',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    popular: true,
  },
  {
    name: 'Agency',
    price: '$99',
    period: 'per month',
    description: 'For teams and security consultants',
    features: [
      'Everything in Pro',
      'White-label PDF reports',
      'Multiple repositories',
      'Team member seats',
      'Priority support',
    ],
    cta: 'Upgrade to Agency',
    priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID,
    popular: false,
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleUpgrade(priceId: string | null | undefined) {
    if (!priceId) return
    setLoading(priceId)
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Simple, transparent pricing</h1>
        <p className="text-slate-400 mt-2">Start free. Upgrade when you need more.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {plans.map(plan => (
          <Card
            key={plan.name}
            className={`relative bg-slate-900 border-slate-800 p-6 flex flex-col ${plan.popular ? 'border-[#00FF94] ring-1 ring-[#00FF94]/20' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00FF94] text-black text-xs">
                Most Popular
              </Badge>
            )}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">{plan.name}</h2>
              <div className="mt-2">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-slate-400 ml-1 text-sm">/{plan.period}</span>
              </div>
              <p className="text-slate-400 text-sm mt-2">{plan.description}</p>
            </div>
            <ul className="space-y-3 flex-1 mb-6">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-[#00FF94] mt-0.5 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleUpgrade(plan.priceId)}
              disabled={!plan.priceId || loading === plan.priceId}
              className={plan.popular
                ? 'bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium w-full'
                : 'bg-slate-800 text-white hover:bg-slate-700 w-full'
              }
            >
              {loading === plan.priceId ? 'Redirecting...' : plan.cta}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
