'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const plans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    description: 'Get started with basic security scanning',
    features: [
      '3 scans per month',
      'Core vulnerability detection',
      'GitHub PR comments',
      'Basic findings report',
    ],
    cta: 'Current Plan',
    annualCta: 'Current Plan',
    priceId: null,
    popular: false,
    savePct: null,
  },
  {
    name: 'Pro',
    monthlyPrice: 15,
    description: 'For developers who ship frequently',
    features: [
      'Unlimited scans',
      'Fix suggestions for all findings',
      'Priority scanning queue',
      'Email notifications',
      'API access',
    ],
    cta: 'Upgrade to Pro',
    annualCta: 'Start Annual Plan',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    popular: true,
    savePct: 17, // save ~$30 of $180
  },
  {
    name: 'Agency',
    monthlyPrice: 70,
    description: 'For teams and security consultants',
    features: [
      'Everything in Pro',
      'White-label PDF reports',
      'Multiple repositories',
      'Team member seats',
      'Priority support',
    ],
    cta: 'Upgrade to Agency',
    annualCta: 'Start Annual Plan',
    priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID,
    popular: false,
    savePct: 17, // save ~$140 of $840
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [annual, setAnnual] = useState(false)

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

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={`text-sm font-medium transition-colors ${!annual ? 'text-white' : 'text-slate-500'}`}>
          Monthly
        </span>
        <button
          onClick={() => setAnnual(v => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            annual ? 'bg-[#00FF94]' : 'bg-slate-700'
          }`}
          aria-label="Toggle annual billing"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              annual ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium transition-colors ${annual ? 'text-white' : 'text-slate-500'}`}>
          Annual
        </span>
        {annual && (
          <Badge className="bg-[#00FF94]/20 text-[#00FF94] border border-[#00FF94]/30 text-xs font-semibold">
            2 months free
          </Badge>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {plans.map(plan => {
          const annualTotal = Math.round(plan.monthlyPrice * 10)
          const displayPrice =
            plan.monthlyPrice === 0
              ? '$0'
              : annual
              ? `$${annualTotal}`
              : `$${plan.monthlyPrice}`
          const displayPeriod =
            plan.monthlyPrice === 0 ? 'forever' : annual ? 'per year' : 'per month'
          const ctaLabel = annual && plan.priceId ? plan.annualCta : plan.cta

          return (
            <Card
              key={plan.name}
              className={`relative bg-slate-900 border-slate-800 p-6 flex flex-col ${
                plan.popular ? 'border-[#00FF94] ring-1 ring-[#00FF94]/20' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00FF94] text-black text-xs">
                  Most Popular
                </Badge>
              )}
              {annual && plan.savePct !== null && plan.monthlyPrice > 0 && (
                <Badge className="absolute -top-3 right-4 bg-green-900 text-green-300 border border-green-800 text-xs">
                  Save {plan.savePct}%
                </Badge>
              )}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-4xl font-bold text-white">{displayPrice}</span>
                  <span className="text-slate-400 ml-1 text-sm pb-1">/{displayPeriod}</span>
                </div>
                {annual && plan.monthlyPrice > 0 && (
                  <p className="text-slate-500 text-xs mt-1">
                    Billed as ${annualTotal}/year · save ${plan.monthlyPrice * 2}
                  </p>
                )}
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
                className={
                  plan.popular
                    ? 'bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium w-full'
                    : 'bg-slate-800 text-white hover:bg-slate-700 w-full'
                }
              >
                {loading === plan.priceId ? 'Redirecting...' : ctaLabel}
              </Button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
