'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STORAGE_KEY = 'lurk_onboarding_done'

interface OnboardingChecklistProps {
  hasRepo: boolean
  hasScan: boolean
}

export function OnboardingChecklist({ hasRepo, hasScan }: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem(STORAGE_KEY) === 'true')
    }
  }, [])

  const steps = [
    { label: 'Create account', done: true, href: null, alwaysDone: true },
    { label: 'Connect a repository', done: hasRepo, href: '/repositories', alwaysDone: false },
    { label: 'Open your first PR', done: hasScan, href: null, alwaysDone: false, requiresRepo: true },
    { label: 'View your first scan', done: hasScan, href: hasScan ? '/scans' : null, alwaysDone: false, requiresScan: true },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length

  useEffect(() => {
    if (allDone && mounted) {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
  }, [allDone, mounted])

  if (!mounted || dismissed) return null

  const progressPct = Math.round((completedCount / steps.length) * 100)

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setDismissed(true)
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="border-b border-slate-800 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base font-semibold">
            Get started with Lurk
          </CardTitle>
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
          >
            Dismiss
          </button>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{completedCount} of {steps.length} steps completed</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00FF94] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <ul className="space-y-3">
          {steps.map((step, i) => {
            const greyed = (step as { requiresRepo?: boolean }).requiresRepo
              ? !hasRepo
              : (step as { requiresScan?: boolean }).requiresScan
              ? !hasScan
              : false

            return (
              <li key={i} className={`flex items-center gap-3 ${greyed ? 'opacity-40' : ''}`}>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-xs transition-colors ${
                    step.done
                      ? 'bg-[#00FF94]/20 border-[#00FF94] text-[#00FF94]'
                      : 'border-slate-600 text-slate-600'
                  }`}
                >
                  {step.done ? '✓' : ''}
                </div>
                <span className={`text-sm ${step.done ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                  {step.href && !step.done && !greyed ? (
                    <Link href={step.href} className="text-[#00FF94] hover:underline">
                      {step.label}
                    </Link>
                  ) : (
                    step.label
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
