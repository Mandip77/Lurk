'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

const FREE_LIMIT = 3

function UsageBar({ count, limit }: { count: number; limit: number | null }) {
  if (limit === null) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 bg-[#27272a] rounded-full overflow-hidden">
          <div className="h-full bg-[#00FF94] rounded-full w-full opacity-30" />
        </div>
        <span className="text-sm text-[#00FF94] font-medium shrink-0">Unlimited</span>
      </div>
    )
  }

  const pct = Math.min(Math.round((count / limit) * 100), 100)
  const barColor = count >= limit ? 'bg-red-500' : count >= limit - 1 ? 'bg-yellow-500' : 'bg-[#00FF94]'
  const textColor = count >= limit ? 'text-red-400' : count >= limit - 1 ? 'text-yellow-400' : 'text-[#00FF94]'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className={`font-semibold ${textColor}`}>{count} / {limit}</span>
        <span className="text-zinc-500 text-xs">{pct}% used</span>
      </div>
      <div className="h-2.5 bg-[#27272a] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

interface UsageRow { month: string; scan_count: number }

export default function UsagePage() {
  const [tier, setTier] = useState<string>('free')
  const [currentCount, setCurrentCount] = useState(0)
  const [history, setHistory] = useState<UsageRow[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const isFree = tier === 'free'

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: profile }, { data: usage }, { data: hist }] = await Promise.all([
      supabase.from('users').select('tier').eq('id', user.id).single(),
      supabase.from('scan_usage').select('scan_count').eq('user_id', user.id).eq('month', currentMonthStr).single(),
      supabase.from('scan_usage').select('month, scan_count').eq('user_id', user.id).order('month', { ascending: false }).limit(6),
    ])

    setTier(profile?.tier ?? 'free')
    setCurrentCount(usage?.scan_count ?? 0)
    setHistory((hist ?? []) as UsageRow[])
    setLastUpdated(new Date())
    setLoading(false)
  }, [currentMonthStr])

  useEffect(() => {
    load()
    const interval = setInterval(load, 10_000)
    return () => clearInterval(interval)
  }, [load])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Usage</h1>
          <p className="text-zinc-400 mt-1">Monitor your scan usage and limits</p>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-[#00FF94] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Usage</h1>
          <p className="text-zinc-400 mt-1">Monitor your scan usage and limits</p>
        </div>
        {lastUpdated && (
          <span className="text-zinc-600 text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FF94] animate-pulse" />
            Live · updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Current month */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardHeader className="border-b border-[#27272a]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">
              This Month — {formatMonth(currentMonthStr)}
            </CardTitle>
            <span className="text-xs px-2 py-1 rounded-full bg-[#27272a] text-zinc-400 uppercase font-medium tracking-wide">
              {tier}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-3">
          <UsageBar count={currentCount} limit={isFree ? FREE_LIMIT : null} />
          {!isFree && (
            <p className="text-zinc-500 text-sm">
              Total scans this month: <span className="text-white font-semibold">{currentCount}</span>
            </p>
          )}
          {isFree && currentCount >= FREE_LIMIT && (
            <p className="text-red-400 text-sm font-medium">
              Monthly limit reached. <Link href="/pricing" className="underline hover:text-red-300">Upgrade to continue scanning.</Link>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upgrade CTA */}
      {isFree && (
        <Card className="bg-gradient-to-br from-[#00FF94]/5 to-[#18181b] border-[#00FF94]/20">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-white font-semibold text-base">Upgrade to Pro</h3>
                <p className="text-zinc-400 text-sm mt-1">Unlimited scans, fix suggestions, and priority support.</p>
                <ul className="mt-3 space-y-1 text-sm text-zinc-300">
                  <li className="flex items-center gap-2"><span className="text-[#00FF94]">✓</span> Unlimited scans / month</li>
                  <li className="flex items-center gap-2"><span className="text-[#00FF94]">✓</span> AI-powered fix suggestions</li>
                  <li className="flex items-center gap-2"><span className="text-[#00FF94]">✓</span> Full codebase scanning</li>
                  <li className="flex items-center gap-2"><span className="text-[#00FF94]">✓</span> Priority support</li>
                </ul>
              </div>
              <LinkButton href="/pricing" className="bg-[#00FF94] text-black hover:bg-[#00DD80] font-semibold shrink-0">
                View Plans →
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History table */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <CardHeader className="border-b border-[#27272a]">
          <CardTitle className="text-white text-base">Usage History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">No usage history yet. Run your first scan to see data here.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272a]">
                  <th className="text-left text-zinc-500 font-medium px-4 py-3">Month</th>
                  <th className="text-right text-zinc-500 font-medium px-4 py-3">Scans</th>
                  {isFree && <th className="text-right text-zinc-500 font-medium px-4 py-3">vs Limit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]">
                {history.map((row, i) => {
                  const isCurrentMonth = row.month === currentMonthStr
                  return (
                    <tr key={row.month} className={`transition-colors ${isCurrentMonth ? 'bg-[#00FF94]/5' : 'hover:bg-[#27272a]/40'}`}>
                      <td className="px-4 py-3 text-zinc-300 flex items-center gap-2">
                        {formatMonth(row.month)}
                        {isCurrentMonth && <span className="text-xs px-1.5 py-0.5 rounded-full bg-[#00FF94]/10 text-[#00FF94] font-medium">Current</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-semibold">{i === 0 && isCurrentMonth ? currentCount : row.scan_count}</td>
                      {isFree && (
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-medium ${
                            row.scan_count >= FREE_LIMIT ? 'text-red-400' : row.scan_count >= FREE_LIMIT - 1 ? 'text-yellow-400' : 'text-[#00FF94]'
                          }`}>
                            {row.scan_count}/{FREE_LIMIT}
                          </span>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-zinc-600 text-xs text-center">
        Usage resets on the 1st of each month.{' '}
        <Link href="/pricing" className="text-zinc-500 hover:text-zinc-400 underline">View pricing</Link>
      </p>
    </div>
  )
}
