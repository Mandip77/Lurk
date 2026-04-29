'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/repositories', label: 'Repositories', icon: '📁' },
  { href: '/scans', label: 'Scans', icon: '🔍' },
  { href: '/reports', label: 'Reports', icon: '📄' },
  { href: '/pricing', label: 'Pricing', icon: '💳' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <span className="font-bold text-white text-sm">Sentinel AI</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-[#00FF94]/10 text-[#00FF94]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
