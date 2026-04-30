import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/button'
import type { UserTier, ScanUsage } from '@/types'

const FREE_LIMIT = 3

function UsageBar({ count, limit }: { count: number; limit: number | null }) {
  if (limit === null) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-[#00FF94] rounded-full w-full opacity-30" />
        </div>
        <span className="text-sm text-[#00FF94] font-medium shrink-0">Unlimited</span>
      </div>
    )
  }

  const pct = Math.min(Math.round((count / limit) * 100), 100)
  const barColor =
    count >= limit ? 'bg-red-500' : count >= limit - 1 ? 'bg-yellow-500' : 'bg-[#00FF94]'
  const textColor =
    count >= limit ? 'text-red-400' : count >= limit - 1 ? 'text-yellow-400' : 'text-[#00FF94]'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className={`font-semibold ${textColor}`}>
          {count} / {limit}
        </span>
        <span className="text-slate-500 text-xs">{pct}% used</span>
      </div>
      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default async function UsagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('tier')
    .eq('id', user.id)
    .single()

  const tier = (profile?.tier ?? 'free') as UserTier
  const isFree = tier === 'free'

  // Current month
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: currentUsage } = await supabase
    .from('scan_usage')
    .select('scan_count')
    .eq('user_id', user.id)
    .eq('month', currentMonthStr)
    .single()

  const currentCount = currentUsage?.scan_count ?? 0

  // Last 6 months history
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  const fromStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`

  const { data: history } = await supabase
    .from('scan_usage')
    .select('month, scan_count')
    .eq('user_id', user.id)
    .gte('month', fromStr)
    .order('month', { ascending: false })

  const usageHistory = (history ?? []) as Pick<ScanUsage, 'month' | 'scan_count'>[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Usage</h1>
        <p className="text-slate-400 mt-1">Monitor your scan usage and limits</p>
      </div>

      {/* Current month card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base">
              This Month - {formatMonth(currentMonthStr)}
            </CardTitle>
            <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400 uppercase font-medium">
              {tier}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-3">
          <UsageBar count={currentCount} limit={isFree ? FREE_LIMIT : null} />
          {!isFree && (
            <p className="text-slate-500 text-sm">
              Total scans this month: <span className="text-white font-semibold">{currentCount}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upgrade CTA for free tier */}
      {isFree && (
        <Card className="bg-gradient-to-br from-[#00FF94]/5 to-slate-900 border-[#00FF94]/20">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-white font-semibold text-base">Upgrade to Pro</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Get unlimited scans, fix suggestions, and priority support.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-slate-300">
                  <li className="flex items-center gap-2"><span className="text-[#00FF94]">✓</span> Unlimited scans / month</li>
                  <li className="flex items-center gap-2"><span className="text-[#00FF94]">✓</span> AI-powered fix suggestions</li>
                  <li className="flex items-center gap-2"><span className="text-[#00FF94]">✓</span> Priority support</li>
                </ul>
              </div>
              <LinkButton
                href="/pricing"
                className="bg-[#00FF94] text-slate-900 hover:bg-[#00FF94]/90 font-semibold shrink-0"
              >
                View Plans →
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage history table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="border-b border-slate-800">
          <CardTitle className="text-white text-base">Usage History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usageHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No usage history yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-slate-500 font-medium px-4 py-3">Month</th>
                  <th className="text-right text-slate-500 font-medium px-4 py-3">Scans</th>
                  {isFree && (
                    <th className="text-right text-slate-500 font-medium px-4 py-3">Usage</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usageHistory.map(row => (
                  <tr key={row.month} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-slate-300">{formatMonth(row.month)}</td>
                    <td className="px-4 py-3 text-right text-white font-medium">{row.scan_count}</td>
                    {isFree && (
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-xs font-medium ${
                            row.scan_count >= FREE_LIMIT
                              ? 'text-red-400'
                              : row.scan_count >= FREE_LIMIT - 1
                              ? 'text-yellow-400'
                              : 'text-[#00FF94]'
                          }`}
                        >
                          {row.scan_count}/{FREE_LIMIT}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-slate-600 text-xs text-center">
        Usage resets on the 1st of each month.{' '}
        <Link href="/pricing" className="text-slate-500 hover:text-slate-400 underline">
          View pricing
        </Link>
      </p>
    </div>
  )
}
