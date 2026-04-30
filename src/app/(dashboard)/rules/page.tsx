'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const
type Severity = typeof SEVERITIES[number]

interface CustomRule {
  id: string
  name: string
  pattern: string
  severity: Severity
  description: string | null
  is_active: boolean
  created_at: string
}

const severityColors: Record<Severity, string> = {
  critical: 'text-red-400 bg-red-950/50 border-red-800',
  high: 'text-orange-400 bg-orange-950/50 border-orange-800',
  medium: 'text-yellow-400 bg-yellow-950/50 border-yellow-800',
  low: 'text-blue-400 bg-blue-950/50 border-blue-800',
  info: 'text-slate-400 bg-slate-800/50 border-slate-700',
}

function AddRuleForm({ onAdded }: { onAdded: (rule: CustomRule) => void }) {
  const [name, setName] = useState('')
  const [pattern, setPattern] = useState('')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, pattern, severity, description: description || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to create rule')
      onAdded(data.rule as CustomRule)
      setName('')
      setPattern('')
      setDescription('')
      setSeverity('medium')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Rule name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. No hardcoded secrets"
            required
            maxLength={100}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00FF94]/40"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Severity *</label>
          <select
            value={severity}
            onChange={e => setSeverity(e.target.value as Severity)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00FF94]/40"
          >
            {SEVERITIES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Pattern (regex or keyword) *</label>
        <input
          value={pattern}
          onChange={e => setPattern(e.target.value)}
          placeholder="e.g. process\.env\.\w+ in plain string or hardcoded_secret"
          required
          maxLength={500}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 font-mono focus:outline-none focus:ring-2 focus:ring-[#00FF94]/40"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Description</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Explain what this rule detects"
          maxLength={1000}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00FF94]/40"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button
        type="submit"
        disabled={loading || !name.trim() || !pattern.trim()}
        className="bg-[#00FF94] text-[#0B1120] hover:bg-[#00e085] font-semibold"
      >
        {loading ? 'Adding…' : 'Add rule'}
      </Button>
    </form>
  )
}

export default function RulesPage() {
  const [rules, setRules] = useState<CustomRule[]>([])
  const [loading, setLoading] = useState(true)
  const [isFree, setIsFree] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/rules')
      .then(r => r.json())
      .then(data => {
        if (data.error === 'Custom rules require Pro or Agency tier') {
          setIsFree(true)
        } else {
          setRules(data.rules ?? [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function toggleActive(rule: CustomRule) {
    setToggling(rule.id)
    const newVal = !rule.is_active
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: newVal } : r))
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newVal }),
      })
      if (!res.ok) {
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: rule.is_active } : r))
      }
    } catch {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: rule.is_active } : r))
    } finally {
      setToggling(null)
    }
  }

  async function deleteRule(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' })
      if (res.ok) setRules(prev => prev.filter(r => r.id !== id))
    } catch {
      // noop
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Custom Rules</h1>
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (isFree) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-white">Custom Rules</h1>
        <Card className="bg-slate-900 border-slate-800 p-8 text-center space-y-4">
          <p className="text-3xl">📋</p>
          <p className="text-white font-semibold">Pro feature</p>
          <p className="text-slate-400 text-sm">
            Custom rules let you define your own security patterns that Lurk will flag in every PR scan.
            Upgrade to Pro or Agency to use this feature.
          </p>
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
      <div>
        <h1 className="text-2xl font-bold text-white">Custom Rules</h1>
        <p className="text-slate-400 text-sm mt-1">
          Define patterns that Lurk will flag specifically in every PR scan.
        </p>
      </div>

      <Card className="bg-slate-900 border-slate-800 p-6">
        <h2 className="text-white font-semibold mb-4">Add new rule</h2>
        <AddRuleForm onAdded={rule => setRules(prev => [rule, ...prev])} />
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Your rules ({rules.length})</h2>
        </div>
        {rules.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No custom rules yet.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {rules.map(rule => (
              <div key={rule.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{rule.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severityColors[rule.severity]}`}>
                        {rule.severity}
                      </span>
                      {!rule.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">
                          inactive
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs font-mono truncate">{rule.pattern}</p>
                    {rule.description && (
                      <p className="text-slate-500 text-xs">{rule.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive(rule)}
                      disabled={toggling === rule.id}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        rule.is_active ? 'bg-[#00FF94]' : 'bg-slate-700'
                      } ${toggling === rule.id ? 'opacity-50' : ''}`}
                      title={rule.is_active ? 'Disable rule' : 'Enable rule'}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          rule.is_active ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deleting === rule.id}
                      onClick={() => deleteRule(rule.id)}
                      className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950 h-6 px-2"
                    >
                      {deleting === rule.id ? '…' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
