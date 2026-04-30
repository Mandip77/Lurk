'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  created_at: string
}

function NewKeyModal({
  fullKey,
  onClose,
}: {
  fullKey: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(fullKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1526] border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4">
        <h2 className="text-white font-bold text-lg">Your new API key</h2>
        <p className="text-slate-400 text-sm">
          Copy this key now — it will never be shown again.
        </p>
        <div className="bg-slate-950 border border-slate-700 rounded p-3 font-mono text-[#00FF94] text-sm break-all">
          {fullKey}
        </div>
        <div className="flex gap-3">
          <Button
            onClick={copy}
            className="bg-[#00FF94] text-[#0B1120] hover:bg-[#00e085] font-semibold"
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

function CreateKeyForm({ onCreated }: { onCreated: (key: ApiKey, fullKey: string) => void }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      onCreated(data.key as ApiKey, data.full_key as string)
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-3 items-end">
      <div className="flex-1">
        <label className="block text-sm text-slate-400 mb-1">Key name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. CI pipeline"
          required
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00FF94]/40"
        />
      </div>
      <Button
        type="submit"
        disabled={loading || !name.trim()}
        className="bg-[#00FF94] text-[#0B1120] hover:bg-[#00e085] font-semibold"
      >
        {loading ? 'Creating…' : 'Create key'}
      </Button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  )
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [isFree, setIsFree] = useState(false)
  const [newFullKey, setNewFullKey] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/keys')
      .then(r => r.json())
      .then(data => {
        if (data.error === 'API access requires Pro or Agency tier') {
          setIsFree(true)
        } else {
          setKeys(data.keys ?? [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleCreated(key: ApiKey, fullKey: string) {
    setKeys(prev => [key, ...prev])
    setNewFullKey(fullKey)
  }

  async function revoke(id: string) {
    setRevoking(id)
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' })
      if (res.ok) setKeys(prev => prev.filter(k => k.id !== id))
    } catch {
      // noop
    } finally {
      setRevoking(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">API Keys</h1>
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (isFree) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-white">API Keys</h1>
        <Card className="bg-slate-900 border-slate-800 p-8 text-center space-y-4">
          <p className="text-3xl">🔑</p>
          <p className="text-white font-semibold">Your plan doesn&apos;t include API access</p>
          <p className="text-slate-400 text-sm">Upgrade to Pro or Agency to create API keys and integrate Lurk into your CI/CD pipeline.</p>
          <a
            href="/pricing"
            className="inline-block bg-[#00FF94] text-[#0B1120] font-semibold px-5 py-2 rounded-lg hover:bg-[#00e085] transition-colors"
          >
            Upgrade plan →
          </a>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {newFullKey && (
        <NewKeyModal fullKey={newFullKey} onClose={() => setNewFullKey(null)} />
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">API Keys</h1>
        <p className="text-slate-400 text-sm mt-1">
          Use API keys to trigger scans programmatically via the Lurk API.
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800 p-6">
        <h2 className="text-white font-semibold mb-4">Create new key</h2>
        <CreateKeyForm onCreated={handleCreated} />
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Your keys ({keys.length})</h2>
        </div>
        {keys.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No API keys yet.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {keys.map(key => (
              <div key={key.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-white font-medium">{key.name}</p>
                  <p className="text-slate-500 text-xs font-mono">{key.key_prefix}…</p>
                  <div className="flex gap-4 text-xs text-slate-500">
                    <span>Created {new Date(key.created_at).toLocaleDateString()}</span>
                    {key.last_used_at && (
                      <span>Last used {new Date(key.last_used_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={revoking === key.id}
                  onClick={() => revoke(key.id)}
                  className="border-red-800 text-red-400 hover:bg-red-950 hover:text-red-300 shrink-0"
                >
                  {revoking === key.id ? 'Revoking…' : 'Revoke'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
