'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ReferralData {
  referral_code: string | null
  referral_count: number
  bonus_scans: number
}

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/profile')
        if (res.ok) {
          const json = await res.json()
          setData({
            referral_code: json.referral_code ?? null,
            referral_count: json.referral_count ?? 0,
            bonus_scans: (json.referral_count ?? 0) * 5,
          })
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const inviteLink = data?.referral_code
    ? `https://lurk-cyan.vercel.app/login?ref=${data.referral_code}`
    : ''

  const handleCopy = useCallback(async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // ignore
    }
  }, [inviteLink])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Referral</h1>
          <p className="text-slate-400 mt-1">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Referral Program</h1>
        <p className="text-slate-400 mt-1">Invite friends and earn free scans</p>
      </div>

      {/* Reward explanation */}
      <Card className="bg-[#00FF94]/5 border border-[#00FF94]/20 p-5">
        <div className="flex items-start gap-4">
          <span className="text-3xl">🎁</span>
          <div>
            <p className="text-white font-semibold">Earn +5 free scans per referral</p>
            <p className="text-slate-400 text-sm mt-1">
              For each friend who signs up using your link, you both get 5 bonus scans added
              to your account — no strings attached.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-5">
          <p className="text-slate-400 text-sm">Friends Signed Up</p>
          <p className="text-4xl font-bold text-white mt-1">{data?.referral_count ?? 0}</p>
        </Card>
        <Card className="bg-slate-900 border-slate-800 p-5">
          <p className="text-slate-400 text-sm">Bonus Scans Earned</p>
          <p className="text-4xl font-bold text-[#00FF94] mt-1">{data?.bonus_scans ?? 0}</p>
        </Card>
      </div>

      {/* Share section */}
      <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
        <h2 className="text-white font-semibold">Your Invite Link</h2>

        {data?.referral_code ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 font-mono text-sm text-slate-300 truncate select-all">
                {inviteLink}
              </div>
              <Button
                onClick={handleCopy}
                className="bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium shrink-0"
              >
                {copied ? '✓ Copied!' : 'Copy link'}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-500 text-sm">Your referral code:</span>
              <code className="px-2 py-1 rounded bg-slate-800 text-[#00FF94] text-sm font-mono font-bold tracking-wider">
                {data.referral_code}
              </code>
            </div>
          </>
        ) : (
          <p className="text-slate-500 text-sm">
            Referral code not set up yet. Contact support if this persists.
          </p>
        )}
      </Card>

      {/* How it works */}
      <Card className="bg-slate-900 border-slate-800 p-5">
        <h2 className="text-white font-semibold mb-4">How it works</h2>
        <ol className="space-y-3">
          {[
            'Share your unique invite link with a friend',
            'They sign up at lurk-cyan.vercel.app using your link',
            'You both receive +5 free scans instantly',
            'No limit — invite as many friends as you like',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="w-6 h-6 rounded-full bg-[#00FF94]/10 border border-[#00FF94]/30 text-[#00FF94] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
