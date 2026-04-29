import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SeverityBadge } from '@/components/dashboard/SeverityBadge'
import { GenerateReportButton } from '@/components/dashboard/GenerateReportButton'
import type { Finding, FindingSeverity } from '@/types'

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 75 ? '#ef4444' : score >= 50 ? '#f97316' : score >= 25 ? '#eab308' : '#00FF94'
  const label = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH RISK' : score >= 25 ? 'MEDIUM RISK' : score > 0 ? 'LOW RISK' : 'PASSED'
  return (
    <div className="flex flex-col items-center">
      <div className="w-24 h-24 rounded-full border-8 flex items-center justify-center" style={{ borderColor: color }}>
        <span className="text-2xl font-bold font-mono" style={{ color }}>{score}</span>
      </div>
      <span className="text-sm font-medium mt-2" style={{ color }}>{label}</span>
    </div>
  )
}

const categoryLabel: Record<string, string> = {
  rls_misconfiguration: 'RLS Misconfiguration',
  broken_auth: 'Broken Auth',
  supply_chain: 'Supply Chain',
  session_token: 'Session Token',
  prompt_injection: 'Prompt Injection',
  other: 'Other',
}

export default async function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: scan }, { data: profile }] = await Promise.all([
    supabase
      .from('scans')
      .select('*, repositories(*)')
      .eq('id', id)
      .eq('user_id', user.id) // ownership check — prevents IDOR
      .single(),
    supabase.from('users').select('tier').eq('id', user.id).single(),
  ])

  if (!scan) notFound()

  const { data: findings } = await supabase
    .from('findings')
    .select('*')
    .eq('scan_id', id)
    .eq('user_id', user.id) // ownership check on findings too
    .order('severity', { ascending: true })

  const userTier = profile?.tier ?? 'free'

  const bySeverity = (findings ?? []).reduce((acc: Record<string, number>, f: Finding) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/scans" className="text-slate-400 hover:text-white text-sm">← Back to Scans</Link>
      </div>

      <div className="flex items-start gap-6 flex-wrap">
        <ScoreGauge score={scan.severity_score} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">{scan.pr_title ?? `PR #${scan.pr_number}`}</h1>
          <p className="text-slate-400 mt-1">{scan.repositories?.full_name}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-400 flex-wrap">
            <span>by {scan.pr_author}</span>
            <span>·</span>
            <span>{new Date(scan.created_at).toLocaleDateString()}</span>
            {scan.model_used && <span>· {scan.model_used}</span>}
            {scan.pr_url && (
              <>
                <span>·</span>
                <Link href={scan.pr_url} target="_blank" className="text-[#00FF94] hover:underline">View PR →</Link>
              </>
            )}
          </div>
        </div>
        {userTier === 'agency' && (
          <GenerateReportButton scanId={id} />
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {(['critical', 'high', 'medium', 'low', 'info'] as FindingSeverity[]).map(s => (
          <Card key={s} className="bg-slate-900 border-slate-800 p-3 text-center">
            <p className="text-2xl font-bold text-white">{bySeverity[s] ?? 0}</p>
            <SeverityBadge severity={s} />
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Findings ({findings?.length ?? 0})</h2>
        </div>
        <div className="divide-y divide-slate-800">
          {(findings ?? []).length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-2xl mb-2">✅</p>
              <p>No security vulnerabilities found.</p>
            </div>
          ) : (
            (findings ?? []).map((f: Finding) => (
              <div key={f.id} className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={f.severity} />
                  <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">
                    {categoryLabel[f.category] ?? f.category}
                  </Badge>
                  <span className="text-white font-medium">{f.title}</span>
                </div>
                {f.file_path && (
                  <p className="text-slate-400 text-sm font-mono">
                    {f.file_path}{f.line_start ? `:${f.line_start}` : ''}
                    {f.line_end && f.line_end !== f.line_start ? `-${f.line_end}` : ''}
                  </p>
                )}
                {f.description && <p className="text-slate-300 text-sm">{f.description}</p>}
                {f.code_snippet && (
                  <pre className="bg-slate-950 border border-slate-800 rounded p-3 text-xs text-[#00FF94] font-mono overflow-x-auto">
                    {f.code_snippet}
                  </pre>
                )}
                {userTier !== 'free' && f.fix_suggestion ? (
                  <div className="bg-green-950/30 border border-green-900 rounded p-3">
                    <p className="text-green-400 text-xs font-medium mb-1">Fix Suggestion</p>
                    <p className="text-green-300 text-sm">{f.fix_suggestion}</p>
                  </div>
                ) : userTier === 'free' && (
                  <div className="bg-slate-800 rounded p-3 flex items-center justify-between">
                    <p className="text-slate-400 text-sm">Fix suggestions available on Pro</p>
                    <Link href="/pricing" className="text-[#00FF94] text-sm hover:underline">Upgrade →</Link>
                  </div>
                )}
                {f.cve_reference && (
                  <p className="text-slate-500 text-xs">CVE: {f.cve_reference}</p>
                )}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
