'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function GenerateReportButton({ scanId }: { scanId: string }) {
  const [open, setOpen] = useState(false)
  const [clientName, setClientName] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [agencyLogoUrl, setAgencyLogoUrl] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reportUrl, setReportUrl] = useState<string | null>(null)

  async function handleGenerate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_id: scanId,
          client_name: clientName,
          agency_name: agencyName,
          agency_logo_url: agencyLogoUrl || null,
          is_public: isPublic,
        }),
      })
      const data = await res.json()
      if (data.report_url) setReportUrl(data.report_url)
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-white shrink-0">
        📄 Generate Report
      </Button>
    )
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-sm">
      <h3 className="text-white font-semibold mb-4">Generate White-Label Report</h3>

      {reportUrl ? (
        <div className="space-y-3">
          <p className="text-green-400 text-sm">✅ Report created!</p>
          <a
            href={reportUrl}
            target="_blank"
            rel="noreferrer"
            className="block text-[#00FF94] text-sm hover:underline break-all"
          >
            {reportUrl}
          </a>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => navigator.clipboard.writeText(reportUrl)}
              className="bg-slate-800 hover:bg-slate-700 text-white"
            >
              Copy Link
            </Button>
            <Button size="sm" onClick={() => { setOpen(false); setReportUrl(null) }} className="bg-slate-700 hover:bg-slate-600 text-white">
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleGenerate} className="space-y-3">
          <div>
            <Label className="text-slate-300 text-xs">Client Name</Label>
            <Input
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Acme Corp"
              className="mt-1 bg-slate-800 border-slate-700 text-white text-sm"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Agency Name</Label>
            <Input
              value={agencyName}
              onChange={e => setAgencyName(e.target.value)}
              placeholder="Your Agency"
              className="mt-1 bg-slate-800 border-slate-700 text-white text-sm"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Agency Logo URL (optional)</Label>
            <Input
              value={agencyLogoUrl}
              onChange={e => setAgencyLogoUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 bg-slate-800 border-slate-700 text-white text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="rounded"
            />
            Make report publicly shareable
          </label>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={loading} className="bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium text-sm flex-1">
              {loading ? 'Generating...' : 'Generate'}
            </Button>
            <Button type="button" onClick={() => setOpen(false)} className="bg-slate-700 hover:bg-slate-600 text-white text-sm">
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
