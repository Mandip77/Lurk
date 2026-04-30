'use client'

import { useState, useEffect, useRef } from 'react'

interface ScanStatusPollerProps {
  scanId: string
  initialStatus: string
}

interface ScanStatusResponse {
  status: string
  severity_score: number
  findings_count: number
}

const ACTIVE_STATUSES = new Set(['queued', 'scanning'])
const POLL_INTERVAL_MS = 3000

export function ScanStatusPoller({ scanId, initialStatus }: ScanStatusPollerProps) {
  const [status, setStatus] = useState(initialStatus)
  const [data, setData] = useState<ScanStatusResponse | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!ACTIVE_STATUSES.has(status)) return

    async function poll() {
      try {
        const res = await fetch(`/api/scan-status?id=${encodeURIComponent(scanId)}`)
        if (!res.ok) return
        const json = (await res.json()) as ScanStatusResponse
        setData(json)
        setStatus(json.status)

        if (ACTIVE_STATUSES.has(json.status)) {
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
        }
      } catch {
        // Network error - retry
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [scanId, status])

  if (status === 'queued') {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-sm font-medium">
        <span className="w-3 h-3 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
        Queued
      </span>
    )
  }

  if (status === 'scanning') {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 text-blue-300 text-sm font-medium">
        <span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        Scanning...
      </span>
    )
  }

  if (status === 'complete') {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-900/60 text-green-300 text-sm font-medium">
        ✅ Complete
        {data?.findings_count !== undefined && (
          <span className="text-green-400 text-xs">· {data.findings_count} findings</span>
        )}
      </span>
    )
  }

  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/60 text-red-300 text-sm font-medium">
        ❌ Failed
      </span>
    )
  }

  // Fallback for unknown status
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-sm font-medium">
      {status}
    </span>
  )
}
