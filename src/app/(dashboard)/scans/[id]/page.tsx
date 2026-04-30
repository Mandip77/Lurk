'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SeverityBadge } from '@/components/dashboard/SeverityBadge'
import { GenerateReportButton } from '@/components/dashboard/GenerateReportButton'
import { ScanStatusPoller } from '@/components/dashboard/ScanStatusPoller'
import { SuppressButton } from '@/components/dashboard/SuppressButton'
import { DiffViewer } from '@/components/dashboard/DiffViewer'
import type { Finding, FindingSeverity } from '@/types'

interface ScanWithRepo {
  id: string
  pr_number: number | null
  pr_title: string | null
  pr_author: string | null
  pr_url: string | null
  status: string
  severity_score: number
  tokens_used: number
  created_at: string
  completed_at: string | null
  model_used: string | null
  diff: string | null
  repositories: { full_name: string } | null
}

interface FindingWithSuppress extends Finding {
  suppressed?: boolean
  suppressed_reason?: string | null
  suppressed_at?: string | null
}

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

export default function ScanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [scan, setScan] = useState<ScanWithRepo | null>(null)
  const [findings, setFindings] = useState<FindingWithSuppress[]>([])
  const [userTier, setUserTier] = useState<string>('free')
  const [loading, setLoading] = useState(true)
  const [showSuppressed, setShowSuppressed] = useState(false)

  useEffect(() => {
    async function load() {
      const [scanRes, findingsRes, profileRes] = await Promise.all([
        fetch(`/api/scans/${id}`),
        fetch(`/api/scans/${id}/findings`),
        fetch('/api/profile'),
      ])

      if (scanRes.status === 401) { router.push('/login'); return }
      if (scanRes.status === 404) { router.push('/404'); return }

      if (scanRes.ok) {
        const data = await scanRes.json()
        setScan(data.scan)
      }
      if (findingsRes.ok) {
        const data = await findingsRes.json()
        setFindings(data.findings ?? [])
      }
      if (profileRes.ok) {
        const data = await profileRes.json()
        setUserTier(data.tier ?? 'free')
      }
      setLoading(false)
    }
    load()
  }, [id, router])

  function updateFindingSuppressed(findingId: string, suppressed: boolean) {
    setFindings(prev =>
      prev.map(f => f.id === findingId ? { ...f, suppressed } : f)
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Link href="/scans" className="text-slate-400 hover:text-white text-sm">← Back to Scans</Link>
        <p className="text-slate-400">Loading…</p>
      </div>
    )
  }

  if (!scan) return null

  const allFindings = findings ?? []
  const visibleFindings = showSuppressed
    ? allFindings
    : allFindings.filter(f => !f.suppressed)

  const suppressedCount = allFindings.filter(f => f.suppressed).length

  const bySeverity = allFindings
    .filter(f => !f.suppressed)
    .reduce((acc: Record<string, number>, f: FindingWithSuppress) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1
      return acc
    }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/scans" className="text-slate-400 hover:text-white text-sm">← Back to Scans</Link>
      </div>

      <div className="flex items-start gap-4 sm:gap-6 flex-wrap">
        <ScoreGauge score={scan.severity_score} />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-white">{scan.pr_title ?? (scan.pr_number ? `PR #${scan.pr_number}` : 'Codebase Scan')}</h1>
          <p className="text-zinc-400 mt-1">{scan.repositories?.full_name} {!scan.pr_number && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-[#00FF94]/10 text-[#00FF94] font-medium">Full Codebase</span>}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-slate-400 flex-wrap">
            <span>by {scan.pr_author}</span>
            <span>·</span>
            <span>{new Date(scan.created_at).toLocaleDateString()}</span>
            {scan.model_used && <span>· {scan.model_used}</span>}
            {scan.pr_url && scan.pr_number && (
              <>
                <span>·</span>
                <Link href={scan.pr_url} target="_blank" className="text-[#00FF94] hover:underline">View PR #{scan.pr_number} →</Link>
              </>
            )}
            {scan.pr_url && !scan.pr_number && (
              <>
                <span>·</span>
                <Link href={scan.pr_url} target="_blank" className="text-[#00FF94] hover:underline">View Repository →</Link>
              </>
            )}
          </div>
          <div className="mt-3">
            {(scan.status === 'queued' || scan.status === 'scanning') ? (
              <ScanStatusPoller scanId={scan.id} initialStatus={scan.status as 'queued' | 'scanning'} />
            ) : scan.status === 'complete' ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-900/60 text-green-300 text-sm font-medium">
                ✅ Complete
              </span>
            ) : scan.status === 'failed' ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/60 text-red-300 text-sm font-medium">
                ❌ Failed
              </span>
            ) : null}
          </div>
        </div>
        {userTier === 'agency' && (
          <GenerateReportButton scanId={id} />
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {(['critical', 'high', 'medium', 'low', 'info'] as FindingSeverity[]).map(s => (
          <Card key={s} className="bg-slate-900 border-slate-800 p-2 sm:p-3 text-center">
            <p className="text-xl sm:text-2xl font-bold text-white">{bySeverity[s] ?? 0}</p>
            <SeverityBadge severity={s} />
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold text-white">
            Findings ({allFindings.length}
            {suppressedCount > 0 ? `, ${suppressedCount} suppressed` : ''})
          </h2>
          {suppressedCount > 0 && (
            <button
              onClick={() => setShowSuppressed(s => !s)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {showSuppressed ? 'Hide suppressed' : `Show ${suppressedCount} suppressed`}
            </button>
          )}
        </div>
        <div className="divide-y divide-slate-800">
          {visibleFindings.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-2xl mb-2">✅</p>
              <p>No security vulnerabilities found.</p>
            </div>
          ) : (
            visibleFindings.map((f: FindingWithSuppress) => (
              <div
                key={f.id}
                className={`p-4 space-y-2 transition-opacity ${f.suppressed ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={f.severity} />
                  <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">
                    {categoryLabel[f.category] ?? f.category}
                  </Badge>
                  <span className="text-white font-medium">{f.title}</span>
                  {f.suppressed && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 text-xs font-medium">
                      Suppressed
                    </span>
                  )}
                  <div className="ml-auto">
                    <SuppressButton
                      findingId={f.id}
                      initialSuppressed={f.suppressed ?? false}
                      initialReason={f.suppressed_reason}
                      onUpdate={(s) => updateFindingSuppressed(f.id, s)}
                    />
                  </div>
                </div>
                {f.suppressed_reason && (
                  <p className="text-slate-500 text-xs italic">Suppressed: {f.suppressed_reason}</p>
                )}
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

      {/* Diff section - only for PR scans */}
      {scan.pr_number && (
        <Card className="bg-[#18181b] border-[#27272a]">
          <div className="p-4 border-b border-[#27272a]">
            <h2 className="font-semibold text-white">Diff</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Raw git diff for this pull request</p>
          </div>
          <div className="p-4">
            {scan.diff ? (
              <DiffViewer
                diff={scan.diff}
                highlightLines={allFindings.flatMap(f =>
                  f.line_start != null ? [f.line_start] : []
                )}
              />
            ) : (
              <p className="text-zinc-500 text-sm">
                Diff not stored for this scan. Future scans will include the full diff.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
