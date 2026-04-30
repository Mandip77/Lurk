'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400" aria-label="Toggle theme">
        <span className="text-base">☀️</span>
      </button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200"
    >
      <span className="text-base transition-transform duration-300" style={{ display: 'inline-block' }}>
        {isDark ? '☀️' : '🌙'}
      </span>
    </button>
  )
}
