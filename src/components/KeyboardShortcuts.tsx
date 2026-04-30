'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

const shortcuts = [
  { keys: ['g', 'd'], description: 'Go to Dashboard', path: '/dashboard' },
  { keys: ['g', 's'], description: 'Go to Scans', path: '/scans' },
  { keys: ['g', 'r'], description: 'Go to Repositories', path: '/repositories' },
  { keys: ['g', 'u'], description: 'Go to Usage', path: '/usage' },
  { keys: ['?'], description: 'Show this help', path: null },
]

export function KeyboardShortcuts() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const pendingKey = useRef<string | null>(null)
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const closeModal = useCallback(() => setShowModal(false), [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return

      const key = e.key.toLowerCase()

      // Show help modal
      if (e.key === '?') {
        e.preventDefault()
        setShowModal(v => !v)
        return
      }

      // Close modal on Escape
      if (e.key === 'Escape') {
        setShowModal(false)
        pendingKey.current = null
        return
      }

      // Two-key chord: g then d/s/r/u
      if (pendingKey.current === 'g') {
        pendingKey.current = null
        if (pendingTimer.current) clearTimeout(pendingTimer.current)

        const map: Record<string, string> = {
          d: '/dashboard',
          s: '/scans',
          r: '/repositories',
          u: '/usage',
        }
        if (map[key]) {
          e.preventDefault()
          router.push(map[key])
        }
        return
      }

      if (key === 'g') {
        pendingKey.current = 'g'
        // Clear after 1.5s if no second key
        if (pendingTimer.current) clearTimeout(pendingTimer.current)
        pendingTimer.current = setTimeout(() => {
          pendingKey.current = null
        }, 1500)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (pendingTimer.current) clearTimeout(pendingTimer.current)
    }
  }, [router])

  // Close on backdrop click
  useEffect(() => {
    if (!showModal) return
    function onBackdrop(e: MouseEvent) {
      const modal = document.getElementById('kb-shortcuts-modal')
      if (modal && !modal.contains(e.target as Node)) closeModal()
    }
    document.addEventListener('mousedown', onBackdrop)
    return () => document.removeEventListener('mousedown', onBackdrop)
  }, [showModal, closeModal])

  if (!showModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        id="kb-shortcuts-modal"
        className="bg-[#080f1e] border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Keyboard Shortcuts</h2>
          <button
            onClick={closeModal}
            className="text-slate-500 hover:text-white transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {shortcuts.map(s => (
            <div key={s.keys.join('+')} className="flex items-center justify-between gap-4">
              <span className="text-slate-300 text-sm">{s.description}</span>
              <div className="flex items-center gap-1 shrink-0">
                {s.keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 rounded bg-[#00FF94]/10 border border-[#00FF94]/30 text-[#00FF94] text-xs font-mono font-semibold">
                      {k}
                    </kbd>
                    {i < s.keys.length - 1 && (
                      <span className="text-slate-600 text-xs">then</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-slate-600 text-xs mt-5 text-center">
          Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-400 text-xs font-mono">Esc</kbd> to close
        </p>
      </div>
    </div>
  )
}
