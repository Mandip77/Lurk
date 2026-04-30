import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist'
import { VulnerabilityTrendChart } from '@/components/dashboard/VulnerabilityTrendChart'
import type { Scan } from '@/types'

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-red-500' : score >= 50 ? 'bg-orange-500' : score >= 25 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[#27272a] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-mono text-zinc-300 w-8 text-right">{score}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: 'bg-[#27272a] text-zinc-400',
    scanning: 'bg-blue-900 text-blue-300',
    complete: 'bg-green-900 text-green-300',
    failed: 'bg-red-900 text-red-300',
  }
  return <Badge className={styles[status] ?? styles.queued}>{status}</Badge>
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: repos } = await supabase
    .from('repositories')
    .select('id, is_active')
    .eq('user_id', user.id)

  const repoIds = repos?.map(r => r.id) ?? []

  const [{ data: profile }, { data: recentScans }] = await Promise.all([
    supabase.from('users').select('tier').eq('id', user.id).single(),
    repoIds.length > 0
      ? supabase
        .from('scans')
        .select('*, repositories(full_name)')
        .in('repository_id', repoIds)
        .order('created_at', { ascending: false })
        .limit(10)
      : Promise.resolve({ data: [] }),
  ])

  const thisMonth = new Date()
  thisMonth.setDate(1)
  const monthStr = thisMonth.toISOString().split('T')[0]

  const { data: usage } = await supabase
    .from('scan_usage')
    .select('scan_count')
    .eq('user_id', user.id)
    .eq('month', monthStr)
    .single()

  const scans = (recentScans ?? []) as (Scan & { repositories: { full_name: string } })[]
  const totalScans = scans.length
  const criticalFindings = scans.reduce((sum, s) => sum + (s.findings?.filter(f => f.severity === 'critical').length ?? 0), 0)
  const avgScore = totalScans > 0 ? Math.round(scans.reduce((sum, s) => sum + s.severity_score, 0) / totalScans) : 0
  const hasRepo = (repos?.length ?? 0) > 0
  const hasActiveRepo = repos?.some(r => r.is_active) ?? false
  const hasScan = totalScans > 0

  // Riskiest repo: group by repo, calc avg severity_score
  const repoScoreMap: Record<string, { name: string; total: number; count: number }> = {}
  for (const scan of scans) {
    const repoName = scan.repositories?.full_name ?? 'Unknown'
    const key = scan.repository_id
    if (!repoScoreMap[key]) repoScoreMap[key] = { name: repoName, total: 0, count: 0 }
    repoScoreMap[key].total += scan.severity_score
    repoScoreMap[key].count += 1
  }
  const repoEntries = Object.values(repoScoreMap)
  const riskiestRepo =
    repoEntries.length > 0
      ? repoEntries.reduce((a, b) => a.total / a.count > b.total / b.count ? a : b)
      : null
  const riskiestAvg = riskiestRepo
    ? Math.round(riskiestRepo.total / riskiestRepo.count)
    : 0
  const riskiestColor =
    riskiestAvg >= 75
      ? 'text-red-400'
      : riskiestAvg >= 50
        ? 'text-orange-400'
        : riskiestAvg >= 25
          ? 'text-yellow-400'
          : 'text-green-400'

  // Most common vulnerability categories
  const categoryCount: Record<string, number> = {}
  for (const scan of scans) {
    for (const f of scan.findings ?? []) {
      const cat = (f as { category: string }).category ?? 'other'
      categoryCount[cat] = (categoryCount[cat] ?? 0) + 1
    }
  }
  const categoryLabels: Record<string, string> = {
    rls_misconfiguration: 'RLS Misconfiguration',
    broken_auth: 'Broken Auth',
    supply_chain: 'Supply Chain',
    prompt_injection: 'Prompt Injection',
    other: 'Other',
  }
  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const maxCatCount = topCategories[0]?.[1] ?? 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 mt-1">Security overview across your repositories</p>
      </div>

      {(!hasRepo || !hasActiveRepo || !hasScan) && (
        <OnboardingChecklist hasRepo={hasRepo} hasScan={hasScan} />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#18181b] border-[#27272a] p-4">
          <p className="text-zinc-400 text-sm">Repositories</p>
          <p className="text-3xl font-bold text-white mt-1">{repos?.length ?? 0}</p>
        </Card>
        <Card className="bg-[#18181b] border-[#27272a] p-4">
          <p className="text-zinc-400 text-sm">Scans This Month</p>
          <p className="text-3xl font-bold text-white mt-1">
            {usage?.scan_count ?? 0}
            {profile?.tier === 'free' && <span className="text-sm text-zinc-500">/3</span>}
          </p>
        </Card>
        <Card className="bg-[#18181b] border-[#27272a] p-4">
          <p className="text-zinc-400 text-sm">Critical Findings</p>
          <p className={`text-3xl font-bold mt-1 ${criticalFindings > 0 ? 'text-red-400' : 'text-white'}`}>{criticalFindings}</p>
        </Card>
        <Card className="bg-[#18181b] border-[#27272a] p-4">
          <p className="text-zinc-400 text-sm">Avg Severity Score</p>
          <p className="text-3xl font-bold text-white mt-1">{avgScore}</p>
        </Card>
      </div>

      {profile?.tier === 'free' && (usage?.scan_count ?? 0) >= 2 && (
        <Card className="bg-yellow-950/30 border-yellow-900 p-4">
          <p className="text-yellow-300 font-medium">
            You&apos;ve used {usage?.scan_count ?? 0}/3 free scans this month.{' '}
            <Link href="/pricing" className="underline hover:text-yellow-200">Upgrade to Pro</Link> for unlimited scans.
          </p>
        </Card>
      )}

      {/* Riskiest Repo + Most Common Vulnerability */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-[#18181b] border-[#27272a] p-5">
          <p className="text-zinc-400 text-sm font-medium mb-3">Riskiest Repository</p>
          {riskiestRepo ? (
            <div className="space-y-2">
              <p className="text-white font-semibold truncate">{riskiestRepo.name}</p>
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-bold font-mono ${riskiestColor}`}>
                  {riskiestAvg}
                </span>
                <span className="text-zinc-500 text-sm">avg score</span>
                <span className="text-zinc-600 text-xs ml-auto">
                  {riskiestRepo.count} {riskiestRepo.count === 1 ? 'scan' : 'scans'}
                </span>
              </div>
              <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${riskiestAvg >= 75
                      ? 'bg-red-500'
                      : riskiestAvg >= 50
                        ? 'bg-orange-500'
                        : riskiestAvg >= 25
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                  style={{ width: `${riskiestAvg}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-zinc-600 text-sm">No data yet</p>
          )}
        </Card>

        <Card className="bg-[#18181b] border-[#27272a] p-5">
          <p className="text-zinc-400 text-sm font-medium mb-3">Most Common Vulnerabilities</p>
          {topCategories.length > 0 ? (
            <div className="space-y-3">
              {topCategories.map(([cat, count]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">{categoryLabels[cat] ?? cat}</span>
                    <span className="text-zinc-500 font-mono">{count}</span>
                  </div>
                  <div className="h-1.5 bg-[#27272a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00FF94]/70 rounded-full transition-all"
                      style={{ width: `${Math.round((count / maxCatCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-600 text-sm">No findings data yet</p>
          )}
        </Card>
      </div>

      {/* Vulnerability Trend */}
      <Card className="bg-[#18181b] border-[#27272a]">
        <div className="p-4 border-b border-[#27272a]">
          <h2 className="font-semibold text-white">Vulnerability Trend</h2>
          <p className="text-zinc-500 text-xs mt-0.5">Severity score over the last 30 days</p>
        </div>
        <div className="p-4">
          <VulnerabilityTrendChart
            scans={scans.map(s => ({
              created_at: s.created_at,
              severity_score: s.severity_score,
              findings: s.findings ?? [],
            }))}
          />
        </div>
      </Card>

      <Card className="bg-[#18181b] border-[#27272a]">
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
          <h2 className="font-semibold text-white">Recent Scans</h2>
          <Link href="/scans" className="text-sm text-[#00FF94] hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-slate-800">
          {scans.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              {hasActiveRepo ? (
                <>
                  <p>No scans yet. Open a pull request on a connected repository to trigger your first scan.</p>
                  <Link href="/repositories" className="text-[#00FF94] hover:underline mt-2 inline-block">Manage repositories →</Link>
                </>
              ) : hasRepo ? (
                <>
                  <p>You have repositories connected but none are enabled for scanning.</p>
                  <Link href="/repositories" className="text-[#00FF94] hover:underline mt-2 inline-block">Enable scanning →</Link>
                </>
              ) : (
                <>
                  <p>No scans yet. Connect a repository to get started.</p>
                  <Link href="/repositories" className="text-[#00FF94] hover:underline mt-2 inline-block">Connect repository →</Link>
                </>
              )}
            </div>
          ) : (
            scans.map(scan => (
              <Link key={scan.id} href={`/scans/${scan.id}`} className="flex items-center gap-4 p-4 hover:bg-[#27272a]/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{scan.pr_title ?? 'Unknown PR'}</p>
                  <p className="text-zinc-400 text-sm">{scan.repositories?.full_name} · {new Date(scan.created_at).toLocaleDateString()}</p>
                </div>
                <div className="w-32 shrink-0">
                  <ScoreBar score={scan.severity_score} />
                </div>
                <StatusBadge status={scan.status} />
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
