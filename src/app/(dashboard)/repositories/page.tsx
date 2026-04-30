'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Repo {
  id: string
  full_name: string
  provider: string
  is_active: boolean
  installation_id: string | null
  created_at: string
}

export default function RepositoriesPage() {
  const searchParams = useSearchParams()
  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [scanning, setScanning] = useState<string | null>(null)
  const installUrl = process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL ?? '#'

  const loadRepos = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('repositories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setRepos(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRepos()
    // If redirected back from GitHub installation, show synced message
    if (searchParams.get('synced') === '1') {
      setSyncMsg('Repositories synced successfully!')
      setTimeout(() => setSyncMsg(''), 4000)
    }
    if (searchParams.get('error')) {
      setSyncMsg('Sync failed - try the Sync button below.')
      setTimeout(() => setSyncMsg(''), 5000)
    }
  }, [loadRepos, searchParams])

  async function syncRepos() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/github/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSyncMsg(`Synced ${data.count} repository${data.count !== 1 ? 'ies' : 'y'}.`)
        await loadRepos()
      } else {
        setSyncMsg(data.error ?? 'Sync failed. Make sure the GitHub App is installed.')
      }
    } catch {
      setSyncMsg('Sync failed. Check your connection and try again.')
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 5000)
  }

  async function toggleRepo(repoId: string, currentActive: boolean) {
    const supabase = createClient()
    await supabase
      .from('repositories')
      .update({ is_active: !currentActive })
      .eq('id', repoId)
    setRepos(r => r.map(repo => repo.id === repoId ? { ...repo, is_active: !currentActive } : repo))
  }

  async function scanRepo(repoId: string) {
    setScanning(repoId)
    const res = await fetch('/api/scan-repo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repositoryId: repoId }),
    })
    const data = await res.json()
    setScanning(null)
    if (data.scanId) {
      window.location.href = `/scans/${data.scanId}`
    } else {
      alert(data.error ?? 'Failed to start scan')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Repositories</h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">Manage which repositories Lurk scans</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={syncRepos}
            disabled={syncing}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-[#27272a] hover:text-white text-sm"
          >
            {syncing ? 'Syncing...' : 'Sync Repos'}
          </Button>
          {repos.length === 0 && (
            <a
              href={installUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium text-sm transition-colors"
            >
              + Install GitHub App
            </a>
          )}
        </div>
      </div>

      {syncMsg && (
        <div className={`text-sm px-4 py-3 rounded-lg ${syncMsg.includes('fail') || syncMsg.includes('Check') ? 'bg-red-900/30 text-red-300 border border-red-800' : 'bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/30'}`}>
          {syncMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-[#00FF94] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : repos.length === 0 ? (
        <Card className="bg-[#18181b] border-[#27272a] p-12 text-center">
          <div className="text-4xl mb-4">📁</div>
          <h2 className="text-white font-semibold text-lg">No repositories connected</h2>
          <p className="text-zinc-400 mt-2 mb-2 max-w-sm mx-auto">
            Install the Lurk GitHub App on your repositories, then click <strong className="text-white">Sync Repos</strong> to load them here.
          </p>
          <p className="text-zinc-500 text-sm mb-6">Lurk will then automatically scan every pull request for security issues.</p>
          <div className="flex items-center justify-center gap-3">
            <a
              href={installUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#00FF94] text-black hover:bg-[#00DD80] font-medium text-sm transition-colors"
            >
              Install GitHub App
            </a>
            <Button
              onClick={syncRepos}
              disabled={syncing}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-[#27272a] hover:text-white text-sm"
            >
              {syncing ? 'Syncing...' : 'Sync Repos'}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-zinc-400 text-sm">{repos.length} connected {repos.length === 1 ? 'repository' : 'repositories'} - enable scanning on the repos you want Lurk to watch.</p>
          {repos.map(repo => (
            <Card key={repo.id} className="bg-[#18181b] border-[#27272a] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-medium truncate">{repo.full_name}</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {repo.provider} · Added {new Date(repo.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap sm:shrink-0 sm:ml-4">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${repo.is_active ? 'bg-[#00FF94]/10 text-[#00FF94]' : 'bg-[#27272a] text-zinc-500'}`}>
                  {repo.is_active ? 'Scanning' : 'Paused'}
                </span>
                {repo.is_active && (
                  <button
                    onClick={() => scanRepo(repo.id)}
                    disabled={scanning === repo.id}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#00FF94]/10 text-[#00FF94] hover:bg-[#00FF94]/20 border border-[#00FF94]/20 transition-colors font-medium disabled:opacity-50"
                  >
                    {scanning === repo.id ? 'Starting...' : 'Scan Codebase'}
                  </button>
                )}
                <button
                  onClick={() => toggleRepo(repo.id, repo.is_active)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${repo.is_active ? 'bg-[#00FF94]' : 'bg-zinc-700'}`}
                  aria-label={repo.is_active ? 'Pause scanning' : 'Enable scanning'}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${repo.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
