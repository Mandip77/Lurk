'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free:   { label: 'Free',   color: 'bg-slate-700 text-slate-300' },
  pro:    { label: 'Pro',    color: 'bg-[#00FF94]/20 text-[#00FF94]' },
  agency: { label: 'Agency', color: 'bg-purple-500/20 text-purple-300' },
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile]   = useState<{ full_name: string | null; email: string; avatar_url: string | null; tier: string; created_at: string; referral_code: string | null } | null>(null)
  const [stats, setStats]       = useState<{ totalScans: number; totalFindings: number; repos: number } | null>(null)
  const [name, setName]         = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: p } = await supabase
        .from('users')
        .select('full_name, email, avatar_url, tier, created_at, referral_code')
        .eq('id', user.id)
        .single()

      if (p) {
        setProfile(p)
        setName(p.full_name ?? '')
      }

      // Pull stats in parallel
      const [{ count: scans }, { count: findings }, { data: repos }] = await Promise.all([
        supabase.from('scans').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('findings').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('repositories').select('id').eq('user_id', user.id).eq('is_active', true),
      ])
      setStats({ totalScans: scans ?? 0, totalFindings: findings ?? 0, repos: repos?.length ?? 0 })
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveName() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('users').update({ full_name: name.trim() || null }).eq('id', user.id)
      setProfile(p => p ? { ...p, full_name: name.trim() || null } : p)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-[#00FF94] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const tier = TIER_LABELS[profile.tier] ?? TIER_LABELS.free
  const initials = (profile.full_name ?? profile.email).slice(0, 2).toUpperCase()
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Profile</h1>

      {/* Avatar + identity */}
      <Card className="bg-slate-900 border-slate-800 p-6">
        <div className="flex items-center gap-5">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="w-16 h-16 rounded-full ring-2 ring-[#00FF94]/30 object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#00FF94]/10 border border-[#00FF94]/30 flex items-center justify-center text-[#00FF94] font-bold text-xl">
              {initials}
            </div>
          )}
          <div>
            <p className="text-white font-semibold text-lg leading-tight">{profile.full_name ?? 'No name set'}</p>
            <p className="text-slate-400 text-sm mt-0.5">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tier.color}`}>{tier.label}</span>
              <span className="text-slate-600 text-xs">Member since {memberSince}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Scans run',     value: stats.totalScans },
            { label: 'Findings',      value: stats.totalFindings },
            { label: 'Active repos',  value: stats.repos },
          ].map(s => (
            <Card key={s.label} className="bg-slate-900 border-slate-800 p-4 text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-slate-400 text-xs mt-1">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Edit display name */}
      <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
        <h2 className="text-white font-semibold">Display name</h2>
        <div className="flex gap-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            placeholder="Your name"
            maxLength={80}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00FF94] focus:border-[#00FF94]"
          />
          <Button
            onClick={saveName}
            disabled={saving}
            className="bg-[#00FF94] text-black hover:bg-[#00e085] font-medium px-4 text-sm"
          >
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </Card>

      {/* Account info */}
      <Card className="bg-slate-900 border-slate-800 p-6 space-y-3">
        <h2 className="text-white font-semibold">Account details</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-slate-800">
            <span className="text-slate-400">Email</span>
            <span className="text-white">{profile.email}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-800">
            <span className="text-slate-400">Plan</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tier.color}`}>{tier.label}</span>
          </div>
          {profile.referral_code && (
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Referral code</span>
              <span className="text-white font-mono">{profile.referral_code}</span>
            </div>
          )}
          <div className="flex justify-between py-1.5">
            <span className="text-slate-400">Member since</span>
            <span className="text-white">{memberSince}</span>
          </div>
        </div>
      </Card>

      {/* Sign out */}
      <Card className="bg-slate-900 border-slate-800 p-6 flex items-center justify-between">
        <div>
          <p className="text-white font-semibold text-sm">Sign out</p>
          <p className="text-slate-400 text-xs mt-0.5">You will be returned to the home page.</p>
        </div>
        <Button
          onClick={signOut}
          disabled={signingOut}
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-sm"
        >
          {signingOut ? 'Signing out...' : 'Sign out'}
        </Button>
      </Card>
    </div>
  )
}
