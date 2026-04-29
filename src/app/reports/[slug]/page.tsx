import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import type { Finding, FindingSeverity } from '@/types'

const SEVERITY_COLORS: Record<FindingSeverity, string> = {
  critical: 'text-red-400 bg-red-950/40 border-red-900',
  high: 'text-orange-400 bg-orange-950/40 border-orange-900',
  medium: 'text-yellow-400 bg-yellow-950/40 border-yellow-900',
  low: 'text-blue-400 bg-blue-950/40 border-blue-900',
  info: 'text-slate-400 bg-slate-800/40 border-slate-700',
}

const SEVERITY_ICONS: Record<FindingSeverity, string> = {
  critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: '⚪',
}

const SEVERITY_ORDER: FindingSeverity[] = ['critical', 'high', 'medium', 'low', 'info']

export default async function PublicReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: report } = await supabase
    .from('reports')
    .select('*, scans(*, findings(*), repositories(full_name))')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!report) notFound()

  const scan = report.scans as {
    id: string
    pr_title: string | null
    pr_url: string | null
    severity_score: number
    completed_at: string | null
    repositories: { full_name: string } | null
    findings: Finding[]
  }

  const findings = (scan?.findings ?? []) as Finding[]
  const sortedFindings = [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  )
  const bySeverity = SEVERITY_ORDER.reduce((acc, s) => {
    acc[s] = findings.filter(f => f.severity === s).length
    return acc
  }, {} as Record<string, number>)

  const isWhiteLabel = !!report.agency_name
  const score = scan?.severity_score ?? 0
  const statusColor = score >= 75 ? 'text-red-400' : score >= 50 ? 'text-orange-400' : score >= 25 ? 'text-yellow-400' : 'text-green-400'
  const statusText = score >= 75 ? 'CRITICAL' : score >= 50 ? 'HIGH RISK' : score >= 25 ? 'MEDIUM RISK' : findings.length > 0 ? 'LOW RISK' : 'PASSED'

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          /* Keep dark theme for WeasyPrint; flip to white for browser print */
          @media not all and (color-gamut: p3) {
            body { background: #0B1120 !important; }
          }
          .print-break { page-break-before: always; }
          pre { white-space: pre-wrap !important; word-break: break-word !important; }
        }
        @page { size: A4; margin: 1.5cm; }
      `}</style>

      <div className="min-h-screen bg-[#0B1120] text-white">
        {/* Header */}
        <div className="border-b border-slate-800 px-8 py-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {report.agency_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={report.agency_logo_url} alt={report.agency_name ?? ''} className="h-8" />
              ) : (
                <span className="text-2xl">🛡️</span>
              )}
              <div>
                <h1 className="font-bold text-white text-lg">
                  {isWhiteLabel ? report.agency_name : 'Lurk'}
                </h1>
                {report.client_name && (
                  <p className="text-slate-400 text-sm">Report for {report.client_name}</p>
                )}
              </div>
            </div>
            <div className="no-print flex items-center gap-2">
              {/* Self-hosted only: WeasyPrint PDF download */}
              {process.env.VERCEL !== '1' && (
                <a
                  href={`/api/reports/pdf?slug=${slug}`}
                  className="bg-[#00FF94] text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#00DD80] transition-colors"
                  download
                >
                  ⬇️ Download PDF
                </a>
              )}
              <button
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                🖨️ Print / Save PDF
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
          {/* Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-white font-bold text-xl mb-4">Executive Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-slate-400 text-sm">Severity Score</p>
                <p className={`text-3xl font-bold font-mono ${statusColor}`}>{score}/100</p>
                <p className={`text-sm font-medium ${statusColor}`}>{statusText}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Findings</p>
                <p className="text-3xl font-bold text-white">{findings.length}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Repository</p>
                <p className="text-white font-medium text-sm mt-1">{scan?.repositories?.full_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Scan Date</p>
                <p className="text-white font-medium text-sm mt-1">
                  {scan?.completed_at ? new Date(scan.completed_at).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {SEVERITY_ORDER.map(s => (
                <div key={s} className={`border rounded-lg p-3 text-center ${SEVERITY_COLORS[s]}`}>
                  <p className="text-2xl font-bold">{bySeverity[s] ?? 0}</p>
                  <p className="text-xs capitalize mt-1">{s}</p>
                </div>
              ))}
            </div>

            {scan?.pr_title && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-slate-400 text-sm">Pull Request</p>
                <p className="text-white">
                  {scan.pr_url ? (
                    <a href={scan.pr_url} target="_blank" rel="noreferrer" className="hover:underline text-[#00FF94]">
                      {scan.pr_title}
                    </a>
                  ) : scan.pr_title}
                </p>
              </div>
            )}
          </div>

          {/* Findings */}
          <div>
            <h2 className="text-white font-bold text-xl mb-4">
              Security Findings ({findings.length})
            </h2>

            {findings.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-white font-medium">No vulnerabilities found</p>
                <p className="text-slate-400 text-sm mt-1">This pull request passed all security checks.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedFindings.map((f, i) => (
                  <div key={f.id ?? i} className={`border rounded-xl p-5 ${SEVERITY_COLORS[f.severity]}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-xl shrink-0">{SEVERITY_ICONS[f.severity]}</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{f.title}</h3>
                        <div className="flex items-center gap-3 text-xs mt-1 text-slate-400">
                          <span>{f.severity.toUpperCase()}</span>
                          {f.category && <span>· {f.category.replace(/_/g, ' ')}</span>}
                          {f.file_path && <span>· <code className="font-mono">{f.file_path}{f.line_start ? `:${f.line_start}` : ''}</code></span>}
                        </div>
                      </div>
                    </div>
                    {f.description && <p className="text-slate-300 text-sm mb-3">{f.description}</p>}
                    {f.code_snippet && (
                      <pre className="bg-slate-950 rounded-lg p-3 text-xs font-mono text-[#00FF94] overflow-x-auto mb-3">
                        {f.code_snippet}
                      </pre>
                    )}
                    {f.fix_suggestion && (
                      <div className="bg-green-950/30 border border-green-900 rounded-lg p-3">
                        <p className="text-green-400 text-xs font-bold mb-1">RECOMMENDED FIX</p>
                        <p className="text-green-300 text-sm">{f.fix_suggestion}</p>
                      </div>
                    )}
                    {f.cve_reference && (
                      <p className="text-slate-500 text-xs mt-2">CVE: {f.cve_reference}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 pt-6 text-center text-slate-500 text-sm">
            {isWhiteLabel ? (
              <p>{report.agency_name} · Security audit report · {new Date(report.created_at).toLocaleDateString()}</p>
            ) : (
              <p>Generated by <a href="https://lurk.dev" className="text-[#00FF94] hover:underline">Lurk</a> · {new Date(report.created_at).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
