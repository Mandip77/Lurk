'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface SuppressButtonProps {
  findingId: string
  initialSuppressed: boolean
  initialReason?: string | null
  onUpdate?: (suppressed: boolean) => void
}

export function SuppressButton({
  findingId,
  initialSuppressed,
  initialReason,
  onUpdate,
}: SuppressButtonProps) {
  const [suppressed, setSuppressed] = useState(initialSuppressed)
  const [showDialog, setShowDialog] = useState(false)
  const [reason, setReason] = useState(initialReason ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSuppress() {
    setLoading(true)
    setError(null)
    // Optimistic
    setSuppressed(true)
    onUpdate?.(true)
    try {
      const res = await fetch(`/api/findings/${findingId}/suppress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      })
      if (!res.ok) {
        setSuppressed(false)
        onUpdate?.(false)
        const data = await res.json()
        setError(data.error ?? 'Failed')
      }
    } catch {
      setSuppressed(false)
      onUpdate?.(false)
      setError('Network error')
    } finally {
      setLoading(false)
      setShowDialog(false)
    }
  }

  async function handleUnsuppress() {
    setLoading(true)
    setError(null)
    // Optimistic
    setSuppressed(false)
    onUpdate?.(false)
    try {
      const res = await fetch(`/api/findings/${findingId}/suppress`, { method: 'DELETE' })
      if (!res.ok) {
        setSuppressed(true)
        onUpdate?.(true)
        const data = await res.json()
        setError(data.error ?? 'Failed')
      } else {
        setReason('')
      }
    } catch {
      setSuppressed(true)
      onUpdate?.(true)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      {suppressed ? (
        <>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 text-xs font-medium">
            Suppressed
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={handleUnsuppress}
            className="text-xs text-slate-400 hover:text-white h-6 px-2"
          >
            {loading ? '…' : 'Unsuppress'}
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => setShowDialog(true)}
          className="text-xs border-slate-700 text-slate-400 hover:text-white h-6 px-2"
        >
          Suppress
        </Button>
      )}

      {error && <span className="text-xs text-red-400">{error}</span>}

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d1526] border border-slate-700 rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-white font-semibold">Suppress finding</h3>
            <p className="text-slate-400 text-sm">
              Optionally add a reason - this helps your team understand why this finding was ignored.
            </p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. False positive - this is intentional"
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00FF94]/40 resize-none"
            />
            <div className="flex gap-3">
              <Button
                onClick={handleSuppress}
                disabled={loading}
                className="bg-[#00FF94] text-[#0B1120] hover:bg-[#00e085] font-semibold"
              >
                {loading ? 'Suppressing…' : 'Confirm'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
