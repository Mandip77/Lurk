'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Scan } from '@/types'

type ScanWithRepo = Scan & { repositories: { full_name: string } | null }

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: 'bg-slate-800 text-slate-400',
    scanning: 'bg-blue-900 text-blue-300',
    complete: 'bg-green-900 text-green-300',
    failed: 'bg-red-900 text-red-300',
  }
  return <Badge className={styles[status] ?? styles.queued}>{status}</Badge>
}

function ScoreChip({ score }: { score: number }) {
  const color =
    score >= 75
      ? 'text-red-400'
      : score >= 50
      ? 'text-orange-400'
      : score >= 25
      ? 'text-yellow-400'
      : 'text-green-400'
  return <span className={`font-mono font-bold ${color}`}>{score}/100</span>
}

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium' | 'low' | 'passed'
type StatusFilter = 'all' | 'complete' | 'scanning' | 'failed'
type DateFilter = '7d' | '30d' | 'all'

interface ScansClientProps {
  scans: ScanWithRepo[]
}

export function ScansClient({ scans }: ScansClientProps) {
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState<SeverityFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [dateRange, setDateRange] = useState<DateFilter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const isFiltered =
    search !== '' || severity !== 'all' || status !== 'all' || dateRange !== 'all'

  const clearFilters = useCallback(() => {
    setSearch('')
    setSeverity('all')
    setStatus('all')
    setDateRange('all')
  }, [])

  const filtered = useMemo(() => {
    const now = Date.now()
    const cutoff7d = now - 7 * 24 * 60 * 60 * 1000
    const cutoff30d = now - 30 * 24 * 60 * 60 * 1000

    return scans.filter(scan => {
      // Search
      if (search) {
        const q = search.toLowerCase()
        const titleMatch = (scan.pr_title ?? '').toLowerCase().includes(q)
        const authorMatch = (scan.pr_author ?? '').toLowerCase().includes(q)
        if (!titleMatch && !authorMatch) return false
      }

      // Severity
      if (severity !== 'all') {
        if (severity === 'passed') {
          if (scan.severity_score !== 0) return false
        } else {
          const score = scan.severity_score
          const matches =
            severity === 'critical'
              ? score >= 75
              : severity === 'high'
              ? score >= 50 && score < 75
              : severity === 'medium'
              ? score >= 25 && score < 50
              : score > 0 && score < 25 // low
          if (!matches) return false
        }
      }

      // Status
      if (status !== 'all' && scan.status !== status) return false

      // Date
      if (dateRange !== 'all') {
        const ts = new Date(scan.created_at).getTime()
        if (dateRange === '7d' && ts < cutoff7d) return false
        if (dateRange === '30d' && ts < cutoff30d) return false
      }

      return true
    })
  }, [scans, search, severity, status, dateRange])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(s => s.id)))
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    setDeleting(true)
    try {
      await fetch('/api/scans/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      setSelected(new Set())
      // Reload to reflect changes
      window.location.reload()
    } finally {
      setDeleting(false)
    }
  }

  const selectClassName =
    'bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF94] transition-colors'

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by PR title or author..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00FF94] transition-colors"
        />

        <select
          value={severity}
          onChange={e => setSeverity(e.target.value as SeverityFilter)}
          className={selectClassName}
        >
          <option value="all">All Severity</option>
          <option value="critical">Critical (75-100)</option>
          <option value="high">High (50-74)</option>
          <option value="medium">Medium (25-49)</option>
          <option value="low">Low (1-24)</option>
          <option value="passed">Passed (0)</option>
        </select>

        <select
          value={status}
          onChange={e => setStatus(e.target.value as StatusFilter)}
          className={selectClassName}
        >
          <option value="all">All Status</option>
          <option value="complete">Complete</option>
          <option value="scanning">Scanning</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={dateRange}
          onChange={e => setDateRange(e.target.value as DateFilter)}
          className={selectClassName}
        >
          <option value="all">All Time</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>

        {isFiltered && (
          <button
            onClick={clearFilters}
            className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-slate-800"
          >
            Clear filters ×
          </button>
        )}
      </div>

      {/* Results count + bulk delete */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
          {isFiltered && scans.length !== filtered.length && ` of ${scans.length}`}
        </span>
        {selected.size > 0 && (
          <Button
            onClick={handleBulkDelete}
            disabled={deleting}
            className="bg-red-900 text-red-200 hover:bg-red-800 text-sm h-8 px-3"
          >
            {deleting ? 'Deleting...' : `Delete selected (${selected.size})`}
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 text-lg mb-2">No results found</p>
            <p className="text-slate-600 text-sm">
              {isFiltered
                ? 'Try adjusting your filters.'
                : 'No scans yet. Connect a repository and open a pull request to trigger your first scan.'}
            </p>
            {isFiltered && (
              <button
                onClick={clearFilters}
                className="mt-4 text-[#00FF94] hover:underline text-sm"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-700 bg-slate-800 accent-[#00FF94]"
                  />
                </th>
                <th className="p-4 text-slate-400 text-sm font-medium">PR / Repository</th>
                <th className="p-4 text-slate-400 text-sm font-medium">Score</th>
                <th className="p-4 text-slate-400 text-sm font-medium">Status</th>
                <th className="p-4 text-slate-400 text-sm font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(scan => (
                <tr
                  key={scan.id}
                  className={`hover:bg-slate-800/50 transition-colors ${
                    selected.has(scan.id) ? 'bg-slate-800/30' : ''
                  }`}
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selected.has(scan.id)}
                      onChange={() => toggleSelect(scan.id)}
                      className="rounded border-slate-700 bg-slate-800 accent-[#00FF94]"
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/scans/${scan.id}`}
                      className="hover:text-[#00FF94] transition-colors"
                    >
                      <p className="text-white font-medium">
                        {scan.pr_title ?? `PR #${scan.pr_number}`}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {scan.repositories?.full_name}
                        {scan.pr_author && (
                          <span className="text-slate-500"> · by {scan.pr_author}</span>
                        )}
                      </p>
                    </Link>
                  </td>
                  <td className="p-4">
                    <ScoreChip score={scan.severity_score} />
                  </td>
                  <td className="p-4">
                    <StatusBadge status={scan.status} />
                  </td>
                  <td className="p-4 text-slate-400 text-sm">
                    {new Date(scan.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
